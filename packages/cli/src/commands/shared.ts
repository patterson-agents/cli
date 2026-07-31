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
  type CoverageGap,
  type DriftConflict,
  type Emitter,
  type FileOp,
  type FsSnapshot,
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
  /**
   * Snapshot-aware coverage-gap hook (contracts/emitter.md obligation 3):
   * entities the emitter cannot express. Same entityId naming as the
   * emitter's CoverageGap output (`mcp.<name>`, `skills.<name>`, …).
   */
  coverageGaps?(ir: PattersonProject, snapshot: FsSnapshot): CoverageGap[];
}

export type EmitterResolver = (target: TargetId) => Promise<ResolvedEmitter | null>;

/**
 * Design-template source for `create` (E-P3). Backed by @patterson/design's
 * vendored snapshot by default; tests may inject a stub.
 */
export interface DesignTemplateProvider {
  list(): Promise<{ name: string; label: string; description: string }[]>;
  materialize(
    name: string,
  ): Promise<{ files: { path: string; content: string }[]; warnings: string[] }>;
}

export interface CommandDeps {
  resolveEmitter: EmitterResolver;
  /** Directory containing template directories (e.g. `<repo>/templates`). */
  templatesDir: string;
  /** Design-system template source (vendored snapshot). */
  designTemplates: DesignTemplateProvider;
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
 * Emitter packages per target. Every P2 emitter package follows the same
 * export contract (contracts/emitter.md): an `Emitter`-shaped export (named
 * `<camel>Emitter` by convention, but resolved by shape, not name), plus
 * optional `snapshotPaths(ir)` and `coverageGaps(ir, snapshot)` exports.
 * devcontainer/codespaces/github-actions land in P6 and stay unlisted until
 * then — `runEmitPipeline` reports them as `unsupported`, never silently.
 */
const EMITTER_PACKAGES: Partial<Record<TargetId, string>> = {
  "claude-code": "@patterson/emitter-claude-code",
  copilot: "@patterson/emitter-copilot",
  opencode: "@patterson/emitter-opencode",
  zed: "@patterson/emitter-zed",
  vscode: "@patterson/emitter-vscode",
};

/**
 * Resolve a target's emitter from its package without pinning export names
 * (the emitter unit owns those): any export shaped like the Emitter contract
 * is accepted. Returns null when the package does not (yet) export one.
 */
async function loadEmitterPackage(target: TargetId, pkg: string): Promise<ResolvedEmitter | null> {
  let mod: Record<string, unknown>;
  try {
    mod = (await import(pkg)) as Record<string, unknown>;
  } catch {
    return null;
  }
  const candidates = [mod["emitter"], mod["default"], ...Object.values(mod)];
  const emitter = candidates.find(isEmitter);
  if (!emitter) return null;

  const snapshotPathsExport = mod["snapshotPaths"];
  const snapshotPaths =
    typeof snapshotPathsExport === "function"
      ? (ir: PattersonProject) => (snapshotPathsExport as (ir: PattersonProject) => string[])(ir)
      : target === "claude-code"
        ? claudeCodeSnapshotPaths
        : () => ["AGENTS.md"];

  const gapsExport = mod["coverageGaps"];
  const resolved: ResolvedEmitter = { emitter, snapshotPaths };
  if (typeof gapsExport === "function") {
    resolved.coverageGaps = (ir, snapshot) =>
      (gapsExport as (ir: PattersonProject, snapshot: FsSnapshot) => CoverageGap[])(ir, snapshot);
  }
  return resolved;
}

export const defaultEmitterResolver: EmitterResolver = async (target) => {
  const pkg = EMITTER_PACKAGES[target];
  if (!pkg) return null;
  return loadEmitterPackage(target, pkg);
};

/** `<repo>/templates` resolved relative to this source file (monorepo layout). */
export const DEFAULT_TEMPLATES_DIR = join(import.meta.dir, "..", "..", "..", "..", "templates");

/** Lazy default: the vendored design snapshot from @patterson/design. */
export const defaultDesignTemplates: DesignTemplateProvider = {
  async list() {
    const design = await import("@patterson/design");
    return (await design.listDesignTemplates()).map(({ name, label, description }) => ({
      name,
      label,
      description,
    }));
  },
  async materialize(name) {
    const design = await import("@patterson/design");
    return design.materializeDesignTemplate(name);
  },
};

export const defaultDeps: CommandDeps = {
  resolveEmitter: defaultEmitterResolver,
  templatesDir: DEFAULT_TEMPLATES_DIR,
  designTemplates: defaultDesignTemplates,
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
  /** Coverage gaps reported by the emitters (never silently dropped). */
  gaps: CoverageGap[];
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
  const gaps: CoverageGap[] = [];

  for (const target of ir.targets) {
    const resolved = await deps.resolveEmitter(target);
    if (!resolved) {
      unsupported.push(target);
      continue;
    }
    const snapshot = await captureSnapshot(root, resolved.snapshotPaths(ir));
    ops.push(...resolved.emitter.compile(ir, snapshot));
    if (resolved.coverageGaps) gaps.push(...resolved.coverageGaps(ir, snapshot));
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
  return { ops, apply, unsupported, gaps };
}

/** Human-readable one-liners for emitter coverage gaps (report details). */
export function describeGaps(gaps: readonly CoverageGap[]): string[] {
  return gaps.map((gap) => `[gap] ${gap.entityId} → ${gap.targetId}: ${gap.reason}`);
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
