/**
 * E-P4 — skills command descriptors with an injected (scripted) skills-CLI
 * runner: list inventory, add/remove result mapping, guard warnings surfaced.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";

import { makeSkillsAddCommand, makeSkillsRemoveCommand, skillsListCommand } from "../src/commands/skills.ts";
import type { SkillsCliResult } from "@patterson/skills";
import { makeCtx, makeTempDir, removeDir } from "./helpers.ts";

const dirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await makeTempDir();
  dirs.push(dir);
  return dir;
}
afterEach(async () => {
  while (dirs.length > 0) await removeDir(dirs.pop() as string);
});

function scriptedRunner(result: Partial<SkillsCliResult>): {
  calls: { args: string[]; cwd: string }[];
  run: (args: string[], cwd: string) => Promise<SkillsCliResult>;
} {
  const calls: { args: string[]; cwd: string }[] = [];
  return {
    calls,
    async run(args, cwd) {
      calls.push({ args, cwd });
      return {
        exitCode: 0,
        stdout: "",
        stderr: "",
        guard: { backedUp: false, warnings: [] },
        ...result,
      };
    },
  };
}

describe("skills.list", () => {
  test("inventories .agents/skills against the lockfile", async () => {
    const root = await tempDir();
    await Bun.write(
      join(root, "skills-lock.json"),
      JSON.stringify({
        version: 1,
        skills: {
          demo: { source: "o/r", sourceType: "github", skillPath: "skills/demo/SKILL.md", computedHash: "x" },
        },
      }),
    );
    await Bun.write(join(root, ".agents/skills/demo/SKILL.md"), "---\nname: demo\n---\n");
    await Bun.write(join(root, ".agents/skills/manual/SKILL.md"), "---\nname: manual\n---\n");

    const result = await skillsListCommand.run({}, makeCtx(root));
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok");
    expect(result.value.skills).toEqual([
      { name: "demo", managed: true, location: "agents", source: "o/r", skillPath: "skills/demo/SKILL.md" },
      { name: "manual", managed: false, location: "agents" },
    ]);
  });
});

describe("skills.add / skills.remove (injected runner)", () => {
  test("add shells out through the pinned CLI with -y and reports guard warnings", async () => {
    const root = await tempDir();
    const runner = scriptedRunner({
      stdout: "installed",
      guard: { backedUp: true, backupPath: ".patterson/backup/skills-lock.json.t", warnings: ["backed up"] },
    });
    const result = await makeSkillsAddCommand({ run: runner.run }).run(
      { ref: "vercel-labs/skills" },
      makeCtx(root),
    );
    expect(runner.calls[0]?.args).toEqual(["add", "vercel-labs/skills", "-y"]);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok");
    expect(result.value.backedUp).toBe(true);
    expect(result.report?.details).toContain("backed up");
  });

  test("a failing CLI maps to a structured error with backup hint", async () => {
    const root = await tempDir();
    const runner = scriptedRunner({
      exitCode: 1,
      stderr: "network down",
      guard: { backedUp: true, backupPath: ".patterson/backup/x", warnings: ["w"] },
    });
    const result = await makeSkillsRemoveCommand({ run: runner.run }).run(
      { name: "demo" },
      makeCtx(root),
    );
    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("expected error");
    expect(result.message).toContain("network down");
    expect(result.hint).toContain(".patterson/backup/x");
  });
});
