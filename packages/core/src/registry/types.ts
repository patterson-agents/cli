/**
 * Command registry types — the single definition point for every operation
 * (Constitution III: One Registry, Two Frontends).
 *
 * Source of truth: specs/001-patterson-cli-v1/contracts/command-registry.md.
 *
 * Core handlers are prompt-free: any interactive decision is expressed as a
 * structured `decision-required` result. The CLI frontend converts it into a
 * prompt and re-invokes with the chosen flag; the MCP frontend returns it
 * verbatim as a structured tool result.
 */
import type { z } from "zod";

// ---------------------------------------------------------------------------
// CommandCtx
// ---------------------------------------------------------------------------

/**
 * Frontend-provided output sinks. Handlers never write to process streams
 * directly — over MCP, stdout is JSON-RPC exclusively and all logging goes to
 * stderr, so the frontend owns the mapping.
 */
export interface CommandIo {
  out(text: string): void;
  err(text: string): void;
}

/** Execution context passed to every command handler. */
export interface CommandCtx {
  /** Project root the command operates on. */
  cwd: string;
  /**
   * True under `--yes`, `--json`, and MCP. Non-interactive contexts never
   * clobber drifted content: they keep, report, and exit non-zero
   * (Constitution II).
   */
  nonInteractive: boolean;
  io: CommandIo;
}

// ---------------------------------------------------------------------------
// CommandResult — the decision-required protocol
// ---------------------------------------------------------------------------

/**
 * A drift conflict surfaced by the emit engine (data-model.md §EmissionRecord):
 * content on disk differs from what `.patterson/emitted.json` recorded, so the
 * hand-edit is kept and reported instead of overwritten.
 */
export interface DriftConflict {
  /** File path (relative to the project root) whose content drifted. */
  path: string;
  /** Key path inside a structured file, when the drift is key-scoped. */
  keyPath?: string;
  /** Human-readable description of the conflict. */
  message: string;
  /** Content hash recorded at last emission. */
  recordedHash?: string;
  /** Content hash currently found on disk. */
  currentHash?: string;
}

/** Optional human-oriented report attached to an ok result. */
export interface Report {
  summary: string;
  details?: string[];
}

/** One selectable answer to a decision — every option maps to a flag. */
export interface DecisionOption {
  /** The CLI flag that resolves the decision, e.g. `--link-mode=symlink`. */
  flag: string;
  /** Human-readable label shown by the prompting frontend. */
  label: string;
}

/** A structured interactive decision (`processArgument` pattern). */
export interface Decision {
  id: string;
  question: string;
  options: DecisionOption[];
}

/** The only flag that authorizes overwriting drifted content (Constitution II). */
export const RESOLVING_FLAG = "--accept-generated" as const;

export type CommandResult<Out> =
  | { kind: "ok"; value: Out; report?: Report }
  | { kind: "conflicts"; conflicts: DriftConflict[]; resolvingFlag: typeof RESOLVING_FLAG }
  | { kind: "decision-required"; decision: Decision }
  | { kind: "error"; code: string; message: string; hint?: string };

// ---------------------------------------------------------------------------
// CommandDescriptor
// ---------------------------------------------------------------------------

/**
 * MCP tool annotations, mirrored 1:1. Read and write operations are SEPARATE
 * descriptors; `destructiveHint: true` means the CLI requires
 * `--force`/`--accept-generated`.
 */
export interface CommandAnnotations {
  readOnlyHint: boolean;
  destructiveHint: boolean;
}

/**
 * One operation, defined once, surfaced as both a CLI subcommand and an MCP
 * tool (`patterson_<id with dots→underscores>`).
 */
export interface CommandDescriptor<In, Out> {
  /** Stable identifier, e.g. "skills.add", "design.templates", "new.mcp-server". */
  id: string;
  /** CLI grouping, e.g. ["skills", "add"]. */
  path: string[];
  /** One line; also the MCP tool description opener. */
  summary: string;
  /** zod v4; drives CLI flag parsing and the MCP input schema. */
  inputSchema: z.ZodType<In>;
  /** Machine-readable result shape (`--json` / MCP structured result). */
  outputSchema: z.ZodType<Out>;
  annotations: CommandAnnotations;
  run(args: In, ctx: CommandCtx): Promise<CommandResult<Out>>;
}

/**
 * Existential form used by registry storage and the frontends, which do not
 * know the per-descriptor arg types statically.
 */
// oxlint-disable-next-line no-explicit-any -- existential: In/Out vary per descriptor
export type AnyCommandDescriptor = CommandDescriptor<any, any>;
