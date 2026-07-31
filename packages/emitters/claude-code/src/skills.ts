/**
 * Skills + skills-as-commands (D7, C6, S3).
 *
 * Canonical layout: `.agents/skills/<name>/SKILL.md` (OWN). S3 resolution:
 * Claude Code does NOT scan `.agents/skills/`, so the `.claude/skills/<name>`
 * link is MANDATORY for every skill targeting claude-code:
 *
 * - linkMode "symlink": one FileOp at `.claude/skills/<name>` with
 *   `linkMode: "symlink"` whose `content` is the RELATIVE LINK TARGET
 *   (`../../.agents/skills/<name>`). The engine records linkMode on the
 *   EmissionRecord and materializes the link (symlink creation is engine
 *   territory — emitters produce intent only).
 * - linkMode "copy": real copies under `.claude/skills/<name>/` — SKILL.md is
 *   re-rendered; extra `files` are copied from the snapshot (the only thing an
 *   emitter may read, Constitution I). A listed file missing from the snapshot
 *   is a CoverageGap, never a silent drop.
 *
 * CommandDef compiles to the preferred `.claude/skills/<name>/SKILL.md` form
 * (skills-as-commands, data-model.md §CommandDef).
 */
import { SKILL_NAME_REGEX, type CoverageGap, type FileOp, type FsSnapshot, type PattersonProject, type SkillDef } from "@patterson/core";

import { CLAUDE_TARGET, renderFrontmatterDoc, targetsClaude, yamlQuote } from "./common.ts";

export const AGENTS_SKILLS_DIR = ".agents/skills";
export const CLAUDE_SKILLS_DIR = ".claude/skills";

/** Canonical (`.agents/skills/<name>/<file>`) path of a skill file. */
export function canonicalSkillPath(name: string, file: string): string {
  return `${AGENTS_SKILLS_DIR}/${name}/${file}`;
}

function renderSkillMd(skill: SkillDef): string {
  const frontmatter: [string, string][] = [
    ["name", skill.name],
    ["description", yamlQuote(skill.description)],
  ];
  if (skill.allowedTools !== undefined && skill.allowedTools.length > 0) {
    frontmatter.push(["allowed-tools", skill.allowedTools.join(", ")]);
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
    if (!targetsClaude(skill)) continue;
    const skillMd = renderSkillMd(skill);

    // Canonical dir (dir name == frontmatter name, C6 — guaranteed by construction here).
    ops.push({
      path: canonicalSkillPath(skill.name, "SKILL.md"),
      format: "markdown",
      mode: "own",
      content: skillMd,
    });

    if (skill.linkMode === "symlink") {
      ops.push({
        path: `${CLAUDE_SKILLS_DIR}/${skill.name}`,
        format: "text",
        mode: "own",
        // Content of a symlink op = the relative link target.
        content: `../../${AGENTS_SKILLS_DIR}/${skill.name}`,
        linkMode: "symlink",
      });
      continue;
    }

    // linkMode "copy": real files under .claude/skills/<name>/.
    ops.push({
      path: `${CLAUDE_SKILLS_DIR}/${skill.name}/SKILL.md`,
      format: "markdown",
      mode: "own",
      content: skillMd,
      linkMode: "copy",
    });
    for (const file of skill.files ?? []) {
      const source = canonicalSkillPath(skill.name, file);
      const content = snapshot.read(source);
      if (content === null) {
        gaps.push({
          entityId: `skills.${skill.name}`,
          targetId: CLAUDE_TARGET,
          reason: `Skill file "${file}" was not found at ${source} (snapshot); the copy into ${CLAUDE_SKILLS_DIR}/${skill.name}/ was skipped.`,
          fallbackApplied: false,
        });
        continue;
      }
      ops.push({
        path: `${CLAUDE_SKILLS_DIR}/${skill.name}/${file}`,
        format: "text",
        mode: "own",
        content,
        linkMode: "copy",
      });
    }
  }

  return { ops, gaps };
}

export function buildCommandOps(ir: PattersonProject): SkillsOutput {
  const ops: FileOp[] = [];
  const gaps: CoverageGap[] = [];
  const skillNames = new Set(
    ir.skills.filter((skill) => targetsClaude(skill)).map((skill) => skill.name),
  );

  for (const command of ir.commands) {
    if (!targetsClaude(command)) continue;
    const entityId = `commands.${command.name}`;

    if (!SKILL_NAME_REGEX.test(command.name) || command.name.length > 64 || command.name.includes("--")) {
      gaps.push({
        entityId,
        targetId: CLAUDE_TARGET,
        reason: `Command name "${command.name}" is not a valid skill directory name (skills-as-commands requires ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$, ≤64 chars, no "--").`,
        fallbackApplied: false,
      });
      continue;
    }
    if (skillNames.has(command.name)) {
      gaps.push({
        entityId,
        targetId: CLAUDE_TARGET,
        reason: `Command "${command.name}" collides with a skill of the same name; both compile to ${CLAUDE_SKILLS_DIR}/${command.name}/SKILL.md.`,
        fallbackApplied: false,
      });
      continue;
    }

    const frontmatter: [string, string][] = [
      ["name", command.name],
      ["description", yamlQuote(command.description ?? `Run the ${command.name} command.`)],
    ];
    ops.push({
      path: `${CLAUDE_SKILLS_DIR}/${command.name}/SKILL.md`,
      format: "markdown",
      mode: "own",
      content: renderFrontmatterDoc(frontmatter, command.template),
    });
  }

  return { ops, gaps };
}
