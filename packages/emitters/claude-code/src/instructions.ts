/**
 * Instruction-block compilation (D6):
 *
 * - universal blocks → AGENTS.md sentinel regions (MERGE tier, one sentinel
 *   per block, id `instruction:<id>`);
 * - universal blocks targeted at claude-code ONLY → CLAUDE.md tail (they must
 *   not leak into the cross-agent AGENTS.md);
 * - CLAUDE.md is the `@AGENTS.md` shim (OWN tier), emitted whenever any
 *   instruction content reaches claude-code;
 * - path-scoped blocks → `.claude/rules/<id>.md` (OWN tier) with
 *   `paths: [globs]` frontmatter (C5).
 */
import type { CoverageGap, FileOp, PattersonProject } from "@patterson/core";

import {
  claudeOnly,
  CLAUDE_TARGET,
  renderFrontmatterDoc,
  SAFE_ID_RE,
  targetsClaude,
  yamlQuote,
} from "./common.ts";

export const AGENTS_MD_PATH = "AGENTS.md";
export const CLAUDE_MD_PATH = "CLAUDE.md";
export const RULES_DIR = ".claude/rules";

/** Sentinel id for a universal instruction block. */
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
  const tails: string[] = [];

  for (const block of ir.instructions) {
    if (!targetsClaude(block)) continue;

    if (!SAFE_ID_RE.test(block.id)) {
      gaps.push({
        entityId: `instructions.${block.id}`,
        targetId: CLAUDE_TARGET,
        reason:
          "Instruction id is not usable as a sentinel id / rules filename (allowed: alphanumerics plus \"._-\", starting alphanumeric).",
        fallbackApplied: false,
      });
      continue;
    }

    if (block.reach === "path-scoped") {
      // Schema invariant: path-scoped blocks always carry a scope (C5).
      const globs = block.scope?.globs ?? [];
      const frontmatter: [string, string][] = [
        ["paths", `[${globs.map((glob) => yamlQuote(glob)).join(", ")}]`],
      ];
      ops.push({
        path: `${RULES_DIR}/${block.id}.md`,
        format: "markdown",
        mode: "own",
        content: renderFrontmatterDoc(frontmatter, block.body),
      });
      continue;
    }

    if (claudeOnly(block)) {
      tails.push(block.body.replace(/\n+$/, ""));
      continue;
    }

    ops.push({
      path: AGENTS_MD_PATH,
      format: "markdown",
      mode: "merge",
      sentinelId: instructionSentinelId(block.id),
      content: block.body.replace(/\n+$/, ""),
    });
  }

  const hasAgentsContent = ops.some((op) => op.path === AGENTS_MD_PATH);
  if (hasAgentsContent || tails.length > 0) {
    // The shim: Claude Code imports AGENTS.md; claude-only tails follow.
    const parts = ["@AGENTS.md", ...tails];
    ops.push({
      path: CLAUDE_MD_PATH,
      format: "markdown",
      mode: "own",
      content: `${parts.join("\n\n")}\n`,
    });
  }

  return { ops, gaps };
}
