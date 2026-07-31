/**
 * CommandDef → `.github/prompts/<name>.prompt.md` (OWN tier).
 *
 * Prompt files are `agent:`-era (the `mode:` frontmatter key was renamed —
 * research.md watchlist): when a prompt pins an execution mode it uses the
 * `agent:` key. The IR CommandDef carries no agent binding, so no `agent:` key
 * is emitted (Copilot defaults it); frontmatter is `description` only.
 *
 * `args` have no frontmatter surface: prompt files reference inputs inline as
 * `${input:name}` inside the (prose-exempt) template body, so declared args
 * are reported as a fallback gap, mirroring claude-code's skills-as-commands.
 */
import type { CoverageGap, FileOp, PattersonProject } from "@patterson/core";

import { COPILOT_TARGET, renderFrontmatterDoc, SAFE_ID_RE, targetsCopilot, yamlQuote } from "./common.ts";

export const PROMPTS_DIR = ".github/prompts";

export interface PromptsOutput {
  ops: FileOp[];
  gaps: CoverageGap[];
}

export function buildPromptOps(ir: PattersonProject): PromptsOutput {
  const ops: FileOp[] = [];
  const gaps: CoverageGap[] = [];

  for (const command of ir.commands) {
    if (!targetsCopilot(command)) continue;
    const entityId = `commands.${command.name}`;

    if (!SAFE_ID_RE.test(command.name)) {
      gaps.push({
        entityId,
        targetId: COPILOT_TARGET,
        reason:
          `Command name "${command.name}" is not usable as a prompt-file basename (allowed: alphanumerics plus "._-", starting alphanumeric).`,
        fallbackApplied: false,
      });
      continue;
    }

    if (command.args !== undefined && command.args.length > 0) {
      gaps.push({
        entityId: `${entityId}.args`,
        targetId: COPILOT_TARGET,
        reason:
          `Copilot prompt files have no argument declaration surface; args [${command.args.join(", ")}] ` +
          "are not rendered — reference them as ${input:<name>} in the template body instead.",
        fallbackApplied: true,
      });
    }

    const frontmatter: [string, string][] = [
      ["description", yamlQuote(command.description ?? `Run the ${command.name} command.`)],
    ];
    ops.push({
      path: `${PROMPTS_DIR}/${command.name}.prompt.md`,
      format: "markdown",
      mode: "own",
      content: renderFrontmatterDoc(frontmatter, command.template),
    });
  }

  return { ops, gaps };
}
