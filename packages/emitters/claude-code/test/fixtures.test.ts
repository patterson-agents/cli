/**
 * T021 — Fixture suite for the claude-code emitter.
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

import { compileClaudeCode, snapshotPaths } from "../src/index.ts";
import { checkAgainstSchema, materializePatch, type RootSchema } from "./mini-schema.ts";

const FIXTURES_DIR = join(import.meta.dir, "fixtures");
const CASES = readdirSync(FIXTURES_DIR).toSorted();

const settingsSchema = (await Bun.file(
  join(import.meta.dir, "..", "schema", "settings.schema.json"),
).json()) as RootSchema;

const EXPECTED_CASES = [
  "agents-dir",
  "commands-as-skills",
  "instructions-shim",
  "mcp-remote",
  "mcp-stdio",
  "minimal",
  "permissions",
  "rules",
  "skills-copy",
  "skills-symlink",
];

test("the T021 case list is present", () => {
  expect(CASES).toEqual(EXPECTED_CASES);
});

describe("claude-code emitter fixtures", () => {
  for (const name of CASES) {
    test(name, async () => {
      const dir = join(FIXTURES_DIR, name);
      const ir = PattersonProjectSchema.parse(await Bun.file(join(dir, "ir.json")).json());
      // `before/` (may not exist — captureSnapshot records misses as null).
      const snapshot = await captureSnapshot(join(dir, "before"), snapshotPaths(ir));

      const { ops, gaps } = compileClaudeCode(ir, snapshot);
      const again = compileClaudeCode(ir, snapshot);

      // Determinism: same IR + snapshot ⇒ byte-identical FileOps (obligation 1).
      expect(JSON.stringify(again.ops)).toBe(JSON.stringify(ops));
      expect(JSON.stringify(again.gaps)).toBe(JSON.stringify(gaps));

      const expectedOps = (await Bun.file(join(dir, "expected", "ops.json")).json()) as FileOp[];
      const expectedGaps = (await Bun.file(join(dir, "expected-gaps.json")).json()) as CoverageGap[];
      expect(ops).toEqual(expectedOps);
      expect(gaps).toEqual(expectedGaps);

      // No timestamps / absolute paths in emitted content (obligation 1).
      for (const op of ops) {
        expect(op.path.startsWith("/")).toBe(false);
        expect(op.content ?? "").not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
      }

      // Tier honesty spot-checks (obligation 2): settings and .mcp.json are
      // merge-tier surgery; every own op carries content.
      for (const op of ops) {
        if (op.path === ".claude/settings.json" || op.path === ".mcp.json") {
          expect(op.mode).toBe("merge");
          expect(op.patch).toBeDefined();
        }
        if (op.mode === "own") expect(op.content).toBeDefined();
      }

      // Whatever settings are emitted must validate against the vendored schema.
      const settingsOp = ops.find((op) => op.path === ".claude/settings.json");
      if (settingsOp?.patch !== undefined) {
        const settings = materializePatch(settingsOp.patch);
        expect(checkAgainstSchema(settings, settingsSchema, settingsSchema)).toEqual([]);
      }
    });
  }
});
