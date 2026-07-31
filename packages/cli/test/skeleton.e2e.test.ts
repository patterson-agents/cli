/**
 * T027 — Walking-skeleton E2E: the full create → doctor → hand-edit →
 * sync (exit 2, edit preserved) → sync --accept-generated (overwrite) →
 * init adoption flow, through the REAL command registry and the REAL
 * claude-code emitter, plus the never-write guard.
 *
 * Everything runs at the CommandResult level (Constitution III: the CLI and
 * MCP frontends are projections of these descriptors); exit-code semantics are
 * asserted via exitCodeFor (0 ok / 2 conflicts).
 */
import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";

import {
  applyFileOps,
  exitCodeFor,
  PattersonNeverWriteError,
  RESOLVING_FLAG,
  type CommandResult,
} from "@patterson/core";
import { renderPattersonConfig } from "../../core/src/scaffold.ts";

import { buildRegistry } from "../src/commands/registry.ts";
import { makeCtx, makeTempDir, readEmittedRecords, readText, removeDir } from "./helpers.ts";

const dirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await makeTempDir();
  dirs.push(dir);
  return dir;
}
afterEach(async () => {
  while (dirs.length > 0) await removeDir(dirs.pop() as string);
});

// The REAL registry: real create/sync/doctor/init descriptors wired to the
// real @patterson/emitter-claude-code emitter and the repo templates.
const registry = buildRegistry();

function resolve(id: string) {
  const descriptor = registry.resolve(id);
  if (!descriptor) throw new Error(`descriptor "${id}" not registered`);
  return descriptor;
}

async function run(id: string, args: Record<string, unknown>, cwd: string): Promise<CommandResult<unknown>> {
  return (await resolve(id).run(args, makeCtx(cwd))) as CommandResult<unknown>;
}

