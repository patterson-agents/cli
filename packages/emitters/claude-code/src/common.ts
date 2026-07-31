/**
 * Shared helpers for the claude-code emitter.
 */
import type { TargetId } from "@patterson/core";

export const CLAUDE_TARGET: TargetId = "claude-code";

/** Entity-level target filter: included when unfiltered or explicitly listing claude-code. */
export function targetsClaude(entity: { targets?: TargetId[] | undefined }): boolean {
  return entity.targets === undefined || entity.targets.includes(CLAUDE_TARGET);
}

/** True when the entity is targeted at claude-code ONLY (drives the CLAUDE.md tail). */
export function claudeOnly(entity: { targets?: TargetId[] | undefined }): boolean {
  return entity.targets !== undefined && entity.targets.length === 1 && entity.targets[0] === CLAUDE_TARGET;
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

/**
 * Render frontmatter + body as a markdown document. Entries are emitted in the
 * given order; values are pre-rendered scalars (already quoted when needed).
 */
export function renderFrontmatterDoc(entries: readonly [string, string][], body: string): string {
  const lines = ["---", ...entries.map(([key, value]) => `${key}: ${value}`), "---", ""];
  const trimmedBody = body.replace(/\n+$/, "");
  return `${lines.join("\n")}\n${trimmedBody}\n`;
}
