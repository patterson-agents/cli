/**
 * T031 — AGENTS.md shared-sentinel coordination proof.
 *
 * The claude-code and opencode emitters both project universal instruction
 * blocks into AGENTS.md. They coordinate purely through the core sentinel
 * API: SAME sentinel id (`instruction:<id>`), SAME region content — so a
 * multi-target project produces ONE managed region per block, never two,
 * regardless of which emitter applies first.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  applyFileOps,
  captureSnapshot,
  computeIrHash,
  findSentinel,
  PattersonProjectSchema,
  type FileOp,
  type PattersonProjectInput,
} from "@patterson/core";
import {
  compileClaudeCode,
  snapshotPaths as claudeSnapshotPaths,
} from "@patterson/emitter-claude-code";

import { compileOpencode, snapshotPaths as opencodeSnapshotPaths } from "../src/index.ts";

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "patterson-shared-sentinel-"));
  roots.push(root);
  return root;
}

const ir = PattersonProjectSchema.parse({
  version: 1,
  name: "shared-sentinel",
  targets: ["claude-code", "opencode"],
  instructions: [
    { id: "core", body: "Always run tests.\n", reach: "universal" },
    {
      id: "both",
      body: "Applies to claude-code AND opencode.",
      reach: "universal",
      targets: ["claude-code", "opencode"],
    },
  ],
} satisfies PattersonProjectInput);
const irHash = computeIrHash(ir);

function agentsOps(ops: FileOp[]): FileOp[] {
  return ops.filter((op) => op.path === "AGENTS.md");
}

async function compileBoth(root: string): Promise<{ claude: FileOp[]; opencode: FileOp[] }> {
  const claudeSnapshot = await captureSnapshot(root, claudeSnapshotPaths(ir));
  const opencodeSnapshot = await captureSnapshot(root, opencodeSnapshotPaths(ir));
  return {
    claude: compileClaudeCode(ir, claudeSnapshot).ops,
    opencode: compileOpencode(ir, opencodeSnapshot).ops,
  };
}

function countRegions(doc: string, sentinelId: string): number {
  const marker = `<!-- patterson:begin id=${sentinelId} `;
  return doc.split(marker).length - 1;
}

describe("AGENTS.md shared sentinel (claude-code + opencode)", () => {
  test("both emitters produce byte-identical AGENTS.md sentinel ops", async () => {
    const { claude, opencode } = await compileBoth(makeRoot());
    expect(agentsOps(opencode)).toEqual(agentsOps(claude));
    expect(agentsOps(claude).map((op) => op.sentinelId)).toEqual([
      "instruction:core",
      "instruction:both",
    ]);
  });

  test("claude-code then opencode: ONE region per block, no conflicts", async () => {
    const root = makeRoot();
    const { claude, opencode } = await compileBoth(root);

    const first = await applyFileOps(claude, { root, irHash });
    expect(first.conflicts).toEqual([]);
    const second = await applyFileOps(opencode, { root, irHash });
    expect(second.conflicts).toEqual([]);

    const doc = await Bun.file(join(root, "AGENTS.md")).text();
    expect(countRegions(doc, "instruction:core")).toBe(1);
    expect(countRegions(doc, "instruction:both")).toBe(1);
    expect(findSentinel(doc, "instruction:core")?.content).toBe("Always run tests.");
  });

  test("opencode then claude-code: same single region either way", async () => {
    const root = makeRoot();
    const { claude, opencode } = await compileBoth(root);

    const first = await applyFileOps(opencode, { root, irHash });
    expect(first.conflicts).toEqual([]);
    const second = await applyFileOps(claude, { root, irHash });
    expect(second.conflicts).toEqual([]);

    const doc = await Bun.file(join(root, "AGENTS.md")).text();
    expect(countRegions(doc, "instruction:core")).toBe(1);
    expect(countRegions(doc, "instruction:both")).toBe(1);
    // The whole document contains exactly two managed regions in total.
    expect(doc.split("<!-- patterson:begin ").length - 1).toBe(2);
  });

  test("re-running both emitters against the emitted tree stays idempotent", async () => {
    const root = makeRoot();
    const initial = await compileBoth(root);
    await applyFileOps(initial.claude, { root, irHash });
    await applyFileOps(initial.opencode, { root, irHash });
    const before = await Bun.file(join(root, "AGENTS.md")).text();

    const again = await compileBoth(root);
    const claudeResult = await applyFileOps(again.claude, { root, irHash });
    const opencodeResult = await applyFileOps(again.opencode, { root, irHash });
    expect(claudeResult.conflicts).toEqual([]);
    expect(opencodeResult.conflicts).toEqual([]);
    expect(await Bun.file(join(root, "AGENTS.md")).text()).toBe(before);
  });
});
