/**
 * Instruction-block compilation for opencode (D6, C5, C7):
 *
 * - universal blocks reaching more than one agent → the SHARED AGENTS.md
 *   sentinel region (MERGE tier). The sentinel id AND the region content are
 *   byte-identical to the claude-code emitter's (`instruction:<id>`, body with
 *   trailing newlines stripped) so that a multi-target project produces ONE
 *   region per block, never two — the emitters coordinate purely through the
 *   core sentinel API.
 * - universal blocks targeted at opencode ONLY must not leak into the
 *   cross-agent AGENTS.md (opencode reads AGENTS.md natively). They become
 *   own-tier files under `.agents/instructions/<id>.md` (patterson's canonical
 *   tree — NOT `.opencode/`, which is hostile-co-writer territory, C12) and
 *   are referenced from opencode.json `instructions` (the config builder gets
 *   the refs from this module).
 * - path-scoped blocks: opencode has NO scope representation (C5) — handled
 *   per `emit.scopeFallback`:
 *     - "inline": folded into AGENTS.md as a sentinel region explicitly marked
 *       as NOT scope-enforced (+ CoverageGap, fallbackApplied: true). The
 *       sentinel id is `instruction:<id>:unscoped` — deliberately distinct
 *       from the shared universal id, because the folded content (with the
 *       unenforced-scope note) differs from what scope-capable emitters
 *       produce.
 *     - "drop": CoverageGap only (fallbackApplied: false), nothing emitted.
 *     - "error": hard error — the config author asked for failure over
 *       silent scope loss.
 */
import type { CoverageGap, FileOp, PattersonProject } from "@patterson/core";

import { OPENCODE_TARGET, opencodeOnly, SAFE_ID_RE, targetsOpencode } from "./common.ts";

export const AGENTS_MD_PATH = "AGENTS.md";
export const OPENCODE_INSTRUCTIONS_DIR = ".agents/instructions";

/**
 * Sentinel id for a universal instruction block — MUST match the claude-code
 * emitter's instructionSentinelId (shared AGENTS.md region).
 */
export function instructionSentinelId(blockId: string): string {
  return `instruction:${blockId}`;
}

/** Sentinel id for a path-scoped block folded in under scopeFallback "inline". */
export function unscopedSentinelId(blockId: string): string {
  return `instruction:${blockId}:unscoped`;
}

export interface InstructionsOutput {
  ops: FileOp[];
  gaps: CoverageGap[];
  /** opencode.json `instructions` file refs (own-tier files emitted here). */
  refs: string[];
}

export function buildInstructionOps(ir: PattersonProject): InstructionsOutput {
  const ops: FileOp[] = [];
  const gaps: CoverageGap[] = [];
  const refs: string[] = [];

  for (const block of ir.instructions) {
    if (!targetsOpencode(block)) continue;

    if (!SAFE_ID_RE.test(block.id)) {
      gaps.push({
        entityId: `instructions.${block.id}`,
        targetId: OPENCODE_TARGET,
        reason:
          "Instruction id is not usable as a sentinel id / instructions filename (allowed: alphanumerics plus \"._-\", starting alphanumeric).",
        fallbackApplied: false,
      });
      continue;
    }

    const body = block.body.replace(/\n+$/, "");

    if (block.reach === "path-scoped") {
      // Schema invariant: path-scoped blocks always carry a scope (C5).
      const globs = block.scope?.globs ?? [];
      const globList = globs.map((glob) => `\`${glob}\``).join(", ");
      const fallback = ir.emit.scopeFallback;

      if (fallback === "error") {
        throw new Error(
          `opencode cannot express the path-scoped instruction "${block.id}" (scope ${globList}) and emit.scopeFallback is "error" (C5).`,
        );
      }
      if (fallback === "drop") {
        gaps.push({
          entityId: `instructions.${block.id}`,
          targetId: OPENCODE_TARGET,
          reason: `opencode has no path-scoped instructions (C5); scopeFallback "drop": the block (scope ${globList}) was not emitted for this target.`,
          fallbackApplied: false,
        });
        continue;
      }

      // "inline": fold into AGENTS.md, explicitly marked as unenforced.
      const note =
        `> **Note**: intended scope ${globList} — the scope is NOT enforced on this surface ` +
        "(opencode has no path-scoped instructions; C5 fallback \"inline\").";
      ops.push({
        path: AGENTS_MD_PATH,
        format: "markdown",
        mode: "merge",
        sentinelId: unscopedSentinelId(block.id),
        content: `${note}\n\n${body}`,
      });
      gaps.push({
        entityId: `instructions.${block.id}`,
        targetId: OPENCODE_TARGET,
        reason: `opencode has no path-scoped instructions (C5); scopeFallback "inline": the block was folded into AGENTS.md with its scope (${globList}) marked as unenforced.`,
        fallbackApplied: true,
      });
      continue;
    }

    if (opencodeOnly(block)) {
      const path = `${OPENCODE_INSTRUCTIONS_DIR}/${block.id}.md`;
      ops.push({ path, format: "markdown", mode: "own", content: `${body}\n` });
      refs.push(path);
      continue;
    }

    // Shared universal region — byte-identical to the claude-code emitter's op.
    ops.push({
      path: AGENTS_MD_PATH,
      format: "markdown",
      mode: "merge",
      sentinelId: instructionSentinelId(block.id),
      content: body,
    });
  }

  return { ops, gaps, refs };
}
