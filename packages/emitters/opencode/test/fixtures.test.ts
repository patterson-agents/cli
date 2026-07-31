/**
 * T031 — Fixture suite for the opencode emitter.
 *
 * Shape per contracts/emitter.md: `test/fixtures/<case>/{ir.json, before/,
 * expected/ops.json, expected-gaps.json}` — golden comparison of compile
 * output (FileOps) + gap list. `before/` seeds the FsSnapshot the emitter
 * merges against. Regenerate goldens with tools/gen-goldens.ts (review the
 * diff — goldens exist to catch unintentional output changes).
 *
 * Per-surface landmines asserted here (contracts/emitter.md obligation 4):
 * - `command: string[]` — argv VERBATIM, never argv[0]+rest (C1);
 * - `skills.paths` ALWAYS contains ".agents/skills" (S3/D7);
 * - `.opencode/` is hostile-co-writer territory: NO FileOp ever targets it,
 *   own-tier or otherwise (C12);
 * - `command.<name>.template` required (schema-locked);
 * - path-scoped instructions per emit.scopeFallback (C5).
 */
import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";

import {
  captureSnapshot,
  PattersonProjectSchema,
  type CoverageGap,
  type FileOp,
  type PattersonProjectInput,
} from "@patterson/core";

import { compileOpencode, snapshotPaths } from "../src/index.ts";
import { checkAgainstSchema, materializePatch, type RootSchema } from "./mini-schema.ts";

const FIXTURES_DIR = join(import.meta.dir, "fixtures");
const CASES = readdirSync(FIXTURES_DIR).toSorted();

const configSchema = (await Bun.file(
  join(import.meta.dir, "..", "schema", "config.schema.json"),
).json()) as RootSchema;

const EXPECTED_CASES = [
  "agents-commands",
  "instructions-shared",
  "jsonc-config",
  "mcp-local",
  "mcp-remote",
  "minimal",
  "permission-gaps",
  "permission-raw",
  "scope-drop",
  "scope-inline",
  "skills",
];

test("the T031 case list is present", () => {
  expect(CASES).toEqual(EXPECTED_CASES);
});

describe("opencode emitter fixtures", () => {
  for (const name of CASES) {
    test(name, async () => {
      const dir = join(FIXTURES_DIR, name);
      const ir = PattersonProjectSchema.parse(await Bun.file(join(dir, "ir.json")).json());
      // `before/` (may not exist — captureSnapshot records misses as null).
      const snapshot = await captureSnapshot(join(dir, "before"), snapshotPaths(ir));

      const { ops, gaps } = compileOpencode(ir, snapshot);
      const again = compileOpencode(ir, snapshot);

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

      // C12: nothing is EVER emitted inside the hostile-co-writer tree.
      for (const op of ops) {
        expect(op.path.startsWith(".opencode/")).toBe(false);
        expect(op.path).not.toBe(".opencode");
      }

      // Tier honesty spot-checks (obligation 2): the config file is merge-tier
      // key-path surgery; every own op carries content.
      for (const op of ops) {
        if (op.path === "opencode.json" || op.path === "opencode.jsonc") {
          expect(op.mode).toBe("merge");
          expect(op.patch).toBeDefined();
        }
        if (op.mode === "own") expect(op.content).toBeDefined();
      }

      // The config op is ALWAYS present with $schema + skills.paths ⊇
      // [".agents/skills"] (S3/D7).
      const configOp = ops.find((op) => op.path === "opencode.json" || op.path === "opencode.jsonc");
      expect(configOp?.patch).toBeDefined();
      if (configOp?.patch !== undefined) {
        const config = materializePatch(configOp.patch);
        expect(config.$schema).toBe("https://opencode.ai/config.json");
        const skills = config.skills as { paths: string[] };
        expect(skills.paths).toContain(".agents/skills");

        // C1: every local MCP server carries argv VERBATIM as `command`.
        const mcp = (config.mcp ?? {}) as Record<string, { type: string; command?: unknown }>;
        for (const server of Object.values(mcp)) {
          if (server.type === "local") expect(Array.isArray(server.command)).toBe(true);
        }
        // Schema-locked: every emitted command has a template.
        const commands = (config.command ?? {}) as Record<string, { template?: unknown }>;
        for (const command of Object.values(commands)) {
          expect(typeof command.template).toBe("string");
          expect(command.template).not.toBe("");
        }

        // Whatever config is emitted must validate against the vendored schema.
        expect(checkAgainstSchema(config, configSchema, configSchema)).toEqual([]);
      }
    });
  }
});

test('emit.scopeFallback "error" makes a path-scoped block a hard error (C5)', async () => {
  const ir = PattersonProjectSchema.parse({
    version: 1,
    name: "scope-error",
    targets: ["opencode"],
    instructions: [
      {
        id: "ts-rules",
        body: "Use strict TypeScript.",
        reach: "path-scoped",
        scope: { globs: ["src/**/*.ts"] },
      },
    ],
    emit: { scopeFallback: "error" },
  } satisfies PattersonProjectInput);
  const snapshot = await captureSnapshot("/nonexistent", snapshotPaths(ir));
  expect(() => compileOpencode(ir, snapshot)).toThrow(/scopeFallback is "error"/);
});
