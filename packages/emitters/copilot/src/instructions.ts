/**
 * Instruction-block compilation for Copilot (D6):
 *
 * - universal blocks → `.github/copilot-instructions.md` as a REAL COPY of the
 *   block body — Copilot has no import syntax (research.md D6), so the shared
 *   content is duplicated verbatim into a patterson-owned sentinel region
 *   (MERGE tier, one sentinel per block, id `instruction:<id>`, managed by the
 *   core sentinel engine);
 * - path-scoped blocks → `.github/instructions/<id>.instructions.md` (OWN
 *   tier) with `applyTo` frontmatter as a comma-separated STRING (C5,
 *   research.md watchlist: applyTo is NOT a YAML list).
 */
import type { CoverageGap, FileOp, PattersonProject } from "@patterson/core";

import { COPILOT_TARGET, renderFrontmatterDoc, SAFE_ID_RE, targetsCopilot, yamlQuote } from "./common.ts";

export const COPILOT_INSTRUCTIONS_PATH = ".github/copilot-instructions.md";
export const INSTRUCTIONS_DIR = ".github/instructions";

/** Sentinel id for a universal instruction block (same id family as claude-code's AGENTS.md regions). */
export function instructionSentinelId(blockId: string): string {
  return `instruction:${blockId}`;
}

export interface InstructionsOutput {
  ops: FileOp[];
  gaps: CoverageGap[];
}

export function buildInstructionOps(ir: PattersonProject): InstructionsOutput {
  const ops: FileOp[] = [];
  const gaps: CoverageGap[] = [];

  for (const block of ir.instructions) {
    if (!targetsCopilot(block)) continue;

    if (!SAFE_ID_RE.test(block.id)) {
      gaps.push({
        entityId: `instructions.${block.id}`,
        targetId: COPILOT_TARGET,
        reason:
          "Instruction id is not usable as a sentinel id / instructions filename (allowed: alphanumerics plus \"._-\", starting alphanumeric).",
        fallbackApplied: false,
      });
      continue;
    }

    if (block.reach === "path-scoped") {
      // Schema invariant: path-scoped blocks always carry a scope (C5).
      const globs = block.scope?.globs ?? [];
      // applyTo is a comma-separated STRING, not a YAML list (watchlist).
      const frontmatter: [string, string][] = [["applyTo", yamlQuote(globs.join(","))]];
      ops.push({
        path: `${INSTRUCTIONS_DIR}/${block.id}.instructions.md`,
        format: "markdown",
        mode: "own",
        content: renderFrontmatterDoc(frontmatter, block.body),
      });
      continue;
    }

    // Universal reach: a real copy into the repository-wide instructions file.
    ops.push({
      path: COPILOT_INSTRUCTIONS_PATH,
      format: "markdown",
      mode: "merge",
      sentinelId: instructionSentinelId(block.id),
      content: block.body.replace(/\n+$/, ""),
    });
  }

  return { ops, gaps };
}
