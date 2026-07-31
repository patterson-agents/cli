/**
 * T032 — Round-trip drift tests for the zed emitter: emit → hand-edit →
 * re-emit ⇒ edit preserved + conflict reported; `--accept-generated`
 * overwrites (after backup); hand-DELETION is drift (ABSENT_HASH). Plus the
 * zed-specific merge property from S6: `.zed/settings.json` is JSONC and the
 * engine's key-path surgery must preserve hand-authored comments and foreign
 * keys — Zed itself silently ignores unknown keys, so patterson is the only
 * line of defense.
 *
 * The engine (applyFileOps) owns drift mechanics; these tests prove the
 * emitter's FileOps ride them correctly end to end.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  ABSENT_HASH,
  applyFileOps,
  captureSnapshot,
  computeIrHash,
  PattersonProjectSchema,
  readValueAt,
  RESOLVING_FLAG,
  type ApplyResult,
  type PattersonProjectInput,
} from "@patterson/core";

import { compileZed, snapshotPaths, TRUST_NOTE_CONTENT, ZED_SETTINGS_PATH } from "../src/index.ts";

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "patterson-zed-roundtrip-"));
  roots.push(root);
  return root;
}

const IR_INPUT: PattersonProjectInput = {
  version: 1,
  name: "roundtrip",
  targets: ["zed"],
  mcp: [
    {
      name: "docs",
      transport: {
        kind: "stdio",
        exec: { argv: ["bunx", "docs-server", "--root", "."], env: { MODE: "fast" } },
      },
      scope: "project",
    },
    {
      name: "api",
      transport: { kind: "http", url: "https://api.example.com/mcp" },
      scope: "project",
    },
  ],
  extensions: [{ id: "toml", targets: ["zed"] }],
};

const ir = PattersonProjectSchema.parse(IR_INPUT);
const irHash = computeIrHash(ir);

async function emit(root: string, acceptGenerated = false): Promise<ApplyResult> {
  const snapshot = await captureSnapshot(root, snapshotPaths(ir));
  const { ops } = compileZed(ir, snapshot);
  return applyFileOps(ops, { root, irHash, acceptGenerated });
}

async function read(root: string, path: string): Promise<string> {
  return Bun.file(join(root, path)).text();
}

describe("round-trip drift (emit → hand-edit → re-emit)", () => {
  test("fresh emit applies cleanly, is idempotent, and renders SETUP.md instruct steps", async () => {
    const root = makeRoot();
    const first = await emit(root);
    expect(first.conflicts).toEqual([]);
    expect(first.written).toContain(ZED_SETTINGS_PATH);
    expect(first.setupPath).toBe("SETUP.md");

    // C2 shape on disk: no `type` discriminator; command|url presence discriminates.
    const text = await read(root, ZED_SETTINGS_PATH);
    expect(readValueAt(text, ["context_servers", "docs"]).value).toEqual({
      command: "bunx",
      args: ["docs-server", "--root", "."],
      env: { MODE: "fast" },
    });
    expect(readValueAt(text, ["context_servers", "api"]).value).toEqual({
      url: "https://api.example.com/mcp",
    });

    // Instruct tier landed in SETUP.md: worktree-trust note + user-machine
    // extensions warning — never written as project files.
    const setup = await read(root, "SETUP.md");
    expect(setup).toContain(TRUST_NOTE_CONTENT);
    expect(setup).toContain("USER machine");
    expect(setup).toContain("- toml");
    expect(await Bun.file(join(root, "zed:extensions")).exists()).toBe(false);

    const second = await emit(root);
    expect(second.conflicts).toEqual([]);
    expect(await read(root, ZED_SETTINGS_PATH)).toBe(text);
  });

  test("MERGE tier: hand-edited server preserved + reported; --accept-generated overwrites with backup", async () => {
    const root = makeRoot();
    await emit(root);

    // Hand-edit the docs server (swap the command).
    const text = await read(root, ZED_SETTINGS_PATH);
    const edited = text.replace('"bunx"', '"deno"');
    expect(edited).not.toBe(text);
    await Bun.write(join(root, ZED_SETTINGS_PATH), edited);

    const result = await emit(root);
    expect(await read(root, ZED_SETTINGS_PATH)).toBe(edited); // edit preserved
    const conflict = result.conflicts.find((c) => c.keyPath === "/context_servers/docs");
    expect(conflict?.reason).toBe("hand-edited");
    expect(conflict?.resolvingFlag).toBe(RESOLVING_FLAG);
    // The untouched server key stays clean.
    expect(result.conflicts.some((c) => c.keyPath === "/context_servers/api")).toBe(false);

    const accepted = await emit(root, true);
    expect(accepted.conflicts).toEqual([]);
    expect(accepted.backups.length).toBeGreaterThan(0);
    const finalText = await read(root, ZED_SETTINGS_PATH);
    const docs = readValueAt(finalText, ["context_servers", "docs"]).value as { command: string };
    expect(docs.command).toBe("bunx"); // whole-value override back to the IR value
  });

  test("JSONC honesty: hand-authored comments and foreign keys survive key-path surgery", async () => {
    const root = makeRoot();
    await mkdir(join(root, ".zed"), { recursive: true });
    const preExisting = [
      "{",
      "  // Hand-tuned formatter setup — patterson must not touch this.",
      '  "languages": { "Rust": { "format_on_save": "on" } }',
      "}",
      "",
    ].join("\n");
    await Bun.write(join(root, ZED_SETTINGS_PATH), preExisting);

    const result = await emit(root);
    expect(result.conflicts).toEqual([]);

    const text = await read(root, ZED_SETTINGS_PATH);
    expect(text).toContain("// Hand-tuned formatter setup — patterson must not touch this.");
    expect(readValueAt(text, ["languages", "Rust", "format_on_save"]).value).toBe("on");
    expect(readValueAt(text, ["context_servers", "docs"]).present).toBe(true);
  });

  test("hand-DELETION of an emitted key is drift: kept + reported with ABSENT_HASH; --accept-generated recreates", async () => {
    const root = makeRoot();
    await emit(root);

    // Hand-delete the whole api server entry.
    const text = await read(root, ZED_SETTINGS_PATH);
    const parsed = JSON.parse(text) as { context_servers: Record<string, unknown> };
    delete parsed.context_servers.api;
    await Bun.write(join(root, ZED_SETTINGS_PATH), `${JSON.stringify(parsed, null, 2)}\n`);

    const result = await emit(root);
    const conflict = result.conflicts.find((c) => c.keyPath === "/context_servers/api");
    expect(conflict?.currentHash).toBe(ABSENT_HASH);
    expect(readValueAt(await read(root, ZED_SETTINGS_PATH), ["context_servers", "api"]).present).toBe(
      false,
    ); // deletion kept

    await emit(root, true);
    expect(
      readValueAt(await read(root, ZED_SETTINGS_PATH), ["context_servers", "api"]).value,
    ).toEqual({ url: "https://api.example.com/mcp" });
  });
});
