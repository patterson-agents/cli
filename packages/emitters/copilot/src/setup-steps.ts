/**
 * env.copilotSetupSteps → `.github/workflows/copilot-setup-steps.yml` (OWN
 * tier, tasks.md T030).
 *
 * Landmines (research corpus + GitHub docs "Customizing the development
 * environment for Copilot coding agent"):
 * - the job id MUST literally be `copilot-setup-steps` — any other id is
 *   silently ignored by the coding agent. The wrapper hard-codes it.
 * - the job runs with a hard 59-minute cap; an authored `timeout-minutes`
 *   above 59 is clamped to 59 and reported as a fallback CoverageGap.
 *
 * The author-provided record is the JOB body and is passed through verbatim
 * (key order preserved — C10-adjacent: no normalization of author values).
 * Strings render as YAML double-quoted scalars (JSON escaping is a subset of
 * YAML double-quoted style), keeping output deterministic and injection-safe.
 */
import type { CoverageGap, FileOp, PattersonProject } from "@patterson/core";

import { COPILOT_TARGET } from "./common.ts";

export const SETUP_STEPS_PATH = ".github/workflows/copilot-setup-steps.yml";

/** The literal job id the Copilot coding agent looks for. */
export const SETUP_STEPS_JOB_ID = "copilot-setup-steps";

/** Hard cap GitHub applies to the copilot-setup-steps job. */
export const SETUP_STEPS_MAX_MINUTES = 59;

const PLAIN_KEY_RE = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/;

function yamlKey(key: string): string {
  return PLAIN_KEY_RE.test(key) ? key : JSON.stringify(key);
}

function yamlScalar(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return "null";
  // Unreachable for JSON-derived records; deterministic fallback.
  return JSON.stringify(String(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Deterministic YAML block rendering of a JSON-ish value, one line per entry,
 * `indent` spaces of leading indentation. Insertion order is preserved.
 */
function yamlLines(value: unknown, indent: number): string[] {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) return [`${pad}[]`];
    const lines: string[] = [];
    for (const item of value) {
      if (isRecord(item) || Array.isArray(item)) {
        const inner = yamlLines(item, indent + 2);
        // Fold the dash into the first line: "-  a: b" → "- a: b".
        const first = inner[0] ?? "";
        lines.push(`${pad}- ${first.slice(indent + 2)}`, ...inner.slice(1));
      } else {
        lines.push(`${pad}- ${yamlScalar(item)}`);
      }
    }
    return lines;
  }
  if (isRecord(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return [`${pad}{}`];
    const lines: string[] = [];
    for (const [key, entry] of entries) {
      if (isRecord(entry) || Array.isArray(entry)) {
        const inner = yamlLines(entry, indent + 2);
        const isEmpty = inner.length === 1 && (inner[0]?.trimStart() === "{}" || inner[0]?.trimStart() === "[]");
        if (isEmpty) {
          lines.push(`${pad}${yamlKey(key)}: ${inner[0]?.trimStart() ?? ""}`);
        } else {
          lines.push(`${pad}${yamlKey(key)}:`, ...inner);
        }
      } else {
        lines.push(`${pad}${yamlKey(key)}: ${yamlScalar(entry)}`);
      }
    }
    return lines;
  }
  return [`${pad}${yamlScalar(value)}`];
}

export interface SetupStepsOutput {
  op: FileOp | null;
  gaps: CoverageGap[];
}

export function buildSetupStepsOp(ir: PattersonProject): SetupStepsOutput {
  const gaps: CoverageGap[] = [];
  const job = ir.env.copilotSetupSteps;
  if (job === undefined) return { op: null, gaps };

  // Clamp timeout-minutes to the platform cap (reported, never silent).
  const jobEntries: [string, unknown][] = Object.entries(job).map(([key, value]) => {
    if (key === "timeout-minutes" && typeof value === "number" && value > SETUP_STEPS_MAX_MINUTES) {
      gaps.push({
        entityId: "env.copilotSetupSteps.timeout-minutes",
        targetId: COPILOT_TARGET,
        reason:
          `copilot-setup-steps jobs are capped at ${SETUP_STEPS_MAX_MINUTES} minutes by GitHub; ` +
          `timeout-minutes ${value} was clamped to ${SETUP_STEPS_MAX_MINUTES}.`,
        fallbackApplied: true,
      });
      return [key, SETUP_STEPS_MAX_MINUTES];
    }
    return [key, value];
  });

  const lines = [
    `name: "Copilot Setup Steps"`,
    "",
    "on:",
    "  workflow_dispatch:",
    "  push:",
    "    paths:",
    `      - ${JSON.stringify(SETUP_STEPS_PATH)}`,
    "  pull_request:",
    "    paths:",
    `      - ${JSON.stringify(SETUP_STEPS_PATH)}`,
    "",
    "jobs:",
    // The job id MUST be exactly this literal (Copilot coding agent contract).
    `  ${SETUP_STEPS_JOB_ID}:`,
    ...yamlLines(Object.fromEntries(jobEntries), 4),
    "",
  ];

  return {
    op: { path: SETUP_STEPS_PATH, format: "yaml", mode: "own", content: lines.join("\n") },
    gaps,
  };
}
