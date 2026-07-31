/**
 * T033 — Round-trip drift tests: emit → hand-edit → re-emit ⇒ edit preserved
 * + conflict reported; `--accept-generated` overwrites (after backup). The
 * headline assertions: JSONC comments survive re-emission, hand-added foreign
 * servers/inputs/tasks/recommendations survive even `--accept-generated`, and
 * the mcp.json top-level key is `servers` (never `mcpServers`).
 *
 * The engine (applyFileOps) owns drift mechanics; these tests prove the
 * emitter's FileOps ride them correctly end to end.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  applyFileOps,
  captureSnapshot,
  computeIrHash,
  PattersonProjectSchema,
  readValueAt,
  RESOLVING_FLAG,
  type ApplyResult,
  type PattersonProjectInput,
} from "@patterson/core";

import { compileVscode, snapshotPaths } from "../src/index.ts";

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "patterson-vscode-roundtrip-"));
  roots.push(root);
  return root;
}

const IR_INPUT: PattersonProjectInput = {
  version: 1,
  name: "roundtrip",
  targets: ["vscode"],
  mcp: [
    {
      name: "docs",
      transport: {
        kind: "stdio",
        exec: {
          argv: ["bunx", "docs-server", "--root", "."],
          env: { MODE: "fast", TOKEN: { kind: "env", name: "DOCS_TOKEN" } },
        },
      },
      scope: "project",
    },
  ],
  extensions: [{ id: "oxc.oxc-vscode" }],
  devops: { workflows: [], lint: "oxlint" },
};

const ir = PattersonProjectSchema.parse(IR_INPUT);
const irHash = computeIrHash(ir);

async function emit(root: string, acceptGenerated = false): Promise<ApplyResult> {
  const snapshot = await captureSnapshot(root, snapshotPaths(ir));
  const { ops } = compileVscode(ir, snapshot);
  return applyFileOps(ops, { root, irHash, acceptGenerated });
}

const MCP_PATH = ".vscode/mcp.json";
const EXTENSIONS_PATH = ".vscode/extensions.json";
const TASKS_PATH = ".vscode/tasks.json";

async function read(root: string, path: string): Promise<string> {
  return Bun.file(join(root, path)).text();
}

describe("round-trip drift (emit → hand-edit → re-emit)", () => {
  test("fresh emit applies cleanly, is idempotent, and writes `servers` not `mcpServers`", async () => {
    const root = makeRoot();
    const first = await emit(root);
    expect(first.conflicts).toEqual([]);
    expect(first.written).toContain(MCP_PATH);
    expect(first.written).toContain(EXTENSIONS_PATH);
    expect(first.written).toContain(TASKS_PATH);
    // settings.json: deviations-only, and v1 has none — never created.
    expect(first.written).not.toContain(".vscode/settings.json");
    expect(await Bun.file(join(root, ".vscode/settings.json")).exists()).toBe(false);

    const mcp = JSON.parse(await read(root, MCP_PATH)) as Record<string, unknown>;
    expect(mcp).not.toHaveProperty("mcpServers");
    expect(mcp.servers).toHaveProperty("docs");
    const docs = (mcp.servers as Record<string, Record<string, unknown>>).docs as {
      env: Record<string, string>;
    };
    // env-kind SecretRef → ${input:...} (never ${env:...} — not vscode mcp.json syntax).
    expect(docs.env.TOKEN).toBe("${input:DOCS_TOKEN}");
    expect(docs.env.MODE).toBe("fast");
    expect(mcp.inputs).toEqual([
      {
        type: "promptString",
        id: "DOCS_TOKEN",
        description: "Value for the DOCS_TOKEN environment variable.",
        password: true,
      },
    ]);

    const tasks = JSON.parse(await read(root, TASKS_PATH)) as { version: string };
    expect(tasks.version).toBe("2.0.0");

    const mcpBefore = await read(root, MCP_PATH);
    const second = await emit(root);
    expect(second.conflicts).toEqual([]);
    expect(await read(root, MCP_PATH)).toBe(mcpBefore); // byte-identical re-emit
  });

  test("JSONC comments added by hand survive re-emission untouched", async () => {
    const root = makeRoot();
    await emit(root);

    const commented = `// Hand-added header comment.\n${await read(root, MCP_PATH)}`;
    await Bun.write(join(root, MCP_PATH), commented);
    const extCommented = (await read(root, EXTENSIONS_PATH)).replace(
      "{",
      "{\n  // Keep these installed.",
    );
    await Bun.write(join(root, EXTENSIONS_PATH), extCommented);

    // Values at every recorded key path are unchanged → clean → no rewrite,
    // comments intact, zero conflicts.
    const result = await emit(root);
    expect(result.conflicts).toEqual([]);
    expect(await read(root, MCP_PATH)).toBe(commented);
    expect(await read(root, EXTENSIONS_PATH)).toBe(extCommented);
  });

  test("foreign server keys are never touched; foreign inputs survive --accept-generated", async () => {
    const root = makeRoot();
    await emit(root);

    // Hand-add a foreign server (a key path patterson never patches) and a
    // foreign input (changes the recorded /inputs value → drift).
    const doc = JSON.parse(await read(root, MCP_PATH)) as {
      servers: Record<string, unknown>;
      inputs: unknown[];
    };
    doc.servers.hand = { type: "http", url: "https://example.com/mcp" };
    doc.inputs.push({ type: "promptString", id: "hand-key", description: "Hand-added." });
    const edited = `${JSON.stringify(doc, null, 2)}\n`;
    await Bun.write(join(root, MCP_PATH), edited);

    const result = await emit(root);
    expect(await read(root, MCP_PATH)).toBe(edited); // edits preserved
    const conflict = result.conflicts.find((c) => c.keyPath === "/inputs");
    expect(conflict?.reason).toBe("hand-edited");
    expect(conflict?.resolvingFlag).toBe(RESOLVING_FLAG);
    // The foreign server alone causes no conflict — its key path is not ours.
    expect(result.conflicts.filter((c) => c.keyPath === "/servers/hand")).toEqual([]);

    const accepted = await emit(root, true);
    expect(accepted.conflicts).toEqual([]);
    const finalText = await read(root, MCP_PATH);
    // Identity-preserving merge: the foreign input and server survive the
    // accepted overwrite; our generated input definition is restored.
    const inputs = readValueAt(finalText, ["inputs"]).value as { id: string }[];
    expect(inputs.map((input) => input.id).toSorted()).toEqual(["DOCS_TOKEN", "hand-key"]);
    expect(readValueAt(finalText, ["servers", "hand"]).value).toEqual({
      type: "http",
      url: "https://example.com/mcp",
    });
  });

  test("hand-edit of our server entry: preserved + reported; --accept-generated restores with backup", async () => {
    const root = makeRoot();
    await emit(root);

    const doc = JSON.parse(await read(root, MCP_PATH)) as {
      servers: { docs: { args: string[] } };
    };
    doc.servers.docs.args = ["docs-server", "--root", "elsewhere"];
    const edited = `${JSON.stringify(doc, null, 2)}\n`;
    await Bun.write(join(root, MCP_PATH), edited);

    const result = await emit(root);
    expect(await read(root, MCP_PATH)).toBe(edited); // edit preserved
    const conflict = result.conflicts.find((c) => c.keyPath === "/servers/docs");
    expect(conflict?.reason).toBe("hand-edited");

    const accepted = await emit(root, true);
    expect(accepted.conflicts).toEqual([]);
    expect(accepted.backups.length).toBeGreaterThan(0);
    const restored = readValueAt(await read(root, MCP_PATH), ["servers", "docs"]).value as {
      args: string[];
    };
    expect(restored.args).toEqual(["docs-server", "--root", "."]);
  });

  test("tasks: hand-added task survives --accept-generated; edited patterson task is restored", async () => {
    const root = makeRoot();
    await emit(root);

    const doc = JSON.parse(await read(root, TASKS_PATH)) as {
      version: string;
      tasks: { label: string; args?: string[] }[];
    };
    doc.tasks.push({ label: "echo" });
    const lint = doc.tasks.find((t) => t.label === "patterson: lint");
    if (lint) lint.args = ["oxlint", "--fix", "."];
    const edited = `${JSON.stringify(doc, null, 2)}\n`;
    await Bun.write(join(root, TASKS_PATH), edited);

    const result = await emit(root);
    expect(await read(root, TASKS_PATH)).toBe(edited); // edits preserved
    expect(result.conflicts.find((c) => c.keyPath === "/tasks")?.reason).toBe("hand-edited");

    const accepted = await emit(root, true);
    expect(accepted.conflicts).toEqual([]);
    const tasks = readValueAt(await read(root, TASKS_PATH), ["tasks"]).value as {
      label: string;
      args?: string[];
    }[];
    expect(tasks.map((t) => t.label)).toEqual(["echo", "patterson: lint"]);
    expect(tasks.find((t) => t.label === "patterson: lint")?.args).toEqual(["oxlint", "."]);
  });

  test("extensions: hand-added recommendation survives; ours is appended once", async () => {
    const root = makeRoot();
    await emit(root);

    const doc = JSON.parse(await read(root, EXTENSIONS_PATH)) as { recommendations: string[] };
    doc.recommendations.unshift("esbenp.prettier-vscode");
    const edited = `${JSON.stringify(doc, null, 2)}\n`;
    await Bun.write(join(root, EXTENSIONS_PATH), edited);

    const result = await emit(root);
    expect(result.conflicts.find((c) => c.keyPath === "/recommendations")?.reason).toBe(
      "hand-edited",
    );

    const accepted = await emit(root, true);
    expect(accepted.conflicts).toEqual([]);
    const recommendations = readValueAt(await read(root, EXTENSIONS_PATH), ["recommendations"])
      .value as string[];
    expect(recommendations).toEqual(["esbenp.prettier-vscode", "oxc.oxc-vscode"]);
  });
});
