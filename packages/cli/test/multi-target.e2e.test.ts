/**
 * T035 — Multi-target E2E: one IR, five surfaces, through the REAL command
 * registry and the REAL P2b emitters (claude-code, copilot, opencode, zed,
 * vscode).
 *
 * Proves the P2b integration obligations:
 *  - one `sync` emits every surface's files from a single IR;
 *  - AGENTS.md is SHARED: claude-code and opencode co-write it via disjoint
 *    sentinel blocks (no clobbering, idempotent re-sync, zero drift);
 *  - instruct-tier ops land in SETUP.md — with copilot + an MCP server the
 *    blob names the COPILOT_MCP_* secrets and the per-server tools (C3/C4);
 *  - `check` reports per-target coverage gaps (zed env-SecretRef, C4) instead
 *    of silently dropping entities;
 *  - `doctor` runs the C7 chain guard: a pre-existing `.cursorrules` is named
 *    as the file Zed actually reads, with AGENTS.md marked unreachable.
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

const ALL_TARGETS = ["claude-code", "copilot", "opencode", "zed", "vscode"] as const;

/**
 * The shared IR: universal + path-scoped instructions, one MCP server with a
 * SecretRef env token and per-server tools (C3/C4 fixture), one clean MCP
 * server (so zed's context_servers surface emits), an agent, an extension.
 */
function multiTargetConfig(name: string): string {
  return renderPattersonConfig({
    version: 1,
    name,
    targets: [...ALL_TARGETS],
    instructions: [
      { id: "core", body: "Always run the tests before committing.", reach: "universal" },
      {
        id: "api-rules",
        body: "Validate all request bodies with zod.",
        reach: "path-scoped",
        scope: { globs: ["src/api/**"] },
      },
    ],
    mcp: [
      {
        name: "docs",
        transport: {
          kind: "stdio",
          exec: {
            argv: ["bunx", "docs-server"],
            env: { DOCS_TOKEN: { kind: "env", name: "DOCS_TOKEN" } },
          },
        },
        tools: ["search", "read"],
        scope: "project",
      },
      {
        name: "search",
        transport: { kind: "stdio", exec: { argv: ["bunx", "search-server"] } },
        scope: "project",
      },
    ],
    agents: [{ name: "reviewer", description: "Reviews code.", prompt: "Be strict." }],
    extensions: [{ id: "dbaeumer.vscode-eslint" }],
  });
}

