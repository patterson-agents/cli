/**
 * Shared helpers for the opencode emitter.
 *
 * The frontmatter renderer and quoting MUST stay byte-identical to the
 * claude-code emitter's (packages/emitters/claude-code/src/common.ts): both
 * emitters emit the CANONICAL `.agents/skills/<name>/SKILL.md` (D7), and a
 * byte divergence would make the two emitters fight over the same own-tier
 * file in a multi-target project.
 */
import type { TargetId } from "@patterson/core";

export const OPENCODE_TARGET: TargetId = "opencode";

/** Entity-level target filter: included when unfiltered or explicitly listing opencode. */
export function targetsOpencode(entity: { targets?: TargetId[] | undefined }): boolean {
  return entity.targets === undefined || entity.targets.includes(OPENCODE_TARGET);
}

/** True when the entity is targeted at opencode ONLY (must not leak into cross-agent AGENTS.md). */
export function opencodeOnly(entity: { targets?: TargetId[] | undefined }): boolean {
  return entity.targets !== undefined && entity.targets.length === 1 && entity.targets[0] === OPENCODE_TARGET;
}

/**
 * Ids that are safe both as sentinel ids (core sentinel grammar without ":",
 * which we reserve for our own prefixing) and as emitted file basenames.
 * Identical to the claude-code emitter's SAFE_ID_RE.
 */
export const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Render a string as a YAML double-quoted scalar. JSON string escaping is a
 * subset of YAML double-quoted style, so JSON.stringify is a valid (and
 * deterministic) quoter. Byte-identical to claude-code's yamlQuote.
 */
export function yamlQuote(value: string): string {
  return JSON.stringify(value);
}

/**
 * Render frontmatter + body as a markdown document. Entries are emitted in the
 * given order; values are pre-rendered scalars (already quoted when needed).
 * Byte-identical to claude-code's renderFrontmatterDoc.
 */
export function renderFrontmatterDoc(entries: readonly [string, string][], body: string): string {
  const lines = ["---", ...entries.map(([key, value]) => `${key}: ${value}`), "---", ""];
  const trimmedBody = body.replace(/\n+$/, "");
  return `${lines.join("\n")}\n${trimmedBody}\n`;
}
