/**
 * Shared plumbing for the skeleton commands (T024/T025/T025b).
 *
 * - CommandDeps: injectable emitter resolution + template location, so command
 *   descriptors stay testable while the default wiring targets the real
 *   `@patterson/emitter-claude-code` package.
 * - loadProjectConfig: `patterson.config.ts` → validated IR (the config-loader
 *   surface these commands need; the full T011 loader supersedes it when it
 *   lands in core — swap the import then).
 * - runEmitPipeline: compile every supported target and apply through core's
 *   `applyFileOps` (the engine's single write path, Constitution II).
 * - toCommandConflicts: adapt the emit engine's `DriftConflict` to the command
 *   registry's `CommandDriftConflict` at the boundary (data-model.md note —
 *   the two are deliberately distinct types).
 */
import { join } from "node:path";
import { z } from "zod";

import {
  applyFileOps,
  captureSnapshot,
  computeIrHash,
  PattersonProjectSchema,
  RESOLVING_FLAG,
  type ApplyResult,
  type CommandDriftConflict,
  type DriftConflict,
  type Emitter,
  type FileOp,
  type PattersonProject,
  type TargetId,
} from "@patterson/core";

// ---------------------------------------------------------------------------
// CommandDeps — injectable wiring
// ---------------------------------------------------------------------------

/** An emitter plus the snapshot paths its merge computation may read. */
export interface ResolvedEmitter {
  emitter: Emitter;
  /** Root-relative paths captured into the FsSnapshot handed to `compile`. */
  snapshotPaths(ir: PattersonProject): string[];
  /** Optional coverage-gap hook (duck-typed off the emitter module). */
  coverageGaps?(ir: PattersonProject): { entityId: string; reason: string }[];
}

export type EmitterResolver = (target: TargetId) => Promise<ResolvedEmitter | null>;

export interface CommandDeps {
  resolveEmitter: EmitterResolver;
  /** Directory containing template directories (e.g. `<repo>/templates`). */
  templatesDir: string;
}

/** Default snapshot paths for the claude-code surfaces (P2a set). */
export function claudeCodeSnapshotPaths(ir: PattersonProject): string[] {
  return [
    "AGENTS.md",
    "CLAUDE.md",
    ".mcp.json",
    ".claude/settings.json",
    ...ir.agents.map((agent) => `.claude/agents/${agent.name}.md`),
    ...ir.skills.map((skill) => `.claude/skills/${skill.name}/SKILL.md`),
    ...ir.commands.map((command) => `.claude/skills/${command.name}/SKILL.md`),
  ];
}

function isEmitter(value: unknown): value is Emitter {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { compile?: unknown }).compile === "function" &&
    "targets" in value
  );
}

/**
 * Resolve the claude-code emitter from `@patterson/emitter-claude-code`
 * without pinning its export name (the emitter unit owns that): any export
 * shaped like the Emitter contract is accepted. Returns null when the package
 * does not (yet) export one.
 */
async function loadClaudeCodeEmitter(): Promise<ResolvedEmitter | null> {
  let mod: Record<string, unknown>;
  try {
    mod = (await import("@patterson/emitter-claude-code")) as Record<string, unknown>;
  } catch {
    return null;
  }
  const candidates = [mod["claudeCodeEmitter"], mod["emitter"], mod["default"], ...Object.values(mod)];
  const emitter = candidates.find(isEmitter);
  if (!emitter) return null;

  const snapshotPathsExport = mod["snapshotPaths"];
  const snapshotPaths =
    typeof snapshotPathsExport === "function"
      ? (ir: PattersonProject) => (snapshotPathsExport as (ir: PattersonProject) => string[])(ir)
      : claudeCodeSnapshotPaths;

  const gapsExport = mod["coverageGaps"];
  const resolved: ResolvedEmitter = { emitter, snapshotPaths };
  if (typeof gapsExport === "function") {
    resolved.coverageGaps = (ir) =>
      (gapsExport as (ir: PattersonProject) => { entityId: string; reason: string }[])(ir);
  }
  return resolved;
}

export const defaultEmitterResolver: EmitterResolver = async (target) => {
  if (target === "claude-code") return loadClaudeCodeEmitter();
  return null;
};

/** `<repo>/templates` resolved relative to this source file (monorepo layout). */
export const DEFAULT_TEMPLATES_DIR = join(import.meta.dir, "..", "..", "..", "..", "templates");

export const defaultDeps: CommandDeps = {
  resolveEmitter: defaultEmitterResolver,
  templatesDir: DEFAULT_TEMPLATES_DIR,
};

// ---------------------------------------------------------------------------
// Config loading
// ---------------------------------------------------------------------------

export type LoadConfigResult =
  | { ok: true; ir: PattersonProject; path: string }
  | { ok: false; code: "CONFIG_NOT_FOUND" | "CONFIG_INVALID"; message: string };

