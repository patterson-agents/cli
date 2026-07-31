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
import { basename, join } from "node:path";
import { z } from "zod";

import {
  assertWritable,
  defineCommand,
  InstructionBlockSchema,
  McpServerDefSchema,
  PattersonProjectSchema,
  RESOLVING_FLAG,
  type CommandResult,
  type EnvValue,
  type InstructionBlock,
  type McpServerDef,
  type PattersonProjectInput,
} from "@patterson/core";
import { PATTERSON_CONFIG_BASENAME, renderPattersonConfig } from "../../../core/src/scaffold.ts";

import {
  defaultDeps,
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
          if (block) instructions.push(block);
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

      assertWritable(PATTERSON_CONFIG_BASENAME, { exists: await Bun.file(configAbs).exists() });
      await Bun.write(configAbs, renderPattersonConfig(configInput));

      // Adoption emission: pre-existing keys/regions become foreign.
      const outcome = await runEmitPipeline(parsed.data, root, { adopt: true }, deps);
      if (outcome.apply.conflicts.length > 0) {
        // Adoption converts unrecorded drift to foreign; recorded drift can
        // still conflict (re-init with --force after emissions). Never clobber.
        return {
          kind: "conflicts",
          conflicts: toCommandConflicts(outcome.apply.conflicts),
          resolvingFlag: RESOLVING_FLAG,
        };
      }

      const details: string[] = [
        `Detected: ${detected.join(", ") || "(none)"}`,
        `Foreign (hand-owned, never overwritten): ${outcome.apply.foreignSkipped.join(", ") || "(none)"}`,
      ];
      for (const target of outcome.unsupported) {
        details.push(`Target "${target}" has no emitter yet; nothing was emitted for it.`);
      }
      if (skipped.length > 0) details.push(`Skipped imports: ${skipped.join("; ")}`);

      return {
        kind: "ok",
        value: {
          detected,
          imported: { mcpServers: mcp.length, instructions: instructions.length },
          skipped,
          foreign: outcome.apply.foreignSkipped,
          written: outcome.apply.written,
          configPath: PATTERSON_CONFIG_BASENAME,
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
