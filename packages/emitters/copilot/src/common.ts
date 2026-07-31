/**
 * Shared helpers for the copilot emitter.
 */
import type { TargetId } from "@patterson/core";

export const COPILOT_TARGET: TargetId = "copilot";

/** Entity-level target filter: included when unfiltered or explicitly listing copilot. */
export function targetsCopilot(entity: { targets?: TargetId[] | undefined }): boolean {
  return entity.targets === undefined || entity.targets.includes(COPILOT_TARGET);
}

/**
 * Ids that are safe both as sentinel ids (core sentinel grammar without ":",
 * which we reserve for our own prefixing) and as emitted file basenames.
 */
export const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Render a string as a YAML double-quoted scalar. JSON string escaping is a
 * subset of YAML double-quoted style, so JSON.stringify is a valid (and
 * deterministic) quoter.
 */
export function yamlQuote(value: string): string {
  return JSON.stringify(value);
}

/** Render a YAML flow-style array of quoted strings: ["a", "b"]. */
export function yamlFlowArray(values: readonly string[]): string {
  return `[${values.map((value) => yamlQuote(value)).join(", ")}]`;
}

/**
 * Render frontmatter + body as a markdown document. Entries are emitted in the
 * given order; values are pre-rendered scalars (already quoted when needed).
 */
export function renderFrontmatterDoc(entries: readonly [string, string][], body: string): string {
  const lines = ["---", ...entries.map(([key, value]) => `${key}: ${value}`), "---", ""];
  const trimmedBody = body.replace(/\n+$/, "");
  return `${lines.join("\n")}\n${trimmedBody}\n`;
}