describe("walking skeleton E2E (T027)", () => {
  test("create → doctor → hand-edit → sync (exit 2) → accept-generated → never-write guard", async () => {
    const root = await tempDir();

    // -----------------------------------------------------------------
    // 1. Scripted create: --yes --template skeleton --agents claude-code
    //    --no-install --no-git
    // -----------------------------------------------------------------
    const created = await run(
      "create",
      {
        dir: root,
        yes: true,
        template: "skeleton",
        agents: ["claude-code"],
        install: false,
        git: false,
        force: false,
        dryRun: false,
      },
      root,
    );
    expect(created.kind).toBe("ok");
    expect(exitCodeFor(created)).toBe(0);
    expect(await Bun.file(join(root, "patterson.config.ts")).exists()).toBe(true);
    expect(await Bun.file(join(root, "package.json")).exists()).toBe(true);
    expect(await Bun.file(join(root, "SETUP.md")).exists()).toBe(true);

    // Give the IR real claude-code surfaces so the drift protocol has teeth.
    await Bun.write(
      join(root, "patterson.config.ts"),
      renderPattersonConfig({
        version: 1,
        name: "e2e",
        targets: ["claude-code"],
        instructions: [{ id: "core", body: "Always run tests.", reach: "universal" }],
        policy: { allow: ["Read"], deny: [], ask: [], defaultMode: "acceptEdits" },
        agents: [{ name: "reviewer", description: "Reviews code.", prompt: "Be strict." }],
      }),
    );
    const firstSync = await run("sync", { acceptGenerated: false, dryRun: false }, root);
    expect(firstSync.kind).toBe("ok");

    // -----------------------------------------------------------------
    // 2. doctor: zero drift right after emission
    // -----------------------------------------------------------------
    const healthy = await run("doctor", {}, root);
    expect(healthy.kind).toBe("ok");
    expect(exitCodeFor(healthy)).toBe(0);

    // -----------------------------------------------------------------
    // 3. Hand-edit an emitted file, then sync: exit-2 semantics via
    //    CommandResult, the edit is preserved
    // -----------------------------------------------------------------
    const agentPath = ".claude/agents/reviewer.md";
    const edited = `${await readText(root, agentPath)}\nHand-added note.\n`;
    await Bun.write(join(root, agentPath), edited);

    const drifted = await run("sync", { acceptGenerated: false, dryRun: false }, root);
    expect(drifted.kind).toBe("conflicts");
    expect(exitCodeFor(drifted)).toBe(2);
    if (drifted.kind !== "conflicts") throw new Error("expected conflicts");
    expect(drifted.resolvingFlag).toBe(RESOLVING_FLAG);
    expect(drifted.conflicts.some((conflict) => conflict.path === agentPath)).toBe(true);
    // Edit preserved — the engine kept, it did not clobber.
    expect(await readText(root, agentPath)).toBe(edited);

    // doctor agrees: drift ⇒ conflicts ⇒ exit 2.
    const sick = await run("doctor", {}, root);
    expect(sick.kind).toBe("conflicts");
    expect(exitCodeFor(sick)).toBe(2);

    // -----------------------------------------------------------------
    // 4. --accept-generated overwrites (with a backup) and re-converges
    // -----------------------------------------------------------------
    const accepted = await run("sync", { acceptGenerated: true, dryRun: false }, root);
    expect(accepted.kind).toBe("ok");
    if (accepted.kind !== "ok") throw new Error("expected ok");
    const acceptedValue = accepted.value as { backups: string[] };
    expect(acceptedValue.backups.length).toBeGreaterThan(0);
    expect(await readText(root, agentPath)).not.toContain("Hand-added note.");

    const recovered = await run("doctor", {}, root);
    expect(recovered.kind).toBe("ok");
    expect(exitCodeFor(recovered)).toBe(0);

    // -----------------------------------------------------------------
    // 5. Never-write guard: writing skills-lock.json through the engine
    //    must throw (Constitution II) — and nothing may be written
    // -----------------------------------------------------------------
    await expect(
      applyFileOps(
        [{ path: "skills-lock.json", format: "json", mode: "own", content: "{}" }],
        { root, irHash: "e2e" },
      ),
    ).rejects.toThrow(PattersonNeverWriteError);
    expect(await Bun.file(join(root, "skills-lock.json")).exists()).toBe(false);

    // Also via a nested path and mixed into a batch: pre-flight aborts the
    // whole batch before anything is written.
    await expect(
      applyFileOps(
        [
          { path: "innocent.md", format: "markdown", mode: "own", content: "hi" },
          { path: "sub/dir/skills-lock.json", format: "json", mode: "own", content: "{}" },
        ],
        { root, irHash: "e2e" },
      ),
    ).rejects.toThrow(PattersonNeverWriteError);
    expect(await Bun.file(join(root, "innocent.md")).exists()).toBe(false);
  });

  test("init adoption fixture: pre-existing config becomes foreign and is never clobbered", async () => {
    const root = await tempDir();

    // Adoption fixture: a repo that had claude-code config before patterson.
    await Bun.write(
      join(root, ".mcp.json"),
      `${JSON.stringify(
        { mcpServers: { docs: { command: "hand-written-server", args: ["--serve"] } } },
        null,
        2,
      )}\n`,
    );
    await Bun.write(join(root, "CLAUDE.md"), "# House rules\n\nAlways run tests.\n");
    await Bun.write(
      join(root, ".claude/settings.json"),
      '{\n  "permissions": { "allow": ["Read"] }\n}\n',
    );

    const adopted = await run("init", { name: "adopted", import: false, force: false, dryRun: false }, root);
    expect(adopted.kind).toBe("ok");
    if (adopted.kind !== "ok") throw new Error("expected ok");
    const value = adopted.value as { foreign: string[] };
    expect(value.foreign).toContain(".mcp.json#/mcpServers/docs");
    expect(value.foreign).toContain(".claude/settings.json#/permissions/allow");
    expect(value.foreign).toContain("CLAUDE.md");

    // Provenance records the foreign marks.
    const records = await readEmittedRecords(root);
    expect((records.get(".mcp.json") as { foreign?: string[] }).foreign).toContain(
      "/mcpServers/docs",
    );
    expect((records.get("CLAUDE.md") as { foreign?: string[] }).foreign).toContain("content");

    // Even a same-named server in the config + --accept-generated cannot
    // clobber the adopted (foreign) definition.
    const mcpBefore = await readText(root, ".mcp.json");
    await Bun.write(
      join(root, "patterson.config.ts"),
      renderPattersonConfig({
        version: 1,
        name: "adopted",
        targets: ["claude-code"],
        mcp: [
          {
            name: "docs",
            transport: { kind: "stdio", exec: { argv: ["patterson-generated"] } },
            scope: "project",
          },
        ],
      }),
    );
    const synced = await run("sync", { acceptGenerated: true, dryRun: false }, root);
    expect(synced.kind).toBe("ok");
    expect(await readText(root, ".mcp.json")).toBe(mcpBefore);
  });
});