/**
 * Load and validate `patterson.config.ts` from `cwd`. The import URL carries
 * the file's mtime so edits between runs in one process are picked up.
 */
export async function loadProjectConfig(cwd: string): Promise<LoadConfigResult> {
  const abs = join(cwd, "patterson.config.ts");
  const file = Bun.file(abs);
  if (!(await file.exists())) {
    return {
      ok: false,
      code: "CONFIG_NOT_FOUND",
      message: `No patterson.config.ts found in ${cwd}. Run \`patterson create\` or \`patterson init\` first.`,
    };
  }

  let moduleValue: unknown;
  try {
    moduleValue = await import(`${abs}?mtime=${file.lastModified}`);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, code: "CONFIG_INVALID", message: `Failed to load patterson.config.ts: ${message}` };
  }

  const candidate =
    typeof moduleValue === "object" && moduleValue !== null && "default" in moduleValue
      ? (moduleValue as { default: unknown }).default
      : moduleValue;

  const parsed = PattersonProjectSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      code: "CONFIG_INVALID",
      message: `patterson.config.ts is not a valid Patterson project:\n${z.prettifyError(parsed.error)}`,
    };
  }
  return { ok: true, ir: parsed.data, path: abs };
}

// ---------------------------------------------------------------------------
// Emit pipeline
// ---------------------------------------------------------------------------

export interface EmitPipelineOptions {
  acceptGenerated?: boolean;
  dryRun?: boolean;
  adopt?: boolean;
  /**
   * When the compiled batch contains no instruct-tier op (which would make the
   * engine render SETUP.md itself), append an own-tier SETUP.md with this
   * content instead — `create` always leaves a SETUP.md behind.
   */
  fallbackSetupContent?: string;
}

export interface EmitPipelineOutcome {
  ops: FileOp[];
  apply: ApplyResult;
  /** Targets in the IR with no resolvable emitter (reported, never silent). */
  unsupported: TargetId[];
}

/** Compile every supported target and apply through the core emit engine. */
export async function runEmitPipeline(
  ir: PattersonProject,
  root: string,
  options: EmitPipelineOptions,
  deps: CommandDeps,
): Promise<EmitPipelineOutcome> {
  const ops: FileOp[] = [];
  const unsupported: TargetId[] = [];

  for (const target of ir.targets) {
    const resolved = await deps.resolveEmitter(target);
    if (!resolved) {
      unsupported.push(target);
      continue;
    }
    const snapshot = await captureSnapshot(root, resolved.snapshotPaths(ir));
    ops.push(...resolved.emitter.compile(ir, snapshot));
  }

  if (options.fallbackSetupContent !== undefined && !ops.some((op) => op.mode === "instruct")) {
    ops.push({ path: "SETUP.md", format: "markdown", mode: "own", content: options.fallbackSetupContent });
  }

  const apply = await applyFileOps(ops, {
    root,
    irHash: computeIrHash(ir),
    acceptGenerated: options.acceptGenerated ?? false,
    dryRun: options.dryRun ?? false,
    adopt: options.adopt ?? false,
  });
  return { ops, apply, unsupported };
}

// ---------------------------------------------------------------------------
// Conflict adaptation (emit DriftConflict → registry CommandDriftConflict)
// ---------------------------------------------------------------------------

function describeRegion(conflict: DriftConflict): string {
  if (conflict.keyPath !== undefined) return `${conflict.path} at ${conflict.keyPath}`;
  if (conflict.sentinelId !== undefined) return `${conflict.path} (region "${conflict.sentinelId}")`;
  return conflict.path;
}

/** Human-readable one-liner for a drift conflict (shared by sync/doctor output). */
export function describeConflict(conflict: DriftConflict): string {
  const what = conflict.currentHash === "absent" ? "was deleted by hand" : "was edited by hand";
  const cause = conflict.reason === "unrecorded" ? "has no provenance record and differs" : what;
  return `${describeRegion(conflict)} ${cause}; kept as-is. Re-run with ${RESOLVING_FLAG} to overwrite.`;
}

/**
 * Boundary adapter: the emit engine's DriftConflict and the command registry's
 * CommandDriftConflict are distinct types (data-model.md, Emission layer).
 */
export function toCommandConflicts(conflicts: readonly DriftConflict[]): CommandDriftConflict[] {
  return conflicts.map((conflict) => {
    const adapted: CommandDriftConflict = {
      path: conflict.path,
      message: describeConflict(conflict),
      currentHash: conflict.currentHash,
    };
    if (conflict.keyPath !== undefined) adapted.keyPath = conflict.keyPath;
    else if (conflict.sentinelId !== undefined) adapted.keyPath = `sentinel:${conflict.sentinelId}`;
    if (conflict.recordedHash !== undefined) adapted.recordedHash = conflict.recordedHash;
    return adapted;
  });
}
