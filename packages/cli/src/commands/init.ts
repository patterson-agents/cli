/**
 * `patterson init` — adoption in an existing directory (T025b, US2-AS3).
 *
 * Detects pre-existing claude-code config (.mcp.json, CLAUDE.md, AGENTS.md,
 * .claude/settings.json), writes patterson.config.ts, and emits in ADOPTION
 * mode: pre-existing keys/regions/files become `foreign` in
 * .patterson/emitted.json — hand-owned forever, never overwritten (FR-007).
 *
 * `--import` lifts recognizable config (MCP servers, instruction files) into
 * the generated patterson.config.ts; entries that fail IR validation are
 * skipped and reported, never silently dropped.
 */
import { rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { z } from "zod";

import {
  assertWritable,
  contentHash,
  defineCommand,
  formatKeyPath,
  InstructionBlockSchema,
  loadProvenance,
  McpServerDefSchema,
  PattersonProjectSchema,
  RESOLVING_FLAG,
  saveProvenance,
  valueHash,
  type CommandResult,
  type EmissionRecord,
  type EnvValue,
  type InstructionBlock,
  type McpServerDef,
  type PattersonProjectInput,
} from "@patterson/core";
import {
  directoryEntries,
  PATTERSON_CONFIG_BASENAME,
  renderPattersonConfig,
} from "../../../core/src/scaffold.ts";

import {
  defaultDeps,
  describeGaps,
  runEmitPipeline,
  toCommandConflicts,
  type CommandDeps,
} from "./shared.ts";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const InitInputSchema = z.strictObject({
  /** Project name; defaults to the directory basename. */
  name: z.string().min(1).optional(),
  /** Lift recognizable existing config into patterson.config.ts. */
  import: z.boolean().default(false),
  /** Overwrite an existing patterson.config.ts. */
  force: z.boolean().default(false),
  /** Plan only: report what adoption would touch/mark, write nothing. */
  dryRun: z.boolean().default(false),
});

export const InitOutputSchema = z.strictObject({
  /** Pre-existing config files found on disk. */
  detected: z.array(z.string()),
  imported: z.strictObject({
    mcpServers: z.number(),
    instructions: z.number(),
  }),
  /** Import candidates that failed IR validation (reason included). */
  skipped: z.array(z.string()),
  /** Keys/regions/files marked foreign (hand-owned) during adoption. */
  foreign: z.array(z.string()),
  /** Files written by the adoption emission. */
  written: z.array(z.string()),
  configPath: z.string(),
  /** True when the run was a plan only (nothing written). */
  dryRun: z.boolean(),
});

export type InitInput = z.infer<typeof InitInputSchema>;
export type InitOutput = z.infer<typeof InitOutputSchema>;

// ---------------------------------------------------------------------------
// Import lifting
// ---------------------------------------------------------------------------

const DETECT_PATHS = [".mcp.json", "CLAUDE.md", "AGENTS.md", ".claude/settings.json"] as const;

interface McpJsonServer {
  command?: unknown;
  args?: unknown;
  env?: unknown;
  url?: unknown;
  type?: unknown;
  headers?: unknown;
}

const ENV_REF_RE = /^\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-(.*))?\}$/;

/**
 * Convert a raw .mcp.json env/header value into an IR EnvValue: plain strings
 * pass through; the `${VAR}` / `${VAR:-default}` forms become SecretRef nodes
 * (interpolated secret strings are forbidden in the IR — C4). Returns null for
 * values the IR cannot represent.
 */
function liftEnvValue(raw: unknown): EnvValue | null {
  if (typeof raw !== "string") return null;
  const match = ENV_REF_RE.exec(raw);
  if (match?.[1] !== undefined) {
    return match[2] !== undefined
      ? { kind: "env", name: match[1], default: match[2] }
      : { kind: "env", name: match[1] };
  }
  if (raw.includes("${") || raw.includes("{env:")) return null;
  return raw;
}

function liftEnvRecord(
  raw: unknown,
  onSkip: (key: string) => void,
): Record<string, EnvValue> | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const out: Record<string, EnvValue> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const lifted = liftEnvValue(value);
    if (lifted === null) {
      onSkip(key);
      continue;
    }
    out[key] = lifted;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Lift `.mcp.json` servers into McpServerDefs; invalid entries go to `skipped`. */
