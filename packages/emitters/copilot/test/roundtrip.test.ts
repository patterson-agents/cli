/**
 * T030 — Round-trip drift tests for the copilot emitter: emit → hand-edit each
 * tier → re-emit ⇒ edit preserved + conflict reported; `--accept-generated`
 * overwrites (after backup). Also: hand-DELETION is drift (ABSENT_HASH
 * marker), and the instruct-tier coding-agent MCP blob lands in SETUP.md, not
 * in a repo config file.
 *
 * The engine (applyFileOps) owns drift mechanics; these tests prove the
 * emitter's FileOps ride them correctly end to end.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  ABSENT_HASH,
  applyFileOps,
  captureSnapshot,
  computeIrHash,
  PattersonProjectSchema,
  RESOLVING_FLAG,
  type ApplyResult,
  type PattersonProjectInput,
} from "@patterson/core";

import { compileCopilot, snapshotPaths } from "../src/index.ts";

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "patterson-copilot-roundtrip-"));
  roots.push(root);
  return root;
}

const IR_INPUT: PattersonProjectInput = {
  version: 1,
  name: "roundtrip",
  targets: ["copilot"],
  instructions: [
    { id: "core", body: "Always run tests.", reach: "universal" },
    {
      id: "frontend",
      body: "Use functional components.",
      reach: "path-scoped",
      scope: { globs: ["src/**/*.tsx"] },
    },
  ],
  agents: [{ name: "reviewer", description: "Reviews code.", prompt: "Be strict." }],
  mcp: [
    {
      name: "sentry",
      transport: {
        kind: "stdio",
        exec: {
          argv: ["bunx", "@sentry/mcp-server@1.2.3"],
          env: { SENTRY_AUTH_TOKEN: { kind: "env", name: "SENTRY_AUTH_TOKEN" } },
        },
      },
      tools: ["list_issues"],
      scope: "project",
    },
  ],
};

const ir = PattersonProjectSchema.parse(IR_INPUT);
const irHash = computeIrHash(ir);

async function emit(root: string, acceptGenerated = false): Promise<ApplyResult> {
  const snapshot = await captureSnapshot(root, snapshotPaths(ir));
  const { ops } = compileCopilot(ir, snapshot);
  return applyFileOps(ops, { root, irHash, acceptGenerated });
}

const AGENT_PATH = ".github/agents/reviewer.agent.md";
const INSTRUCTIONS_PATH = ".github/copilot-instructions.md";
const SCOPED_PATH = ".github/instructions/frontend.instructions.md";

async function read(root: string, path: string): Promise<string> {
  return Bun.file(join(root, path)).text();
}

describe("round-trip drift (emit → hand-edit → re-emit)", () => {
  test("fresh emit applies cleanly and is idempotent", async () => {
    const root = makeRoot();
    const first = await emit(root);
    expect(first.conflicts).toEqual([]);
    expect(first.written).toContain(AGENT_PATH);
    expect(first.written).toContain(INSTRUCTIONS_PATH);
    expect(first.written).toContain(SCOPED_PATH);

    const second = await emit(root);
    expect(second.conflicts).toEqual([]);
  });

  test("instruct tier: the coding-agent MCP blob renders into SETUP.md and never becomes a repo config file", async () => {
    const root = makeRoot();
    const result = await emit(root);
    expect(result.setupPath).toBe("SETUP.md");

    const setup = await read(root, "SETUP.md");
    expect(setup).toContain("copilot-coding-agent/mcp-configuration");
    expect(setup).toContain('"type": "local"');
    // tools[] present; the env secret is renamed to a COPILOT_MCP_* secret.
    expect(setup).toContain('"tools"');
    expect(setup).toContain("COPILOT_MCP_SENTRY_AUTH_TOKEN");

    // The web-UI-only surface must not exist as a file anywhere.
    expect(result.written.some((path) => path.includes("mcp") && path !== "SETUP.md")).toBe(false);
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

  test("MERGE tier: sentinel hand-edit in copilot-instructions.md preserved + reported; accepted overwrite regenerates", async () => {
    const root = makeRoot();
    await emit(root);

    const doc = await read(root, INSTRUCTIONS_PATH);
    const tampered = doc.replace("Always run tests.", "Never run tests.");
    expect(tampered).not.toBe(doc);
    await Bun.write(join(root, INSTRUCTIONS_PATH), tampered);

    const result = await emit(root);
    expect(await read(root, INSTRUCTIONS_PATH)).toBe(tampered); // edit preserved
    const conflict = result.conflicts.find((c) => c.sentinelId === "instruction:core");
    expect(conflict?.reason).toBe("hand-edited");

    await emit(root, true);
    expect(await read(root, INSTRUCTIONS_PATH)).toContain("Always run tests.");
  });

  test("MERGE tier: hand-authored content OUTSIDE the sentinel region survives re-emit untouched", async () => {
    const root = makeRoot();
    await emit(root);

    const doc = await read(root, INSTRUCTIONS_PATH);
    const withPreamble = `# Team conventions\n\nHand-written preamble.\n\n${doc}`;
    await Bun.write(join(root, INSTRUCTIONS_PATH), withPreamble);

    const result = await emit(root);
    expect(result.conflicts).toEqual([]); // region content untouched → no drift
    const after = await read(root, INSTRUCTIONS_PATH);
    expect(after).toContain("Hand-written preamble.");
    expect(after).toContain("Always run tests.");
  });

  test("hand-DELETION is drift: kept + reported with ABSENT_HASH; --accept-generated recreates", async () => {
    const root = makeRoot();
    await emit(root);

    rmSync(join(root, SCOPED_PATH));

    const result = await emit(root);
    expect(await Bun.file(join(root, SCOPED_PATH)).exists()).toBe(false); // deletion kept
    const conflict = result.conflicts.find((c) => c.path === SCOPED_PATH);
    expect(conflict?.currentHash).toBe(ABSENT_HASH);

    await emit(root, true);
    expect(await Bun.file(join(root, SCOPED_PATH)).exists()).toBe(true);
    expect(await read(root, SCOPED_PATH)).toContain('applyTo: "src/**/*.tsx"');
  });

  test("copy-mode skill link: SKILL.md is materialized as a real file under .github/skills/", async () => {
    const skillIr = PattersonProjectSchema.parse({
      version: 1,
      name: "skill-roundtrip",
      targets: ["copilot"],
      skills: [
        {
          name: "myskill",
          description: "A copilot skill.",
          body: "Do the thing.",
          linkMode: "symlink",
        },
      ],
    } satisfies PattersonProjectInput);
    const skillIrHash = computeIrHash(skillIr);

    const root = makeRoot();
    const snapshot = await captureSnapshot(root, snapshotPaths(skillIr));
    const { ops } = compileCopilot(skillIr, snapshot);
    const result = await applyFileOps(ops, { root, irHash: skillIrHash });
    expect(result.conflicts).toEqual([]);

    // D7: copilot ALWAYS copies (even when the IR linkMode is "symlink").
    expect(result.written).toContain(".github/skills/myskill/SKILL.md");
    expect(await read(root, ".github/skills/myskill/SKILL.md")).toContain("name: myskill");
    expect(await read(root, ".agents/skills/myskill/SKILL.md")).toContain("name: myskill");
  });
});
