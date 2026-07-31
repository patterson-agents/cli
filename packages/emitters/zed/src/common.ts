/**
 * Shared helpers for the zed emitter.
 */
import type { TargetId } from "@patterson/core";

export const ZED_TARGET: TargetId = "zed";

/** Entity-level target filter: included when unfiltered or explicitly listing zed. */
export function targetsZed(entity: { targets?: TargetId[] | undefined }): boolean {
  return entity.targets === undefined || entity.targets.includes(ZED_TARGET);
}

/**
 * C7 / D6: Zed reads exactly ONE instructions file, by first-match over its
 * chain (.rules, .cursorrules, .windsurfrules, .clinerules,
 * .github/copilot-instructions.md, AGENT.md, AGENTS.md, CLAUDE.md). The zed
 * emitter NEVER writes any file on that chain — the cross package
 * (packages/emitters/cross) owns the on-disk chain analysis. This constant is
 * the zed emitter's declaration of which file it expects to win the chain in a
 * patterson-managed repo (AGENTS.md, the widest artifact per D6).
 */
export const ZED_EXPECTED_INSTRUCTIONS_FILE = "AGENTS.md";

/**
 * Targets whose emitters write a file on Zed's first-match instructions chain:
 * claude-code and opencode share the AGENTS.md sentinel document; copilot
 * writes .github/copilot-instructions.md (also on the chain). An instruction
 * block reaches Zed only if at least one of these targets carries it into a
 * chain file (or the block is untargeted, i.e. reaches every target).
 */
export const CHAIN_WRITER_TARGETS: readonly TargetId[] = ["claude-code", "opencode", "copilot"];
