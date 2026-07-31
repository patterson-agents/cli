/**
 * Reachability reporting for entities Zed cannot express (contracts/emitter.md
 * obligation 3: silent drops are contract violations).
 *
 * The S6-verified project-scope surface for Zed is tiny — `context_servers`
 * plus `context_server_timeout` — so most IR entities that reach the zed
 * target are inexpressible there and must show up in the `patterson check`
 * coverage table as gaps. "Reaches zed" = entity `targets` is undefined (all
 * targets) or explicitly lists "zed".
 *
 * Instructions are special (C7 / D6): Zed reads exactly ONE instructions file
 * by first-match; this emitter never writes that chain (the cross package owns
 * chain analysis), so a universal block is *covered* — not a gap — whenever a
 * chain-writing target also carries it (or the block is untargeted).
 */
import type { CoverageGap, PattersonProject } from "@patterson/core";

import {
  CHAIN_WRITER_TARGETS,
  targetsZed,
  ZED_EXPECTED_INSTRUCTIONS_FILE,
  ZED_TARGET,
} from "./common.ts";

function gap(entityId: string, reason: string): CoverageGap {
  return { entityId, targetId: ZED_TARGET, reason, fallbackApplied: false };
}

const NO_PROJECT_SURFACE =
  "(S6: Zed's project-scope settings subset carries only context_servers and context_server_timeout).";

export function buildCoverageGaps(ir: PattersonProject): CoverageGap[] {
  const gaps: CoverageGap[] = [];

  for (const block of ir.instructions) {
    if (!targetsZed(block)) continue;
    if (block.reach === "path-scoped") {
      gaps.push(
        gap(
          `instructions.${block.id}`,
          "Zed reads exactly one instructions file via its first-match chain (C7); " +
            "path-scoped instruction blocks are inexpressible for zed.",
        ),
      );
      continue;
    }
    // Universal block: covered by the chain when untargeted or when a
    // chain-writing target carries it into AGENTS.md / copilot-instructions.
    const covered =
      block.targets === undefined ||
      block.targets.some((target) => CHAIN_WRITER_TARGETS.includes(target));
    if (!covered) {
      gaps.push(
        gap(
          `instructions.${block.id}`,
          `Zed reads instructions via its first-match chain (C7) and the zed emitter never writes ` +
            `that chain (${ZED_EXPECTED_INSTRUCTIONS_FILE} is expected to win); this block reaches no ` +
            `chain-writing target (${CHAIN_WRITER_TARGETS.join(", ")}), so Zed will never see it.`,
        ),
      );
    }
  }

  for (const skill of ir.skills) {
    if (!targetsZed(skill)) continue;
    gaps.push(gap(`skills.${skill.name}`, `Zed has no project-scope skills surface ${NO_PROJECT_SURFACE}`));
  }

  for (const agent of ir.agents) {
    if (!targetsZed(agent)) continue;
    gaps.push(
      gap(`agents.${agent.name}`, `Zed has no project-scope custom-agent surface ${NO_PROJECT_SURFACE}`),
    );
  }

  for (const command of ir.commands) {
    if (!targetsZed(command)) continue;
    gaps.push(
      gap(`commands.${command.name}`, `Zed has no project-scope command/prompt surface ${NO_PROJECT_SURFACE}`),
    );
  }

  ir.hooks.agentHooks.forEach((hook, index) => {
    if (!targetsZed(hook)) return;
    gaps.push(
      gap(`hooks.agentHooks[${index}]`, `Zed has no project-scope agent-hook surface ${NO_PROJECT_SURFACE}`),
    );
  });

  const { policy } = ir;
  if (
    policy.allow.length > 0 ||
    policy.deny.length > 0 ||
    policy.ask.length > 0 ||
    policy.defaultMode !== undefined ||
    (policy.additionalDirectories !== undefined && policy.additionalDirectories.length > 0)
  ) {
    gaps.push(
      gap("policy", `Zed has no verified project-scope permission surface ${NO_PROJECT_SURFACE}`),
    );
  }

  const { models } = ir;
  if (
    models.default !== undefined ||
    models.fallback !== undefined ||
    models.perAgent !== undefined ||
    models.raw?.zed !== undefined
  ) {
    gaps.push(
      gap(
        "models",
        "Zed model slots are not verified project-scope-valid " + NO_PROJECT_SURFACE +
          " Configure models in Zed USER settings; the raw.zed escape hatch is not emitted until " +
          "a primary source verifies those keys at project scope (Constitution V).",
      ),
    );
  }

  return gaps;
}