export function liftMcpServers(
  raw: unknown,
  skipped: string[],
): McpServerDef[] {
  if (typeof raw !== "object" || raw === null) return [];
  const serversRaw = (raw as { mcpServers?: unknown }).mcpServers;
  if (typeof serversRaw !== "object" || serversRaw === null) return [];

  const lifted: McpServerDef[] = [];
  for (const [name, entry] of Object.entries(serversRaw as Record<string, McpJsonServer>)) {
    if (typeof entry !== "object" || entry === null) {
      skipped.push(`.mcp.json#${name}: not an object`);
      continue;
    }

    let candidate: unknown;
    if (typeof entry.command === "string") {
      const args = Array.isArray(entry.args)
        ? entry.args.filter((arg): arg is string => typeof arg === "string")
        : [];
      const env = liftEnvRecord(entry.env, (key) =>
        skipped.push(`.mcp.json#${name}: env "${key}" uses interpolation the IR cannot represent`),
      );
      candidate = {
        name,
        transport: {
          kind: "stdio",
          exec: { argv: [entry.command, ...args], ...(env !== undefined ? { env } : {}) },
        },
        scope: "project",
      };
    } else if (typeof entry.url === "string") {
      const headers = liftEnvRecord(entry.headers, (key) =>
        skipped.push(`.mcp.json#${name}: header "${key}" uses interpolation the IR cannot represent`),
      );
      candidate = {
        name,
        transport: {
          kind: entry.type === "sse" ? "sse" : "http",
          url: entry.url,
          ...(headers !== undefined ? { headers } : {}),
        },
        scope: "project",
      };
    } else {
      skipped.push(`.mcp.json#${name}: neither "command" nor "url" present`);
      continue;
    }

    const parsed = McpServerDefSchema.safeParse(candidate);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      skipped.push(`.mcp.json#${name}: ${first?.message ?? "invalid"}`);
      continue;
    }
    lifted.push(parsed.data);
  }
  return lifted;
}

/** Lift an instruction file's body into an InstructionBlock (null when empty/invalid). */
export function liftInstructionFile(
  id: string,
  body: string,
  skipped: string[],
): InstructionBlock | null {
  if (body.trim().length === 0) return null;
  const parsed = InstructionBlockSchema.safeParse({ id, body, reach: "universal" });
  if (!parsed.success) {
    skipped.push(`${id}: ${parsed.error.issues[0]?.message ?? "invalid"}`);
    return null;
  }
  return parsed.data;
}

// ---------------------------------------------------------------------------
// Foreign adoption post-pass (FR-007 / US2-AS3)
// ---------------------------------------------------------------------------

/** Marker recorded as irHash for surfaces adopted without an emission. */
const ADOPTED_IR_HASH = "adopted";

/**
 * Mark EVERY detected pre-existing surface foreign — not only the keys/regions
 * the current emission happens to touch. Covers: whole detect files
 * (CLAUDE.md), every `.mcp.json` mcpServers key, every `.claude/settings.json`
 * key (at the granularity the emitter patches), and every existing
 * `.claude/agents/*` / `.claude/skills/*` entry. Surfaces already recorded by
 * the adoption emission are left alone. Returns the newly-marked labels.
 */
