/**
 * Check registry core types (T016).
 *
 * Checks are the shared validation vocabulary consumed by `doctor`, `check`,
 * and (in P7) the tutor's CheckRef — the tutor owns no validators of its own
 * (specs/001-patterson-cli-v1/data-model.md, Tutor extension).
 */
import type { PattersonProject } from "../ir/index.ts";

// ---------------------------------------------------------------------------
// Severity
// ---------------------------------------------------------------------------

/** Severities in report order: most severe first. */
export const SEVERITIES = ["error", "warn", "info"] as const;
export type Severity = (typeof SEVERITIES)[number];

/** Rank used for deterministic finding ordering (lower = more severe). */
export const SEVERITY_RANK: Readonly<Record<Severity, number>> = {
  error: 0,
  warn: 1,
  info: 2,
};

// ---------------------------------------------------------------------------
// Finding
// ---------------------------------------------------------------------------

export interface Finding {
  /** Id of the check that produced this finding (stamped by the registry). */
  checkId: string;
  severity: Severity;
  /** Human-readable description of what was found. */
  message: string;
  /** Optional file path (repo-relative) the finding is about. */
  path?: string;
  /** Optional remediation hint (e.g. a command to run). */
  fix?: string;
}

// ---------------------------------------------------------------------------
// CheckCtx / CheckDef
// ---------------------------------------------------------------------------

/**
 * Context handed to every check run. Checks read the world only through this
 * ctx (project root + validated IR when available) — they never prompt and
 * never write (Constitution I/III).
 */
export interface CheckCtx {
  /** Absolute project root the checks inspect. */
  cwd: string;
  /** Validated IR, when a config was loadable. Absent during adoption/init. */
  ir?: PattersonProject;
}

export interface CheckDef {
  /** Unique id, e.g. "drift.settings", "mcp.reachable". */
  id: string;
  /** One-line human description shown in the `check` table. */
  description: string;
  /** Pure inspection: returns findings, never throws for expected problems. */
  run(ctx: CheckCtx): Promise<Finding[]>;
}
