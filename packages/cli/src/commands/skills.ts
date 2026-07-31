/**
 * `patterson skills …` — pinned skills-CLI surface (E-P4, US3).
 *
 * - `skills list`: offline inventory of `.agents/skills/` vs skills-lock.json
 *   (managed vs hand-installed; a sick lockfile is reported, never touched).
 * - `skills add <ref>` / `skills remove <name>`: shell out to the PINNED
 *   skills CLI through the backup guard (C14 self-wipe protection). Only the
 *   skills CLI writes the lockfile (Constitution II never-write list).
 */
import { z } from "zod";

import { defineCommand, type CommandResult } from "@patterson/core";
import {
  listInstalledSkills,
  runSkillsCli,
  SKILLS_CLI_VERSION,
  type SkillsCliRunner,
} from "@patterson/skills";

// ---------------------------------------------------------------------------
// skills list
// ---------------------------------------------------------------------------

export const SkillsListInputSchema = z.strictObject({});

export const SkillsListOutputSchema = z.strictObject({
  skills: z.array(
    z.strictObject({
      name: z.string(),
      managed: z.boolean(),
      location: z.enum(["agents", "claude-only", "lockfile-only"]),
      source: z.string().optional(),
      skillPath: z.string().optional(),
    }),
  ),
  lockfileState: z.enum(["absent", "ok", "version-ahead", "unparseable"]),
});

export type SkillsListOutput = z.infer<typeof SkillsListOutputSchema>;

export const skillsListCommand = defineCommand({
  id: "skills.list",
  path: ["skills", "list"],
  summary: "List installed skills (.agents/skills/ vs skills-lock.json, offline)",
  inputSchema: SkillsListInputSchema,
  outputSchema: SkillsListOutputSchema,
  annotations: { readOnlyHint: true, destructiveHint: false },
  async run(_args, ctx): Promise<CommandResult<SkillsListOutput>> {
    const { skills, lockfileState } = await listInstalledSkills(ctx.cwd);
    const details = skills.map((skill) => {
      const base = skill.managed
        ? `${skill.name} (managed, ${skill.source ?? "?"})`
        : `${skill.name} (hand-installed; not in skills-lock.json)`;
      if (skill.location === "claude-only") {
        return `${base} — .claude/skills only: invisible to other agents (move to .agents/skills + symlink)`;
      }
      if (skill.location === "lockfile-only") {
        return `${base} — locked but the skill directory is MISSING`;
      }
      return base;
    });
    if (lockfileState === "unparseable" || lockfileState === "version-ahead") {
      details.push(
        `WARNING: skills-lock.json is ${lockfileState}; the backup guard will preserve it ` +
          "before any skills-CLI invocation.",
      );
    }
    return {
      kind: "ok",
      value: { skills, lockfileState },
      report: {
        summary: `${skills.length} skill(s) installed (${skills.filter((skill) => skill.managed).length} managed).`,
        ...(details.length > 0 ? { details } : {}),
      },
    };
  },
});

// ---------------------------------------------------------------------------
// skills add / remove — shell out through the guard
// ---------------------------------------------------------------------------

export const SkillsAddInputSchema = z.strictObject({
  /** Skill reference the skills CLI understands (e.g. `vercel-labs/skills`). */
  ref: z.string().min(1),
});

export const SkillsMutateOutputSchema = z.strictObject({
  exitCode: z.number(),
  backedUp: z.boolean(),
  backupPath: z.string().optional(),
  cliOutput: z.string(),
});

export type SkillsMutateOutput = z.infer<typeof SkillsMutateOutputSchema>;

/** Injectable runner (tests replace the real bunx shell-out). */
export interface SkillsDeps {
  run: SkillsCliRunner;
}

export const defaultSkillsDeps: SkillsDeps = { run: runSkillsCli };

function mutateResult(
  action: string,
  outcome: Awaited<ReturnType<SkillsCliRunner>>,
): CommandResult<SkillsMutateOutput> {
  const value: SkillsMutateOutput = {
    exitCode: outcome.exitCode,
    backedUp: outcome.guard.backedUp,
    ...(outcome.guard.backupPath !== undefined ? { backupPath: outcome.guard.backupPath } : {}),
    cliOutput: `${outcome.stdout}${outcome.stderr}`.trim(),
  };
  if (outcome.exitCode !== 0) {
    return {
      kind: "error",
      code: "SKILLS_CLI_FAILED",
      message:
        `skills@${SKILLS_CLI_VERSION} ${action} exited with code ${outcome.exitCode}. ` +
        `Output: ${value.cliOutput.slice(0, 500) || "(none)"}`,
      ...(outcome.guard.backedUp
        ? { hint: `Lockfile backup: ${outcome.guard.backupPath}` }
        : {}),
    };
  }
  return {
    kind: "ok",
    value,
    report: {
      summary: `skills ${action} completed (skills CLI ${SKILLS_CLI_VERSION}).`,
      details: [...outcome.guard.warnings, ...(value.cliOutput ? [value.cliOutput.slice(0, 800)] : [])],
    },
  };
}

export function makeSkillsAddCommand(deps: SkillsDeps = defaultSkillsDeps) {
  return defineCommand({
    id: "skills.add",
    path: ["skills", "add"],
    summary: "Install a skill via the pinned skills CLI (writes go through its lockfile)",
    inputSchema: SkillsAddInputSchema,
    outputSchema: SkillsMutateOutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false },
    async run(args, ctx): Promise<CommandResult<SkillsMutateOutput>> {
      return mutateResult(`add ${args.ref}`, await deps.run(["add", args.ref, "-y"], ctx.cwd));
    },
  });
}

export const SkillsRemoveInputSchema = z.strictObject({
  name: z.string().min(1),
});

export function makeSkillsRemoveCommand(deps: SkillsDeps = defaultSkillsDeps) {
  return defineCommand({
    id: "skills.remove",
    path: ["skills", "remove"],
    summary: "Remove an installed skill via the pinned skills CLI",
    inputSchema: SkillsRemoveInputSchema,
    outputSchema: SkillsMutateOutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: true },
    async run(args, ctx): Promise<CommandResult<SkillsMutateOutput>> {
      return mutateResult(`remove ${args.name}`, await deps.run(["remove", args.name, "-y"], ctx.cwd));
    },
  });
}

export const skillsAddCommand = makeSkillsAddCommand();
export const skillsRemoveCommand = makeSkillsRemoveCommand();
