/**
 * Tutor engine (E-P7): run a lesson's declarative validators against the
 * learner's real project. Prerequisites missing ⇒ skip-with-explanation
 * (never a hard failure); the git prerequisite has its own first lesson
 * (`git init` as a validated step) rather than a dead end.
 */
import { join } from "node:path";

import { validateMcpHandshake } from "@patterson/generators";

import type { Lesson, LessonOutcome, StepResult } from "./types.ts";

async function commandExitCode(argv: [string, ...string[]], cwd: string): Promise<number | null> {
  try {
    const proc = Bun.spawn(argv, { cwd, stdin: "ignore", stdout: "ignore", stderr: "ignore" });
    return await proc.exited;
  } catch {
    return null;
  }
}

/** Prerequisite probes: tool id → does it work here? */
const PREREQ_PROBES: Record<string, [string, ...string[]]> = {
  git: ["git", "rev-parse", "--git-dir"],
  bun: ["bun", "--version"],
  gh: ["gh", "--version"],
};

/** Explanation offered when a prerequisite is missing (plan.md skip path). */
const PREREQ_EXPLANATIONS: Record<string, string> = {
  git: "this directory is not a git repository — run `git init` first (the fluency track's first lesson walks through it)",
  bun: "the Bun runtime is not installed — https://bun.com/docs/installation",
  gh: "the GitHub CLI is not installed — https://cli.github.com",
};

export async function checkPrerequisites(lesson: Lesson, cwd: string): Promise<string | null> {
  for (const requirement of lesson.requires) {
    const probe = PREREQ_PROBES[requirement];
    if (!probe) continue;
    const code = await commandExitCode(probe, cwd);
    if (code !== 0) {
      return `Skipped "${lesson.title}": ${PREREQ_EXPLANATIONS[requirement] ?? `missing ${requirement}`}.`;
    }
  }
  return null;
}

async function runStep(
  validator: Lesson["validate"][number],
  cwd: string,
): Promise<StepResult> {
  switch (validator.kind) {
    case "file-exists": {
      const ok = await Bun.file(join(cwd, validator.path)).exists();
      return { ok, description: `${validator.path} exists`, ...(ok ? {} : { hint: validator.hint }) };
    }
    case "file-contains": {
      const file = Bun.file(join(cwd, validator.path));
      const ok = (await file.exists()) && (await file.text()).includes(validator.needle);
      return {
        ok,
        description: `${validator.path} contains ${JSON.stringify(validator.needle)}`,
        ...(ok ? {} : { hint: validator.hint }),
      };
    }
    case "command": {
      const code = await commandExitCode(validator.argv as [string, ...string[]], cwd);
      const ok = code === validator.expectExitCode;
      return {
        ok,
        description: `\`${validator.argv.join(" ")}\` exits ${validator.expectExitCode}`,
        ...(ok ? {} : { hint: validator.hint }),
      };
    }
    case "mcp-handshake": {
      const report = await validateMcpHandshake(validator.argv as [string, ...string[]], {
        cwd: join(cwd, validator.dir),
      });
      return {
        ok: report.ok,
        description: `MCP handshake (${report.tools.length} tool(s) listed)`,
        ...(report.ok
          ? {}
          : { hint: `${validator.hint} — failed at: ${report.steps.find((step) => !step.ok)?.step}` }),
      };
    }
  }
}

/** Run one lesson: prerequisites, then every validator (never throws). */
export async function runLesson(lesson: Lesson, cwd: string): Promise<LessonOutcome> {
  const skip = await checkPrerequisites(lesson, cwd);
  if (skip !== null) return { status: "skipped", reason: skip };

  const steps: StepResult[] = [];
  for (const validator of lesson.validate) {
    steps.push(await runStep(validator, cwd));
  }
  return steps.every((step) => step.ok) ? { status: "passed", steps } : { status: "failed", steps };
}
