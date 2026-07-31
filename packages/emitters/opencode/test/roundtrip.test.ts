/**
 * T031 — Round-trip drift tests for the opencode emitter: emit → hand-edit
 * each tier → re-emit ⇒ edit preserved + conflict reported;
 * `--accept-generated` overwrites (after backup). Plus the C12
 * hostile-co-writer proof: opencode's own injected `.opencode/` content
 * (package.json, node_modules) is never touched, and jsonc comments + foreign
 * keys survive config surgery.
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

import { compileOpencode, snapshotPaths } from "../src/index.ts";
import { checkAgainstSchema, type RootSchema } from "./mini-schema.ts";

const configSchema = (await Bun.file(
  join(import.meta.dir, "..", "schema", "config.schema.json"),
).json()) as RootSchema;

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "patterson-opencode-roundtrip-"));
  roots.push(root);
  return root;
}

const IR_INPUT: PattersonProjectInput = {
  version: 1,
  name: "roundtrip",
  targets: ["opencode"],
  instructions: [
    { id: "core", body: "Always run tests.", reach: "universal" },
    { id: "oc-only", body: "Opencode notes.", reach: "universal", targets: ["opencode"] },
  ],
  mcp: [
    {
      name: "docs",
      transport: { kind: "stdio", exec: { argv: ["bun", "run", "mcp.ts"] } },
      scope: "project",
    },
  ],
  commands: [{ name: "changelog", description: "Changelog.", template: "Changelog for $ARGUMENTS." }],
  skills: [
    { name: "deploy", description: "Deploy the app.", body: "Deploy steps.", linkMode: "symlink" },
  ],
};

const ir = PattersonProjectSchema.parse(IR_INPUT);
const irHash = computeIrHash(ir);

async function emit(root: string, acceptGenerated = false): Promise<ApplyResult> {
  const snapshot = await captureSnapshot(root, snapshotPaths(ir));
  const { ops } = compileOpencode(ir, snapshot);
  return applyFileOps(ops, { root, irHash, acceptGenerated });
}

const CONFIG_PATH = "opencode.json";
const OC_ONLY_PATH = ".agents/instructions/oc-only.md";

async function read(root: string, path: string): Promise<string> {
  return Bun.file(join(root, path)).text();
}

describe("round-trip drift (emit → hand-edit → re-emit)", () => {
  test("fresh emit applies cleanly, is idempotent, and is schema-valid", async () => {
    const root = makeRoot();
    const first = await emit(root);
    expect(first.conflicts).toEqual([]);
    expect(first.written).toContain(CONFIG_PATH);
    expect(first.written).toContain("AGENTS.md");
    expect(first.written).toContain(OC_ONLY_PATH);
    expect(first.written).toContain(".agents/skills/deploy/SKILL.md");

    const second = await emit(root);
    expect(second.conflicts).toEqual([]);

    const config = JSON.parse(await read(root, CONFIG_PATH)) as Record<string, unknown>;
    expect(config.$schema).toBe("https://opencode.ai/config.json");
    expect((config.skills as { paths: string[] }).paths).toContain(".agents/skills");
    expect(config.instructions).toEqual([OC_ONLY_PATH]);
    expect(checkAgainstSchema(config, configSchema, configSchema)).toEqual([]);
  });

  test("C12 hostile co-writer: injected .opencode/ content is never touched", async () => {
    const root = makeRoot();
    // opencode injects package.json + node_modules into .opencode/ on its own.
    await mkdir(join(root, ".opencode/node_modules/injected"), { recursive: true });
    await Bun.write(join(root, ".opencode/package.json"), '{"name":"opencode-workspace"}\n');
    await Bun.write(join(root, ".opencode/node_modules/injected/index.js"), "module.exports = 1;\n");

    const result = await emit(root);
    expect(result.conflicts).toEqual([]);
    for (const path of result.written) {
      expect(path.startsWith(".opencode/")).toBe(false);
    }
    // Byte-identical after the emit — patterson never co-writes that tree.
    expect(await read(root, ".opencode/package.json")).toBe('{"name":"opencode-workspace"}\n');
    expect(await read(root, ".opencode/node_modules/injected/index.js")).toBe("module.exports = 1;\n");
  });

  test("MERGE structured tier: hand edits preserved + reported; accept restores per merge semantics", async () => {
    const root = makeRoot();
    await emit(root);

    // Hand-edit: reshape the generated mcp server, add a hand-owned server,
    // and hand-extend skills.paths.
    const config = JSON.parse(await read(root, CONFIG_PATH)) as {
      mcp: Record<string, unknown>;
      skills: { paths: string[] };
    };
    config.mcp.docs = { type: "local", command: ["node", "other.js"] };
    config.mcp["hand-rolled"] = { type: "remote", url: "https://example.com/mcp" };
    config.skills.paths = ["vendor/skills", ".agents/skills"];
    const edited = `${JSON.stringify(config, null, 2)}\n`;
    await Bun.write(join(root, CONFIG_PATH), edited);

    const result = await emit(root);
    expect(await read(root, CONFIG_PATH)).toBe(edited); // edits preserved
    const pointers = result.conflicts.map((c) => c.keyPath);
    expect(pointers).toContain("/mcp/docs");
    expect(pointers).toContain("/skills/paths");
    expect(result.conflicts.every((c) => c.resolvingFlag === RESOLVING_FLAG)).toBe(true);

    const accepted = await emit(root, true);
    expect(accepted.conflicts).toEqual([]);
    expect(accepted.backups.length).toBeGreaterThan(0);
    const finalText = await read(root, CONFIG_PATH);
    // Whole-value override restores the generated server…
    expect(readValueAt(finalText, ["mcp", "docs"]).value).toEqual({
      type: "local",
      command: ["bun", "run", "mcp.ts"],
    });
    // …the hand-owned server is untouched (patterson never patched that key)…
    expect(readValueAt(finalText, ["mcp", "hand-rolled"]).value).toEqual({
      type: "remote",
      url: "https://example.com/mcp",
    });
    // …and concat-dedupe keeps the hand-added path while re-asserting the canonical one.
    expect(readValueAt(finalText, ["skills", "paths"]).value).toEqual([
      "vendor/skills",
      ".agents/skills",
    ]);
    expect(
      checkAgainstSchema(JSON.parse(finalText), configSchema, configSchema),
    ).toEqual([]);
  });

  test("MERGE markdown tier: AGENTS.md sentinel hand-edit preserved + reported; accept regenerates", async () => {
    const root = makeRoot();
    await emit(root);

    const doc = await read(root, "AGENTS.md");
    const tampered = doc.replace("Always run tests.", "Never run tests.");
    expect(tampered).not.toBe(doc);
    await Bun.write(join(root, "AGENTS.md"), tampered);

    const result = await emit(root);
    expect(await read(root, "AGENTS.md")).toBe(tampered); // edit preserved
    const conflict = result.conflicts.find((c) => c.sentinelId === "instruction:core");
    expect(conflict?.reason).toBe("hand-edited");

    await emit(root, true);
    expect(await read(root, "AGENTS.md")).toContain("Always run tests.");
  });

  test("OWN tier: hand-edited opencode-only instruction file preserved; accept overwrites with backup", async () => {
    const root = makeRoot();
    await emit(root);

    const edited = `${await read(root, OC_ONLY_PATH)}\nHand-added note.\n`;
    await Bun.write(join(root, OC_ONLY_PATH), edited);

    const result = await emit(root);
    expect(await read(root, OC_ONLY_PATH)).toBe(edited); // edit preserved
    const conflict = result.conflicts.find((c) => c.path === OC_ONLY_PATH);
    expect(conflict?.reason).toBe("hand-edited");
    expect(conflict?.resolvingFlag).toBe(RESOLVING_FLAG);

    const accepted = await emit(root, true);
    expect(accepted.conflicts.filter((c) => c.path === OC_ONLY_PATH)).toEqual([]);
    expect(accepted.backups.length).toBeGreaterThan(0);
    expect(await read(root, OC_ONLY_PATH)).not.toContain("Hand-added note.");
  });

  test("hand-DELETION is drift: kept + reported with ABSENT_HASH; --accept-generated recreates", async () => {
    const root = makeRoot();
    await emit(root);

    rmSync(join(root, OC_ONLY_PATH));

    const result = await emit(root);
    expect(await Bun.file(join(root, OC_ONLY_PATH)).exists()).toBe(false); // deletion kept
    const conflict = result.conflicts.find((c) => c.path === OC_ONLY_PATH);
    expect(conflict?.currentHash).toBe(ABSENT_HASH);

    await emit(root, true);
    expect(await read(root, OC_ONLY_PATH)).toContain("Opencode notes.");
  });

  test("an existing opencode.jsonc is patched in place — comments and foreign keys survive", async () => {
    const root = makeRoot();
    await Bun.write(
      join(root, "opencode.jsonc"),
      [
        "{",
        "  // hand-maintained config",
        '  "$schema": "https://opencode.ai/config.json",',
        '  "theme": "dark",',
        '  "skills": { "paths": ["vendor/skills"] }',
        "}",
        "",
      ].join("\n"),
    );

    // First emit: pre-existing hand-authored keys are UNRECORDED drift — the
    // engine keeps them and reports (Constitution II; adoption is init's job).
    // `$schema` matches the hand value byte-for-byte, so only skills.paths
    // (whose merged value differs from the hand value) conflicts.
    const result = await emit(root);
    expect(result.conflicts.map((c) => c.keyPath)).toEqual(["/skills/paths"]);
    expect(result.conflicts[0]?.reason).toBe("unrecorded");
    expect(result.written).toContain("opencode.jsonc");
    expect(result.written).not.toContain("opencode.json");
    expect(await Bun.file(join(root, "opencode.json")).exists()).toBe(false);

    let text = await read(root, "opencode.jsonc");
    expect(readValueAt(text, ["skills", "paths"]).value).toEqual(["vendor/skills"]); // kept

    // --accept-generated applies the concat-dedupe merge: the hand-added path
    // survives, the canonical path is appended.
    const accepted = await emit(root, true);
    expect(accepted.conflicts).toEqual([]);

    text = await read(root, "opencode.jsonc");
    expect(text).toContain("// hand-maintained config"); // comment preserved
    expect(readValueAt(text, ["theme"]).value).toBe("dark"); // foreign key preserved
    expect(readValueAt(text, ["skills", "paths"]).value).toEqual([
      "vendor/skills",
      ".agents/skills",
    ]);
    expect(readValueAt(text, ["mcp", "docs"]).value).toEqual({
      type: "local",
      command: ["bun", "run", "mcp.ts"],
    });
  });
});
