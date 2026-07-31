/**
 * Skills for opencode (D7, C6, S3):
 *
 * opencode discovers skills through `skills.paths` — the config builder
 * ALWAYS emits `[".agents/skills"]` into opencode.json (S3/D7), so no
 * per-skill link is needed (unlike claude-code, which requires a
 * `.claude/skills/<name>` link).
 *
 * This module emits the CANONICAL `.agents/skills/<name>/SKILL.md` (OWN tier)
 * for every opencode-targeted skill, byte-identical to the claude-code
 * emitter's canonical op: a skill targeting both agents must compile to ONE
 * agreed file, and a skill targeting opencode only still needs its canonical
 * file emitted by someone.
 *
 * `linkMode` is a per-agent linking concern (claude symlink / copilot copy)
 * and has no opencode meaning — discovery is path-based, so it is neither
 * rendered nor a gap.
 */
import type { CoverageGap, FileOp, PattersonProject, SkillDef } from "@patterson/core";

import { renderFrontmatterDoc, targetsOpencode, yamlQuote } from "./common.ts";

export const AGENTS_SKILLS_DIR = ".agents/skills";

/** Byte-identical to claude-code's renderSkillMd (shared canonical file). */
function renderSkillMd(skill: SkillDef): string {
  const frontmatter: [string, string][] = [
    ["name", skill.name],
    ["description", yamlQuote(skill.description)],
  ];
  if (skill.allowedTools !== undefined && skill.allowedTools.length > 0) {
    // Quoted: a tool entry containing ": " (e.g. Bash(echo a: b)) would
    // otherwise make the plain scalar unparseable YAML.
    frontmatter.push(["allowed-tools", yamlQuote(skill.allowedTools.join(", "))]);
  }
  return renderFrontmatterDoc(frontmatter, skill.body);
}

export interface SkillsOutput {
  ops: FileOp[];
  gaps: CoverageGap[];
}

export function buildSkillOps(ir: PattersonProject): SkillsOutput {
  const ops: FileOp[] = [];
  const gaps: CoverageGap[] = [];

  for (const skill of ir.skills) {
    if (!targetsOpencode(skill)) continue;
    // Canonical dir (dir name == frontmatter name, C6 — guaranteed by construction here).
    ops.push({
      path: `${AGENTS_SKILLS_DIR}/${skill.name}/SKILL.md`,
      format: "markdown",
      mode: "own",
      content: renderSkillMd(skill),
    });
  }

  return { ops, gaps };
}
