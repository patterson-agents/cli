/**
 * T033 — Fixture suite for the vscode emitter.
 *
 * Shape per contracts/emitter.md: `test/fixtures/<case>/{ir.json, before/,
 * expected/ops.json, expected-gaps.json}` — golden comparison of compile
 * output (FileOps) + gap list. `before/` seeds the FsSnapshot the emitter
 * merges against. Regenerate goldens with tools/gen-goldens.ts (review the
 * diff — goldens exist to catch unintentional output changes).
 */
import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";

import {
  captureSnapshot,
  PattersonProjectSchema,
  type CoverageGap,
  type FileOp,
} from "@patterson/core";

import { compileVscode, snapshotPaths } from "../src/index.ts";

const FIXTURES_DIR = join(import.meta.dir, "fixtures");
const CASES = readdirSync(FIXTURES_DIR).toSorted();

const EXPECTED_CASES = [
  "extensions",
  "mcp-gaps",
  "mcp-inputs",
  "mcp-remote",
  "mcp-stdio",
  "minimal",
  "settings-no-deviations",
  "tasks",
  "tasks-biome",
];

test("the T033 case list is present", () => {
  expect(CASES).toEqual(EXPECTED_CASES);
});

describe("vscode emitter fixtures", () => {
  for (const name of CASES) {
    test(name, async () => {
      const dir = join(FIXTURES_DIR, name);
      const ir = PattersonProjectSchema.parse(await Bun.file(join(dir, "ir.json")).json());
      // `before/` (may not exist — captureSnapshot records misses as null).
      const snapshot = await captureSnapshot(join(dir, "before"), snapshotPaths(ir));

      const { ops, gaps } = compileVscode(ir, snapshot);
      const again = compileVscode(ir, snapshot);

      // Determinism: same IR + snapshot ⇒ byte-identical FileOps (obligation 1).
      expect(JSON.stringify(again.ops)).toBe(JSON.stringify(ops));
      expect(JSON.stringify(again.gaps)).toBe(JSON.stringify(gaps));

      const expectedOps = (await Bun.file(join(dir, "expected", "ops.json")).json()) as FileOp[];
      const expectedGaps = (await Bun.file(join(dir, "expected-gaps.json")).json()) as CoverageGap[];
      expect(ops).toEqual(expectedOps);
      expect(gaps).toEqual(expectedGaps);

      for (const op of ops) {
        // No absolute paths; everything lives under .vscode/ (obligation 1 +
        // tier honesty: all four surfaces are jsonc merge-tier key-path surgery).
        expect(op.path.startsWith("/")).toBe(false);
        expect(op.path.startsWith(".vscode/")).toBe(true);
        expect(op.mode).toBe("merge");
        expect(op.format).toBe("jsonc");
        expect(op.patch).toBeDefined();
        expect(JSON.stringify(op.patch)).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
      }

      // The T033 landmine: the mcp.json top-level key is `servers`, NOT
      // `mcpServers` (that is claude-code's spelling).
      const mcpOp = ops.find((op) => op.path === ".vscode/mcp.json");
      for (const entry of mcpOp?.patch ?? []) {
        expect(entry.keyPath[0]).not.toBe("mcpServers");
        expect(["servers", "inputs"]).toContain(entry.keyPath[0] as string);
      }

      // Every `${input:<id>}` reference in emitted server values must be
      // backed by a synthesized inputs[] entry with that id.
      if (mcpOp?.patch !== undefined) {
        const inputsEntry = mcpOp.patch.find((entry) => entry.keyPath[0] === "inputs");
        const ids = new Set(
          ((inputsEntry?.value as { id?: string }[] | undefined) ?? []).map((input) => input.id),
        );
        const serverJson = JSON.stringify(
          mcpOp.patch.filter((entry) => entry.keyPath[0] === "servers"),
        );
        for (const match of serverJson.matchAll(/\$\{input:([^}]+)\}/g)) {
          expect(ids.has(match[1] as string)).toBe(true);
        }
      }
    });
  }
});
