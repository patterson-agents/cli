/**
 * T025 — `sync`: re-emit with the drift protocol (US2 safety core).
 */
import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";

import { ABSENT_HASH, exitCodeFor, type PattersonProjectInput } from "@patterson/core";
import { renderPattersonConfig } from "../../core/src/scaffold.ts";

import { makeSyncCommand } from "../src/commands/sync.ts";
import {
  exists,
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

const sync = makeSyncCommand(stubDeps());
const runSync = (root: string, args: Partial<{ acceptGenerated: boolean; dryRun: boolean }> = {}) =>
  sync.run({ acceptGenerated: false, dryRun: false, ...args }, makeCtx(root));

const richConfig: PattersonProjectInput = {
  version: 1,
  name: "sync-demo",
  targets: ["claude-code"],
  mcp: [
    {
      name: "docs",
      transport: { kind: "stdio", exec: { argv: ["bunx", "docs-mcp"] } },
      scope: "project",
    },
  ],
  agents: [{ name: "helper", description: "test agent", prompt: "Do helpful things." }],
};

async function seedProject(root: string, input: PattersonProjectInput = richConfig): Promise<void> {
  await Bun.write(join(root, "patterson.config.ts"), renderPattersonConfig(input));
}

describe("sync (T025)", () => {
  test("first sync emits all tiers and records provenance", async () => {
    const root = await tempDir();
    await seedProject(root);
    const result = await runSync(root);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok");
    expect(exitCodeFor(result)).toBe(0);

    expect(await readText(root, "CLAUDE.md")).toContain("sync-demo");
    const mcpJson = JSON.parse(await readText(root, ".mcp.json")) as {
      mcpServers: Record<string, { command: string; args: string[] }>;
    };
    expect(mcpJson.mcpServers["docs"]).toEqual({ command: "bunx", args: ["docs-mcp"] });
    expect(await readText(root, ".claude/agents/helper.md")).toContain("Do helpful things.");
    expect(result.value.setupPath).toBe("SETUP.md");
    expect(await exists(root, "SETUP.md")).toBe(true);

    const records = await readEmittedRecords(root);
    expect(records.has("CLAUDE.md")).toBe(true);
    expect(records.has(".mcp.json")).toBe(true);
    expect(records.has(".claude/agents/helper.md")).toBe(true);
  });

  test("clean re-sync is idempotent (no rewrites, no conflicts)", async () => {
    const root = await tempDir();
    await seedProject(root);
    await runSync(root);
    const result = await runSync(root);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok");
    // SETUP.md is own-tier and unchanged; nothing else rewritten either.
    expect(result.value.written).toEqual([]);
  });

  test("hand-edit is kept and reported as conflicts (exit 2)", async () => {
    const root = await tempDir();
    await seedProject(root);
    await runSync(root);

    const agentPath = join(root, ".claude/agents/helper.md");
    await Bun.write(agentPath, "# helper\n\nMY HAND EDIT\n");

    const result = await runSync(root);
    expect(result.kind).toBe("conflicts");
    if (result.kind !== "conflicts") throw new Error("expected conflicts");
    expect(exitCodeFor(result)).toBe(2);
    expect(result.resolvingFlag).toBe("--accept-generated");
    expect(result.conflicts.some((c) => c.path === ".claude/agents/helper.md")).toBe(true);
    // The hand edit survived (Constitution II).
    expect(await readText(root, ".claude/agents/helper.md")).toContain("MY HAND EDIT");
  });

  test("--accept-generated overwrites after taking a backup", async () => {
    const root = await tempDir();
    await seedProject(root);
    await runSync(root);
    await Bun.write(join(root, ".claude/agents/helper.md"), "# helper\n\nMY HAND EDIT\n");

    const result = await runSync(root, { acceptGenerated: true });
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok");
    expect(await readText(root, ".claude/agents/helper.md")).toContain("Do helpful things.");
    expect(result.value.backups.length).toBeGreaterThan(0);
    const backup = result.value.backups[0] as string;
    expect(await exists(root, backup)).toBe(true);
    expect(await readText(root, backup)).toContain("MY HAND EDIT");
  });

  test("hand-deletion is drift: kept absent, reported with the absent marker", async () => {
    const root = await tempDir();
    await seedProject(root);
    await runSync(root);
    await removeDir(join(root, ".claude/agents"));

    const result = await runSync(root);
    expect(result.kind).toBe("conflicts");
    if (result.kind !== "conflicts") throw new Error("expected conflicts");
    const conflict = result.conflicts.find((c) => c.path === ".claude/agents/helper.md");
    expect(conflict).toBeDefined();
    expect(conflict?.currentHash).toBe(ABSENT_HASH);
    expect(await exists(root, ".claude/agents/helper.md")).toBe(false);
  });

  test("missing config is an error (exit 1)", async () => {
    const root = await tempDir();
    const result = await runSync(root);
    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("expected error");
    expect(exitCodeFor(result)).toBe(1);
    expect(result.code).toBe("CONFIG_NOT_FOUND");
  });

  test("--dry-run plans without writing anything", async () => {
    const root = await tempDir();
    await seedProject(root);
    const result = await runSync(root, { dryRun: true });
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok");
    expect(result.value.dryRun).toBe(true);
    expect(result.value.written.length).toBeGreaterThan(0);
    expect(await exists(root, "CLAUDE.md")).toBe(false);
    expect(await exists(root, ".patterson/emitted.json")).toBe(false);
  });
});