describe("multi-target E2E (T035)", () => {
  test("one sync emits all five surfaces; AGENTS.md is shared; SETUP.md carries the copilot instruct blob", async () => {
    const root = await tempDir();

    const created = await run(
      "create",
      {
        dir: root,
        yes: true,
        template: "skeleton",
        agents: [...ALL_TARGETS],
        install: false,
        git: false,
        force: false,
        dryRun: false,
      },
      root,
    );
    expect(created.kind).toBe("ok");

    await Bun.write(join(root, "patterson.config.ts"), multiTargetConfig("multi"));
    const synced = await run("sync", { acceptGenerated: false, dryRun: false }, root);
    expect(synced.kind).toBe("ok");
    expect(exitCodeFor(synced)).toBe(0);

    // ---------------------------------------------------------------
    // Every surface's files exist after ONE sync.
    // ---------------------------------------------------------------
    for (const path of [
      // claude-code
      ".mcp.json",
      "CLAUDE.md",
      ".claude/agents/reviewer.md",
      // copilot
      ".github/copilot-instructions.md",
      ".github/instructions/api-rules.instructions.md",
      ".github/agents/reviewer.agent.md",
      // opencode
      "opencode.json",
      // zed (S6: project-scope context_servers is a real file)
      ".zed/settings.json",
      // vscode
      ".vscode/mcp.json",
      ".vscode/extensions.json",
      // shared + instruct
      "AGENTS.md",
      "SETUP.md",
    ]) {
      expect(await Bun.file(join(root, path)).exists()).toBe(true);
    }

    // ---------------------------------------------------------------
    // AGENTS.md sentinel sharing: multiple emitters, one file, disjoint
    // patterson sentinel blocks — and the shared instruction body appears.
    // ---------------------------------------------------------------
    const agentsMd = await readText(root, "AGENTS.md");
    const sentinelIds = [...agentsMd.matchAll(/<!-- patterson:begin id=([^ ]+) /g)].map(
      (match) => match[1],
    );
    expect(sentinelIds.length).toBeGreaterThanOrEqual(2);
    expect(new Set(sentinelIds).size).toBe(sentinelIds.length); // disjoint, no duplicate blocks
    expect(agentsMd).toContain("Always run the tests before committing.");

    // ---------------------------------------------------------------
    // SETUP.md: the copilot coding-agent MCP config is instruct-tier —
    // web-UI-only (C3), secrets via COPILOT_MCP_* (C4), per-server tools[].
    // ---------------------------------------------------------------
    const setupMd = await readText(root, "SETUP.md");
    expect(setupMd).toContain("COPILOT_MCP_DOCS_TOKEN");
    expect(setupMd).toContain('"tools"');
    expect(setupMd).toContain("search");

    // ---------------------------------------------------------------
    // The four structured surfaces parse and carry the right shapes.
    // ---------------------------------------------------------------
    const mcpJson = JSON.parse(await readText(root, ".mcp.json"));
    expect(mcpJson.mcpServers.docs.command).toBe("bunx");
    const opencodeJson = JSON.parse(await readText(root, "opencode.json"));
    expect(opencodeJson.skills.paths).toContain(".agents/skills");
    expect(opencodeJson.mcp.docs.type).toBe("local"); // C1: opencode transport enum
    const zedSettings = JSON.parse(await readText(root, ".zed/settings.json"));
    expect(zedSettings.context_servers.search).toBeDefined(); // clean server emits
    expect(zedSettings.context_servers.docs).toBeUndefined(); // secret-bearing server gaps (C4)
    const vscodeMcp = JSON.parse(await readText(root, ".vscode/mcp.json"));
    expect(vscodeMcp.servers.docs).toBeDefined(); // C2: top-level `servers`, not mcpServers
    expect(JSON.stringify(vscodeMcp)).toContain("${input:"); // C4: synthesized inputs[]

    // ---------------------------------------------------------------
    // Idempotence + shared-file convergence: re-sync writes nothing new,
    // doctor sees zero drift (co-writers did not clobber each other).
    // ---------------------------------------------------------------
    const resynced = await run("sync", { acceptGenerated: false, dryRun: false }, root);
    expect(resynced.kind).toBe("ok");
    const healthy = await run("doctor", {}, root);
    expect(healthy.kind).toBe("ok");
    expect(exitCodeFor(healthy)).toBe(0);

    // ---------------------------------------------------------------
    // Coverage (verification 5): `check` reports zed's env-SecretRef gap —
    // never a silent drop.
    // ---------------------------------------------------------------
    const checked = await run("check", {}, root);
    expect(checked.kind).toBe("ok");
    if (checked.kind !== "ok") throw new Error("expected ok");
    const coverage = checked.value as {
      rows: Array<{ entityId: string; targetId: string; status: string; reason?: string }>;
    };
    const zedDocsGap = coverage.rows.find(
      (row) => row.targetId === "zed" && row.entityId === "mcp.docs" && row.status === "gap",
    );
    expect(zedDocsGap).toBeDefined();
    expect(zedDocsGap?.reason).toContain("SecretRef");
    // Covered rows exist for every target (the emitters all resolved).
    for (const target of ALL_TARGETS) {
      expect(coverage.rows.some((row) => row.targetId === target)).toBe(true);
    }
  });

  test("C7 chain guard: a pre-existing .cursorrules wins Zed's chain and doctor names it", async () => {
    const root = await tempDir();

    const created = await run(
      "create",
      {
        dir: root,
        yes: true,
        template: "skeleton",
        agents: [...ALL_TARGETS],
        install: false,
        git: false,
        force: false,
        dryRun: false,
      },
      root,
    );
    expect(created.kind).toBe("ok");
    await Bun.write(join(root, "patterson.config.ts"), multiTargetConfig("chained"));
    const synced = await run("sync", { acceptGenerated: false, dryRun: false }, root);
    expect(synced.kind).toBe("ok");

    // A Cursor past: a foreign .cursorrules patterson never wrote. It beats
    // AGENTS.md in Zed's first-match chain, silently hiding every managed
    // instruction block from Zed.
    await Bun.write(join(root, ".cursorrules"), "Legacy cursor rules.\n");

    const diagnosed = await run("doctor", {}, root);
    // .cursorrules is foreign (not drift), so doctor still reports via
    // findings, not conflicts.
    expect(diagnosed.kind).toBe("ok");
    if (diagnosed.kind !== "ok") throw new Error("expected ok");
    const report = diagnosed.value as {
      findings: Array<{ checkId: string; severity: string; message: string }>;
    };
    const chainFinding = report.findings.find((finding) => finding.message.includes(".cursorrules"));
    expect(chainFinding).toBeDefined();
    expect(chainFinding?.severity).not.toBe("info");
  });
});
