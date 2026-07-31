/**
 * T025b — `init` (adoption) with a pre-populated fixture repo.
 *
 * Pre-existing keys/regions become `foreign` in .patterson/emitted.json and
 * are never overwritten (FR-007, US2-AS3); `--import` lifts recognizable
 * claude-code config (MCP servers, instruction files) into patterson.config.ts.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";

import { PattersonProjectSchema } from "@patterson/core";

import { makeInitCommand } from "../src/commands/init.ts";
import { makeSyncCommand } from "../src/commands/sync.ts";
import {
  makeCtx,
  makeTempDir,
  readEmittedRecords,
  readText,
  removeDir,
  stubDeps,
} from "./helpers.ts";

const dirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await makeTempDir();
  dirs.push(dir);
  return dir;
}
afterEach(async () => {
  while (dirs.length > 0) await removeDir(dirs.pop() as string);
});

const deps = stubDeps();
const init = makeInitCommand(deps);
const sync = makeSyncCommand(deps);
const baseArgs = { import: false, force: false, dryRun: false };

/** Fixture: a repo that already has claude-code config before patterson. */
async function seedFixtureRepo(root: string): Promise<void> {
  await Bun.write(
    join(root, ".mcp.json"),
    `${JSON.stringify(
      {
        mcpServers: {
          docs: { command: "bunx", args: ["docs-mcp"], env: { DOCS_DIR: "./docs" } },
        },
      },
      null,
      2,
    )}\n`,
  );
  await Bun.write(join(root, "CLAUDE.md"), "# House rules\n\nAlways run tests.\n");
  await Bun.write(join(root, "AGENTS.md"), "# Agent guide\n\nBe brief.\n");
  await Bun.write(join(root, ".claude/settings.json"), '{\n  "permissions": { "allow": ["Read"] }\n}\n');
}

async function loadConfig(root: string) {
  const mod = (await import(join(root, "patterson.config.ts"))) as { default: unknown };
  return PattersonProjectSchema.parse(mod.default);
}

describe("init (T025b)", () => {
  test("detects pre-existing config and adopts without clobbering", async () => {
    const root = await tempDir();
    await seedFixtureRepo(root);

    const result = await init.run({ ...baseArgs, name: "adopted" }, makeCtx(root));
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok");
    expect(result.value.detected.toSorted()).toEqual(
      [".claude/settings.json", ".mcp.json", "AGENTS.md", "CLAUDE.md"].toSorted(),
    );

    // Config written; no entities imported without --import.
    const ir = await loadConfig(root);
    expect(ir.name).toBe("adopted");
    expect(ir.mcp).toEqual([]);
    expect(result.value.imported).toEqual({ mcpServers: 0, instructions: 0 });

    // Merge tier: sentinel appended to CLAUDE.md, hand-written prose kept.
    const claudeMd = await readText(root, "CLAUDE.md");
    expect(claudeMd).toContain("# House rules");
    expect(claudeMd).toContain("Managed by patterson.");
  });

  test("--import lifts MCP servers and instruction files into the config", async () => {
    const root = await tempDir();
    await seedFixtureRepo(root);

    const result = await init.run({ ...baseArgs, import: true, name: "adopted" }, makeCtx(root));
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok");
    expect(result.value.imported.mcpServers).toBe(1);
    expect(result.value.imported.instructions).toBe(2);

    const ir = await loadConfig(root);
    const docs = ir.mcp.find((server) => server.name === "docs");
    expect(docs).toBeDefined();
    if (docs?.transport.kind !== "stdio") throw new Error("expected stdio transport");
    expect(docs.transport.exec.argv).toEqual(["bunx", "docs-mcp"]);
    expect(docs.transport.exec.env).toEqual({ DOCS_DIR: "./docs" });
    expect(ir.instructions.map((block) => block.id).toSorted()).toEqual([
      "imported-agents-md",
      "imported-claude-md",
    ]);
    expect(ir.instructions.find((b) => b.id === "imported-claude-md")?.body).toContain("# House rules");
  });

  test("adoption marks pre-existing keys foreign; sync never overwrites them", async () => {
    const root = await tempDir();
    await seedFixtureRepo(root);
    // Pre-existing value differs from what the emitter would generate (extra env).
    const before = await readText(root, ".mcp.json");

    const result = await init.run({ ...baseArgs, import: true }, makeCtx(root));
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok");
    expect(result.value.foreign).toContain(".mcp.json#/mcpServers/docs");

    const records = await readEmittedRecords(root);
    const mcpRecord = records.get(".mcp.json") as { foreign?: string[] } | undefined;
    expect(mcpRecord?.foreign).toContain("/mcpServers/docs");
    // The pre-existing key value is untouched.
    expect(await readText(root, ".mcp.json")).toBe(before);

    // A later sync keeps skipping the foreign key (never overwritten).
    const synced = await sync.run({ acceptGenerated: false, dryRun: false }, makeCtx(root));
    expect(synced.kind).toBe("ok");
    if (synced.kind !== "ok") throw new Error("expected ok");
    expect(synced.value.foreignSkipped).toContain(".mcp.json#/mcpServers/docs");
    expect(await readText(root, ".mcp.json")).toBe(before);
  });

  test("re-init without --force is an error", async () => {
    const root = await tempDir();
    await seedFixtureRepo(root);
    await init.run({ ...baseArgs }, makeCtx(root));
    const again = await init.run({ ...baseArgs }, makeCtx(root));
    expect(again.kind).toBe("error");
    if (again.kind !== "error") throw new Error("expected error");
    expect(again.code).toBe("ALREADY_INITIALIZED");
  });

  test("--import skips invalid entries (reserved MCP name) with a reason", async () => {
    const root = await tempDir();
    await Bun.write(
      join(root, ".mcp.json"),
      JSON.stringify({
        mcpServers: {
          workspace: { command: "bunx", args: ["x"] },
          good: { command: "bunx", args: ["y"] },
        },
      }),
    );
    const result = await init.run({ ...baseArgs, import: true }, makeCtx(root));
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok");
    expect(result.value.imported.mcpServers).toBe(1);
    expect(result.value.skipped.some((entry) => entry.includes("workspace"))).toBe(true);
    const ir = await loadConfig(root);
    expect(ir.mcp.map((server) => server.name)).toEqual(["good"]);
  });

  test("--import converts ${VAR} env values into SecretRef nodes (C4)", async () => {
    const root = await tempDir();
    await Bun.write(
      join(root, ".mcp.json"),
      JSON.stringify({
        mcpServers: {
          api: { command: "bunx", args: ["api-mcp"], env: { API_KEY: "${API_KEY}" } },
        },
      }),
    );
    const result = await init.run({ ...baseArgs, import: true }, makeCtx(root));
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok");
    const ir = await loadConfig(root);
    const api = ir.mcp.find((server) => server.name === "api");
    if (api?.transport.kind !== "stdio") throw new Error("expected stdio transport");
    expect(api.transport.exec.env).toEqual({ API_KEY: { kind: "env", name: "API_KEY" } });
  });
});
