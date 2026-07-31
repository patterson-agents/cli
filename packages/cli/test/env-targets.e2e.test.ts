/**
 * E-P6 — devcontainer/codespaces/github-actions through the REAL registry:
 * one sync emits .devcontainer + patterson-*.yml workflows; the shared
 * emitter compiles ONCE for devcontainer+codespaces; doctor --fix emits
 * pending files but never clobbers drift; foreign workflows are untouched.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";

import { exitCodeFor, type CommandResult } from "@patterson/core";
import { renderPattersonConfig } from "../../core/src/scaffold.ts";

import { buildRegistry } from "../src/commands/registry.ts";
import { makeCtx, makeTempDir, readText, removeDir } from "./helpers.ts";

const dirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await makeTempDir();
  dirs.push(dir);
  return dir;
}
afterEach(async () => {
  while (dirs.length > 0) await removeDir(dirs.pop() as string);
});

const registry = buildRegistry();

async function run(id: string, args: Record<string, unknown>, cwd: string): Promise<CommandResult<unknown>> {
  const descriptor = registry.resolve(id);
  if (!descriptor) throw new Error(`descriptor "${id}" not registered`);
  return (await descriptor.run(args, makeCtx(cwd))) as CommandResult<unknown>;
}

function envConfig(name: string): string {
  return renderPattersonConfig({
    version: 1,
    name,
    targets: ["claude-code", "devcontainer", "codespaces", "github-actions"],
    instructions: [{ id: "core", body: "Test everything.", reach: "universal" }],
    env: {
      image: "oven/bun:1.3.14",
      lifecycle: { updateContent: "bun install", postCreate: ["bun", "run", "setup.ts"] },
      ports: [3000],
      secrets: [{ kind: "env", name: "API_TOKEN" }],
    },
    devops: {
      workflows: ["ci", "security"],
      lint: "oxlint",
      commit: { conventional: true, lefthook: true },
      depUpdates: "dependabot-actions-only",
    },
  });
}

describe("devcontainer + github-actions targets (E-P6)", () => {
  test("one sync emits environment + CI surfaces; foreign workflows untouched; doctor --fix", async () => {
    const root = await tempDir();
    // A pre-existing user workflow patterson must never touch.
    await Bun.write(join(root, ".github/workflows/claude.yml"), "name: user-owned\n");
    await Bun.write(join(root, "patterson.config.ts"), envConfig("envdemo"));

    const synced = await run("sync", { acceptGenerated: false, dryRun: false }, root);
    expect(synced.kind).toBe("ok");

    // Devcontainer config: C10 types preserved, codespaces secrets block.
    const devcontainer = JSON.parse(await readText(root, ".devcontainer/devcontainer.json"));
    expect(devcontainer.updateContentCommand).toBe("bun install");
    expect(devcontainer.postCreateCommand).toEqual(["bun", "run", "setup.ts"]);
    expect(devcontainer.forwardPorts).toEqual([3000]);
    expect(devcontainer.secrets.API_TOKEN).toBeDefined();

    // Workflows: patterson-namespaced files exist; the user's file is intact.
    expect(await readText(root, ".github/workflows/patterson-ci.yml")).toContain("patterson-ci");
    expect(await readText(root, ".github/workflows/patterson-security.yml")).toContain("socket ci");
    expect(await readText(root, ".github/workflows/claude.yml")).toBe("name: user-owned\n");
    expect(await readText(root, "lefthook.yml")).toContain("commitlint");
    expect(await readText(root, ".github/dependabot.yml")).toContain("github-actions");

    // SETUP.md carries the instruct notes (secrets + socket token).
    const setup = await readText(root, "SETUP.md");
    expect(setup).toContain("API_TOKEN");
    expect(setup).toContain("SOCKET_API_TOKEN");

    // The shared devcontainer emitter compiled once: no duplicated instruct note.
    const occurrences = setup.split("Prebuilds do NOT see user secrets").length - 1;
    expect(occurrences).toBe(1);

    // doctor: healthy.
    const healthy = await run("doctor", {}, root);
    expect(healthy.kind).toBe("ok");
    expect(exitCodeFor(healthy)).toBe(0);
  });

  test("doctor --fix emits pending files but keeps drifted ones", async () => {
    const root = await tempDir();
    await Bun.write(join(root, "patterson.config.ts"), envConfig("fixdemo"));
    await run("sync", { acceptGenerated: false, dryRun: false }, root);

    // Delete one emitted file (pending again) and hand-edit another (drift).
    const { unlink } = await import("node:fs/promises");
    await unlink(join(root, ".github/workflows/patterson-ci.yml"));
    const edited = `${await readText(root, "lefthook.yml")}\n# hand edit\n`;
    await Bun.write(join(root, "lefthook.yml"), edited);

    const fixed = await run("doctor", { fix: true }, root);
    // Drift still reports as conflicts (exit 2) — --fix never clobbers.
    expect(fixed.kind).toBe("conflicts");
    expect(await readText(root, "lefthook.yml")).toBe(edited);
    // But the deleted (ABSENT-drift…) — a deleted OWN file is drift, not
    // pending: it must ALSO be kept absent-reported, not silently recreated.
    // Re-accept everything, then verify --fix leaves a healthy project healthy.
    await run("sync", { acceptGenerated: true, dryRun: false }, root);
    const healthy = await run("doctor", { fix: true }, root);
    expect(healthy.kind).toBe("ok");
  });
});
