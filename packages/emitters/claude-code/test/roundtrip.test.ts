/**
 * T023 — Round-trip drift tests: emit → hand-edit each tier → re-emit ⇒
 * edit preserved + conflict reported; `--accept-generated` overwrites (after
 * backup). Also: hand-DELETION is drift (ABSENT_HASH marker), and emitted
 * settings validate against the vendored schema after every accepted apply.
 *
 * The engine (applyFileOps) owns drift mechanics; these tests prove the
 * emitter's FileOps ride them correctly end to end.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { lstat, mkdir, readlink } from "node:fs/promises";
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

import { compileClaudeCode, snapshotPaths } from "../src/index.ts";
import { checkAgainstSchema, type RootSchema } from "./mini-schema.ts";

const settingsSchema = (await Bun.file(
  join(import.meta.dir, "..", "schema", "settings.schema.json"),
).json()) as RootSchema;

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "patterson-claude-roundtrip-"));
  roots.push(root);
  return root;
}

const IR_INPUT: PattersonProjectInput = {
  version: 1,
  name: "roundtrip",
  targets: ["claude-code"],
  instructions: [
    { id: "core", body: "Always run tests.", reach: "universal" },
    { id: "tail", body: "Claude tail.", reach: "universal", targets: ["claude-code"] },
  ],
  policy: { allow: ["Read", "Bash(bun test:*)"], deny: [], ask: [], defaultMode: "acceptEdits" },
  agents: [
    { name: "reviewer", description: "Reviews code.", prompt: "Be strict." },
  ],
};

const ir = PattersonProjectSchema.parse(IR_INPUT);
const irHash = computeIrHash(ir);

async function emit(root: string, acceptGenerated = false): Promise<ApplyResult> {
  const snapshot = await captureSnapshot(root, snapshotPaths(ir));
  const { ops } = compileClaudeCode(ir, snapshot);
  return applyFileOps(ops, { root, irHash, acceptGenerated });
}

const AGENT_PATH = ".claude/agents/reviewer.md";
const SETTINGS_PATH = ".claude/settings.json";

async function read(root: string, path: string): Promise<string> {
  return Bun.file(join(root, path)).text();
}

describe("round-trip drift (emit → hand-edit → re-emit)", () => {
  test("fresh emit applies cleanly and is idempotent", async () => {
    const root = makeRoot();
    const first = await emit(root);
    expect(first.conflicts).toEqual([]);
    expect(first.written).toContain(AGENT_PATH);
    expect(first.written).toContain("AGENTS.md");
    expect(first.written).toContain("CLAUDE.md");
    expect(first.written).toContain(SETTINGS_PATH);

    const second = await emit(root);
    expect(second.conflicts).toEqual([]);

    const settings = JSON.parse(await read(root, SETTINGS_PATH)) as unknown;
    expect(checkAgainstSchema(settings, settingsSchema, settingsSchema)).toEqual([]);
  });

  test("OWN tier: hand-edit preserved + conflict reported; --accept-generated overwrites with backup", async () => {
    const root = makeRoot();
    await emit(root);

    const edited = `${await read(root, AGENT_PATH)}\nHand-added note.\n`;
    await Bun.write(join(root, AGENT_PATH), edited);

    const result = await emit(root);
    expect(await read(root, AGENT_PATH)).toBe(edited); // edit preserved
    const conflict = result.conflicts.find((c) => c.path === AGENT_PATH);
    expect(conflict?.reason).toBe("hand-edited");
    expect(conflict?.resolvingFlag).toBe(RESOLVING_FLAG);

    const accepted = await emit(root, true);
    expect(accepted.conflicts.filter((c) => c.path === AGENT_PATH)).toEqual([]);
    expect(accepted.backups.length).toBeGreaterThan(0);
    expect(await read(root, AGENT_PATH)).not.toContain("Hand-added note.");
  });

  test("MERGE markdown tier: sentinel hand-edit preserved + reported; accepted overwrite regenerates", async () => {
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

  test("MERGE structured tier: hand-edited settings preserved + reported; accept merges arrays per C8", async () => {
    const root = makeRoot();
    await emit(root);

    // Hand-edit: add an allow entry, remove an IR entry, flip defaultMode.
    const settings = JSON.parse(await read(root, SETTINGS_PATH)) as {
      permissions: { allow: string[]; defaultMode: string };
    };
    settings.permissions.allow = ["Bash(git status)", "Read"]; // dropped "Bash(bun test:*)", added git status
    settings.permissions.defaultMode = "plan";
    const edited = `${JSON.stringify(settings, null, 2)}\n`;
    await Bun.write(join(root, SETTINGS_PATH), edited);

    const result = await emit(root);
    expect(await read(root, SETTINGS_PATH)).toBe(edited); // edits preserved
    const pointers = result.conflicts.map((c) => c.keyPath);
    expect(pointers).toContain("/permissions/allow");
    expect(pointers).toContain("/permissions/defaultMode");

    const accepted = await emit(root, true);
    expect(accepted.conflicts).toEqual([]);
    const finalText = await read(root, SETTINGS_PATH);
    const allow = readValueAt(finalText, ["permissions", "allow"]).value as string[];
    // C8 concat+dedupe: the hand-added entry survives, the removed IR entry returns.
    expect(allow).toEqual(["Bash(git status)", "Read", "Bash(bun test:*)"]);
    // Scalar override: defaultMode returns to the IR value.
    expect(readValueAt(finalText, ["permissions", "defaultMode"]).value).toBe("acceptEdits");
    // Still schema-valid after the accepted merge.
    expect(
      checkAgainstSchema(JSON.parse(finalText), settingsSchema, settingsSchema),
    ).toEqual([]);
  });

  test("symlink-mode skill: the engine materializes a real symlink at .claude/skills/<name>", async () => {
    const skillIr = PattersonProjectSchema.parse({
      version: 1,
      name: "symlink-roundtrip",
      targets: ["claude-code"],
      skills: [
        {
          name: "myskill",
          description: "A symlink-mode skill.",
          body: "Do the thing.",
          linkMode: "symlink",
        },
      ],
    } satisfies PattersonProjectInput);
    const skillIrHash = computeIrHash(skillIr);
    const emitSkill = async (root: string, acceptGenerated = false): Promise<ApplyResult> => {
      const snapshot = await captureSnapshot(root, snapshotPaths(skillIr));
      const { ops } = compileClaudeCode(skillIr, snapshot);
      return applyFileOps(ops, { root, irHash: skillIrHash, acceptGenerated });
    };

    const root = makeRoot();
    const first = await emitSkill(root);
    expect(first.conflicts).toEqual([]);
    expect(first.written).toContain(".claude/skills/myskill");

    // S3: the .claude/skills link is MANDATORY — and it must be a real
    // symlink, not a text file containing the target path.
    const linkAbs = join(root, ".claude/skills/myskill");
    expect((await lstat(linkAbs)).isSymbolicLink()).toBe(true);
    expect(await readlink(linkAbs)).toBe("../../.agents/skills/myskill");
    // The link resolves to the canonical SKILL.md.
    expect(await read(root, ".claude/skills/myskill/SKILL.md")).toContain("name: myskill");

    // Idempotent re-emit; link untouched.
    const second = await emitSkill(root);
    expect(second.conflicts).toEqual([]);
    expect((await lstat(linkAbs)).isSymbolicLink()).toBe(true);
  });

  test("symlink-mode skill: a pre-existing foreign directory at the link path is refused, not overwritten", async () => {
    const skillIr = PattersonProjectSchema.parse({
      version: 1,
      name: "symlink-occupied",
      targets: ["claude-code"],
      skills: [
        {
          name: "occupied",
          description: "Collides with a hand-authored dir.",
          body: "Body.",
          linkMode: "symlink",
        },
      ],
    } satisfies PattersonProjectInput);
    const skillIrHash = computeIrHash(skillIr);
    const emitSkill = async (root: string, acceptGenerated = false): Promise<ApplyResult> => {
      const snapshot = await captureSnapshot(root, snapshotPaths(skillIr));
      const { ops } = compileClaudeCode(skillIr, snapshot);
      return applyFileOps(ops, { root, irHash: skillIrHash, acceptGenerated });
    };

    const root = makeRoot();
    const dirAbs = join(root, ".claude/skills/occupied");
    await mkdir(dirAbs, { recursive: true });
    await Bun.write(join(dirAbs, "SKILL.md"), "# hand-authored skill\n");

    const result = await emitSkill(root);
    const conflict = result.conflicts.find((c) => c.path === ".claude/skills/occupied");
    expect(conflict).toBeDefined();
    expect(conflict?.reason).toBe("unrecorded");
    // The hand-authored directory is intact — never replaced by a link.
    expect((await lstat(dirAbs)).isDirectory()).toBe(true);
    expect(await read(root, ".claude/skills/occupied/SKILL.md")).toBe("# hand-authored skill\n");

    // Even --accept-generated refuses to destroy a directory.
    const accepted = await emitSkill(root, true);
    expect(accepted.conflicts.find((c) => c.path === ".claude/skills/occupied")).toBeDefined();
    expect((await lstat(dirAbs)).isDirectory()).toBe(true);
  });

  test("hand-DELETION is drift: kept + reported with ABSENT_HASH; --accept-generated recreates", async () => {
    const root = makeRoot();
    await emit(root);

    rmSync(join(root, "CLAUDE.md"));

    const result = await emit(root);
    expect(await Bun.file(join(root, "CLAUDE.md")).exists()).toBe(false); // deletion kept
    const conflict = result.conflicts.find((c) => c.path === "CLAUDE.md");
    expect(conflict?.currentHash).toBe(ABSENT_HASH);

    await emit(root, true);
    expect(await Bun.file(join(root, "CLAUDE.md")).exists()).toBe(true);
    expect(await read(root, "CLAUDE.md")).toContain("@AGENTS.md");
  });
});
