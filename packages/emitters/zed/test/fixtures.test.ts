/**
 * T032 — Fixture suite for the zed emitter.
 *
 * Shape per contracts/emitter.md: `test/fixtures/<case>/{ir.json, before/,
 * expected/ops.json, expected-gaps.json}` — golden comparison of compile
 * output (FileOps) + gap list. Regenerate goldens with tools/gen-goldens.ts
 * (review the diff — goldens exist to catch unintentional output changes).
 *
 * Zed-specific invariants asserted for every case:
 * - C7: the emitter never writes any file on Zed's first-match instructions
 *   chain (it only DECLARES the expected winner, AGENTS.md);
 * - S6 whitelist: every `.zed/settings.json` key path is project-scope-valid
 *   (never `theme`, `vim_mode`, or any other global-only key);
 * - C2: emitted context servers carry no `type` discriminator — `command`
 *   presence means stdio, `url` presence means remote, never both/neither.
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

import {
  assertZedProjectKeyPath,
  compileZed,
  snapshotPaths,
  ZED_EXPECTED_INSTRUCTIONS_FILE,
  ZED_SETTINGS_PATH,
} from "../src/index.ts";

const FIXTURES_DIR = join(import.meta.dir, "fixtures");
const CASES = readdirSync(FIXTURES_DIR).toSorted();

const EXPECTED_CASES = [
  "extensions",
  "instructions-chain",
  "mcp-remote",
  "mcp-scopes",
  "mcp-stdio",
  "minimal",
  "unreachable",
];

/** Zed's full first-match chain (C7) — paths this emitter must never target. */
const ZED_CHAIN_FILES = [
  ".rules",
  ".cursorrules",
  ".windsurfrules",
  ".clinerules",
  ".github/copilot-instructions.md",
  "AGENT.md",
  "AGENTS.md",
  "CLAUDE.md",
];

test("the T032 case list is present", () => {
  expect(CASES).toEqual(EXPECTED_CASES);
});

test("the emitter declares AGENTS.md as the expected chain winner (C7)", () => {
  expect(ZED_EXPECTED_INSTRUCTIONS_FILE).toBe("AGENTS.md");
  expect(ZED_CHAIN_FILES).toContain(ZED_EXPECTED_INSTRUCTIONS_FILE);
});

test("global-only keys are contract violations, not emittable (S6 whitelist)", () => {
  expect(() => assertZedProjectKeyPath(["theme"])).toThrow(/not project-scope-valid/);
  expect(() => assertZedProjectKeyPath(["vim_mode"])).toThrow(/not project-scope-valid/);
  expect(() => assertZedProjectKeyPath(["telemetry", "metrics"])).toThrow(/not project-scope-valid/);
  // Bare context_servers (no server name) is also refused — surgery is per-server.
  expect(() => assertZedProjectKeyPath(["context_servers"])).toThrow(/not project-scope-valid/);
  expect(() => assertZedProjectKeyPath(["context_servers", "docs"])).not.toThrow();
  expect(() => assertZedProjectKeyPath(["context_server_timeout"])).not.toThrow();
});

describe("zed emitter fixtures", () => {
  for (const name of CASES) {
    test(name, async () => {
      const dir = join(FIXTURES_DIR, name);
      const ir = PattersonProjectSchema.parse(await Bun.file(join(dir, "ir.json")).json());
      // `before/` (may not exist — captureSnapshot records misses as null).
      const snapshot = await captureSnapshot(join(dir, "before"), snapshotPaths(ir));

      const { ops, gaps } = compileZed(ir, snapshot);
      const again = compileZed(ir, snapshot);

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

      for (const op of ops) {
        // C7: never write any file on Zed's first-match instructions chain.
        expect(ZED_CHAIN_FILES).not.toContain(op.path);

        // Tier honesty (obligation 2): the only writable surface is the
        // merge-tier .zed/settings.json; everything else is instruct.
        if (op.mode !== "instruct") {
          expect(op.path).toBe(ZED_SETTINGS_PATH);
          expect(op.mode).toBe("merge");
          expect(op.patch).toBeDefined();
        } else {
          expect(op.content).toBeDefined();
        }

        // S6 whitelist + C2 shape for every settings patch entry.
        for (const entry of op.patch ?? []) {
          assertZedProjectKeyPath(entry.keyPath);
          const server = entry.value as Record<string, unknown>;
          expect(server.type).toBeUndefined(); // C2: no discriminator
          const hasCommand = typeof server.command === "string";
          const hasUrl = typeof server.url === "string";
          expect(hasCommand !== hasUrl).toBe(true); // exactly one of command|url
        }
      }

      // Every gap names this target.
      for (const g of gaps) expect(g.targetId).toBe("zed");
    });
  }
});