export async function adoptForeignSurfaces(root: string, dryRun: boolean): Promise<string[]> {
  const records = await loadProvenance(root);
  const marked: string[] = [];
  const now = new Date().toISOString();

  const addForeign = (rec: EmissionRecord, key: string, label: string): void => {
    const foreign = rec.foreign ?? [];
    if (foreign.includes(key)) return;
    rec.foreign = [...foreign, key];
    marked.push(label);
  };

  const markWholeFileForeign = async (rel: string): Promise<void> => {
    if (records.get(rel) !== undefined) return; // emitted or adopted this run
    const abs = join(root, rel);
    const rec: EmissionRecord = { path: rel, mode: "own", emittedAt: now, irHash: ADOPTED_IR_HASH };
    try {
      if (await Bun.file(abs).exists()) rec.contentHash = contentHash(await Bun.file(abs).text());
    } catch {
      // Directory or unreadable entry: foreign marking needs no baseline hash.
    }
    records.set(rel, rec);
    addForeign(rec, "content", rel);
  };

  const markStructuredForeign = async (
    rel: string,
    pointersOf: (parsed: Record<string, unknown>) => [readonly (string | number)[], unknown][],
  ): Promise<void> => {
    const file = Bun.file(join(root, rel));
    if (!(await file.exists())) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      return; // unparsable JSON cannot be key-adopted; left as-is
    }
    if (typeof parsed !== "object" || parsed === null) return;
    const existing = records.get(rel);
    const rec: EmissionRecord =
      existing ?? { path: rel, mode: "merge", emittedAt: now, irHash: ADOPTED_IR_HASH };
    records.set(rel, rec);
    for (const [keyPath, value] of pointersOf(parsed as Record<string, unknown>)) {
      const pointer = formatKeyPath([...keyPath]);
      if (rec.keyPaths?.some((entry) => entry.path === pointer)) continue; // managed this run
      rec.keyPaths = [...(rec.keyPaths ?? []), { path: pointer, value, hash: valueHash(value) }];
      addForeign(rec, pointer, `${rel}#${pointer}`);
    }
  };

  await markStructuredForeign(".mcp.json", (parsed) => {
    const servers = parsed["mcpServers"];
    if (typeof servers !== "object" || servers === null) return [];
    return Object.entries(servers).map(([name, value]) => [["mcpServers", name], value]);
  });

  await markStructuredForeign(".claude/settings.json", (parsed) => {
    const out: [readonly (string | number)[], unknown][] = [];
    for (const [key, value] of Object.entries(parsed)) {
      // Match the emitter's patch granularity so foreign lookups line up.
      if ((key === "permissions" || key === "hooks") && typeof value === "object" && value !== null) {
        for (const [sub, subValue] of Object.entries(value as Record<string, unknown>)) {
          out.push([[key, sub], subValue]);
        }
        continue;
      }
      out.push([[key], value]);
    }
    return out;
  });

  // CLAUDE.md is an own-tier surface (the @AGENTS.md shim); a pre-existing
  // hand-written one is hand-owned forever. AGENTS.md is merge-tier by
  // design — sentinel appends never overwrite hand prose — so it needs no
  // whole-file mark.
  if (await Bun.file(join(root, "CLAUDE.md")).exists()) {
    await markWholeFileForeign("CLAUDE.md");
  }

  for (const entry of await directoryEntries(join(root, ".claude/agents"))) {
    await markWholeFileForeign(`.claude/agents/${entry}`);
  }
  for (const entry of await directoryEntries(join(root, ".claude/skills"))) {
    const rel = `.claude/skills/${entry}`;
    await markWholeFileForeign(rel);
    if (await Bun.file(join(root, rel, "SKILL.md")).exists()) {
      await markWholeFileForeign(`${rel}/SKILL.md`);
    }
  }

  if (!dryRun && marked.length > 0) await saveProvenance(root, records);
  return marked;
}

// ---------------------------------------------------------------------------
// Descriptor
// ---------------------------------------------------------------------------

