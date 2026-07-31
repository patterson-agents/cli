/**
 * AgentDef → `.claude/agents/<name>.md` (OWN tier).
 *
 * Frontmatter: name, description, tools? (comma-joined), model?; body = prompt.
 * ModelDef.perAgent overrides AgentDef.model; perAgent entries that name no
 * claude-targeted agent are CoverageGaps (silent drops are contract violations).
 */
import type { CoverageGap, FileOp, PattersonProject } from "@patterson/core";

import { CLAUDE_TARGET, renderFrontmatterDoc, targetsClaude, yamlQuote } from "./common.ts";

export const CLAUDE_AGENTS_DIR = ".claude/agents";

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
    if (!targetsClaude(agent)) continue;
    emitted.add(agent.name);

    const model = perAgent[agent.name] ?? agent.model;
    const frontmatter: [string, string][] = [
      ["name", agent.name],
      ["description", yamlQuote(agent.description)],
    ];
    if (agent.tools !== undefined && agent.tools.length > 0) {
      // Quoted: a tool entry containing ": " would break the plain YAML scalar.
      frontmatter.push(["tools", yamlQuote(agent.tools.join(", "))]);
    }
    if (model !== undefined) frontmatter.push(["model", model]);

    ops.push({
      path: `${CLAUDE_AGENTS_DIR}/${agent.name}.md`,
      format: "markdown",
      mode: "own",
      content: renderFrontmatterDoc(frontmatter, agent.prompt),
    });
  }

  for (const name of Object.keys(perAgent)) {
    if (emitted.has(name)) continue;
    gaps.push({
      entityId: `models.perAgent.${name}`,
      targetId: CLAUDE_TARGET,
      reason: `models.perAgent names agent "${name}", but no claude-code-targeted agent with that name exists.`,
      fallbackApplied: false,
    });
  }

  return { ops, gaps };
}
