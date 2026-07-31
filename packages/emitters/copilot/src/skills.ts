/**
 * Skills for Copilot (D7, C6).
 *
 * Canonical layout: `.agents/skills/<name>/SKILL.md` (OWN — same rendering as
 * the claude-code emitter, byte-identical when both run). Copilot's per-agent
 * link is ALWAYS a real copy into `.github/skills/<name>/` (D7: "claude
 * symlink, copilot copy") — `.github/` content must be plain committed files,
 * so the SkillDef.linkMode field does not change copilot behavior; every
 * copilot op is recorded with `linkMode: "copy"`.
 *
 * SKILL.md is re-rendered; extra `files` are copied from the snapshot (the
 * only thing an emitter may read, Constitution I). A listed file missing from
 * the snapshot is a CoverageGap, never a silent drop.
 */
import type { CoverageGap, FileOp, FsSnapshot, PattersonProject, SkillDef } from "@patterson/core";

import { renderFrontmatterDoc, targetsCopilot, yamlQuote, COPILOT_TARGET } from "./common.ts";

export const AGENTS_SKILLS_DIR = ".agents/skills";
export const GITHUB_SKILLS_DIR = ".github/skills";

/** Canonical (`.agents/skills/<name>/<file>`) path of a skill file. */
export function canonicalSkillPath(name: string, file: string): string {
  return `${AGENTS_SKILLS_DIR}/${name}/${file}`;
}

/**
 * A skill `files` entry must stay inside the skill directory: relative,
 * forward-slash, no `.`/`..` segments, no backslashes. Anything else could
 * read or write outside the skill tree when concatenated into snapshot/FileOp
 * paths (defense in depth — the IR schema enforces the same rule at parse time).
 */
export function isSafeSkillFileEntry(file: string): boolean {
  if (file.length === 0 || file.startsWith("/") || file.includes("\\")) return false;
  return file.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function renderSkillMd(skill: SkillDef): string {
  const frontmatter: [string, string][] = [
    ["name", skill.name],
    ["description", yamlQuote(skill.description)],
  ];
  if (skill.allowedTools !== undefined && skill.allowedTools.length > 0) {
    // Quoted: a tool entry containing ": " would break the plain YAML scalar.
    frontmatter.push(["allowed-tools", yamlQuote(skill.allowedTools.join(", "))]);
  }
  return renderFrontmatterDoc(frontmatter, skill.body);
}

export interface SkillsOutput {
  ops: FileOp[];
  gaps: CoverageGap[];
}

export function buildSkillOps(ir: PattersonProject, snapshot: FsSnapshot): SkillsOutput {
  const ops: FileOp[] = [];
  const gaps: CoverageGap[] = [];

  for (const skill of ir.skills) {
    if (!targetsCopilot(skill)) continue;
    const skillMd = renderSkillMd(skill);

    // Canonical dir (dir name == frontmatter name, C6 — guaranteed by construction here).
    ops.push({
      path: canonicalSkillPath(skill.name, "SKILL.md"),
      format: "markdown",
      mode: "own",
      content: skillMd,
    });

    // Copilot link: always a real copy under .github/skills/<name>/.
    ops.push({
      path: `${GITHUB_SKILLS_DIR}/${skill.name}/SKILL.md`,
      format: "markdown",
      mode: "own",
      content: skillMd,
      linkMode: "copy",
    });
    for (const file of skill.files ?? []) {
      if (!isSafeSkillFileEntry(file)) {
        gaps.push({
          entityId: `skills.${skill.name}`,
          targetId: COPILOT_TARGET,
          reason: `Skill file entry "${file}" is not a safe relative path (no absolute paths, backslashes, or "."/".." segments); it was not copied.`,
          fallbackApplied: false,
        });
        continue;
      }
      const source = canonicalSkillPath(skill.name, file);
      const content = snapshot.read(source);
      if (content === null) {
        gaps.push({
          entityId: `skills.${skill.name}`,
          targetId: COPILOT_TARGET,
          reason: `Skill file "${file}" was not found at ${source} (snapshot); the copy into ${GITHUB_SKILLS_DIR}/${skill.name}/ was skipped.`,
          fallbackApplied: false,
        });
        continue;
      }
      ops.push({
        path: `${GITHUB_SKILLS_DIR}/${skill.name}/${file}`,
        format: "text",
        mode: "own",
        content,
        linkMode: "copy",
      });
    }
  }

  return { ops, gaps };
}