export function makeInitCommand(deps: CommandDeps = defaultDeps) {
  return defineCommand({
    id: "init",
    path: ["init"],
    summary: "Adopt an existing directory: pre-existing config becomes hand-owned (foreign)",
    inputSchema: InitInputSchema,
    outputSchema: InitOutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false },
    async run(rawArgs, ctx): Promise<CommandResult<InitOutput>> {
      const args = InitInputSchema.parse(rawArgs);
      const root = ctx.cwd;

      const configAbs = join(root, PATTERSON_CONFIG_BASENAME);
      if ((await Bun.file(configAbs).exists()) && !args.force) {
        return {
          kind: "error",
          code: "ALREADY_INITIALIZED",
          message: `${PATTERSON_CONFIG_BASENAME} already exists in ${root}.`,
          hint: "Use `patterson sync` to re-emit, or re-run init with --force to regenerate the config.",
        };
      }

      const detected: string[] = [];
      for (const path of DETECT_PATHS) {
        if (await Bun.file(join(root, path)).exists()) detected.push(path);
      }

      const skipped: string[] = [];
      let mcp: McpServerDef[] = [];
      const instructions: InstructionBlock[] = [];
      /** Instruction files whose bodies were lifted into the IR. */
      const importedInstructionFiles: string[] = [];
      if (args.import) {
        const mcpFile = Bun.file(join(root, ".mcp.json"));
        if (await mcpFile.exists()) {
          try {
            mcp = liftMcpServers(JSON.parse(await mcpFile.text()), skipped);
          } catch {
            skipped.push(".mcp.json: not valid JSON");
          }
        }
        for (const [path, id] of [
          ["CLAUDE.md", "imported-claude-md"],
          ["AGENTS.md", "imported-agents-md"],
        ] as const) {
          const file = Bun.file(join(root, path));
          if (!(await file.exists())) continue;
          const block = liftInstructionFile(id, await file.text(), skipped);
          if (block) {
            instructions.push(block);
            importedInstructionFiles.push(path);
          }
        }
      }

      const configInput: PattersonProjectInput = {
        version: 1,
        name: args.name ?? basename(root),
        targets: ["claude-code"],
        ...(mcp.length > 0 ? { mcp } : {}),
        ...(instructions.length > 0 ? { instructions } : {}),
      };
      const parsed = PattersonProjectSchema.safeParse(configInput);
      if (!parsed.success) {
        return {
          kind: "error",
          code: "IMPORT_INVALID",
          message: `Imported config does not form a valid IR:\n${z.prettifyError(parsed.error)}`,
        };
      }

      if (!args.dryRun) {
        assertWritable(PATTERSON_CONFIG_BASENAME, { exists: await Bun.file(configAbs).exists() });
        await Bun.write(configAbs, renderPattersonConfig(configInput));

        // The lifted bodies now live in the IR (patterson.config.ts) and are
        // re-emitted as sentinel regions. Leaving the originals in place would
        // duplicate every imported body (original prose + sentinel copy), so
        // the adopted-in-place originals are removed before emission.
        for (const path of importedInstructionFiles) {
          await rm(join(root, path), { force: true });
        }
      }

      // Adoption emission: pre-existing keys/regions become foreign.
      const outcome = await runEmitPipeline(
        parsed.data,
        root,
        { adopt: true, dryRun: args.dryRun },
        deps,
      );
      if (outcome.apply.conflicts.length > 0) {
        // Adoption converts unrecorded drift to foreign; recorded drift can
        // still conflict (re-init with --force after emissions). Never clobber.
        return {
          kind: "conflicts",
          conflicts: toCommandConflicts(outcome.apply.conflicts),
          resolvingFlag: RESOLVING_FLAG,
        };
      }

      // FR-007: EVERY detected pre-existing surface becomes foreign — not only
      // the keys/regions the emission touched.
      const adoptedForeign = await adoptForeignSurfaces(root, args.dryRun);
      const foreign = [...new Set([...outcome.apply.foreignSkipped, ...adoptedForeign])];

      const details: string[] = [
        `Detected: ${detected.join(", ") || "(none)"}`,
        `Foreign (hand-owned, never overwritten): ${foreign.join(", ") || "(none)"}`,
      ];
      for (const target of outcome.unsupported) {
        details.push(`Target "${target}" has no emitter yet; nothing was emitted for it.`);
      }
      if (skipped.length > 0) details.push(`Skipped imports: ${skipped.join("; ")}`);
      if (importedInstructionFiles.length > 0) {
        details.push(
          `Imported instruction file(s) ${importedInstructionFiles.join(", ")} were lifted into patterson.config.ts and re-emitted (originals replaced, not duplicated).`,
        );
      }
      details.push(...describeGaps(outcome.gaps));
      if (args.dryRun) details.push("Dry run: nothing was written.");

      return {
        kind: "ok",
        value: {
          detected,
          imported: { mcpServers: mcp.length, instructions: instructions.length },
          skipped,
          foreign,
          written: outcome.apply.written,
          configPath: PATTERSON_CONFIG_BASENAME,
          dryRun: args.dryRun,
        },
        report: {
          summary:
            `Initialized "${configInput.name}": ${detected.length} pre-existing file(s) detected, ` +
            `${mcp.length} MCP server(s) and ${instructions.length} instruction file(s) imported.`,
          details,
        },
      };
    },
  });
}

export const initCommand = makeInitCommand();
