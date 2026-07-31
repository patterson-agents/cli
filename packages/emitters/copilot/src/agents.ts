/**
 * AgentDef → `.github/agents/<name>.agent.md` (OWN tier).
 *
 * `.agent.md` era, NOT `.chatmode.md` (renamed 2025-11-25 — research.md
 * watchlist). The agent's identifier is the file basename; frontmatter carries
 * `description` (required, data-model.md §AgentDef), `tools` (YAML list) and
 * `model`; body = prompt. ModelDef.perAgent overrides AgentDef.model; perAgent
 * entries that name no copilot-targeted agent are CoverageGaps (silent drops
 * are contract violations).
 */
import type { CoverageGap, FileOp, PattersonProject } from "@patterson/core";

import { COPILOT_TARGET, renderFrontmatterDoc, targetsCopilot, yamlFlowArray, yamlQuote } from "./common.ts";

export const GITHUB_AGENTS_DIR = ".github/agents";

export interface AgentsOutput {
  ops: FileOp[];
  gaps: CoverageGap[];
}

export function buildAgentOps(ir: PattersonProject): AgentsOutput {
  const ops: FileOp[] = [];
  const gaps: CoverageGap[] = [];
  const perAgent = ir.models.perAgent ?? {};
  const emitted = new Set<string>();

  for (const agent of ir.agents) {
    if (!targetsCopilot(agent)) continue;
    emitted.add(agent.name);

    const model = perAgent[agent.name] ?? agent.model;
    const frontmatter: [string, string][] = [["description", yamlQuote(agent.description)]];
    if (agent.tools !== undefined && agent.tools.length > 0) {
      frontmatter.push(["tools", yamlFlowArray(agent.tools)]);
    }
    if (model !== undefined) frontmatter.push(["model", yamlQuote(model)]);

    ops.push({
      path: `${GITHUB_AGENTS_DIR}/${agent.name}.agent.md`,
      format: "markdown",
      mode: "own",
      content: renderFrontmatterDoc(frontmatter, agent.prompt),
    });
  }

  for (const name of Object.keys(perAgent)) {
    if (emitted.has(name)) continue;
    gaps.push({
      entityId: `models.perAgent.${name}`,
      targetId: COPILOT_TARGET,
      reason: `models.perAgent names agent "${name}", but no copilot-targeted agent with that name exists.`,
      fallbackApplied: false,
    });
  }

  return { ops, gaps };
}
