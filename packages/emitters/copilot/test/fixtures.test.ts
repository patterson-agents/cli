/**
 * T030 — Fixture suite for the copilot emitter.
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

import {
  CODING_AGENT_MCP_PATH,
  compileCopilot,
  COPILOT_INSTRUCTIONS_PATH,
  SETUP_STEPS_JOB_ID,
  SETUP_STEPS_PATH,
  snapshotPaths,
} from "../src/index.ts";

const FIXTURES_DIR = join(import.meta.dir, "fixtures");
const CASES = readdirSync(FIXTURES_DIR).toSorted();

const EXPECTED_CASES = [
  "agents-dir",
  "instructions-copy",
  "instructions-scoped",
  "mcp-coding-agent",
  "minimal",
  "prompts-dir",
  "setup-steps",
  "skills-copy",
];

test("the T030 case list is present", () => {
  expect(CASES).toEqual(EXPECTED_CASES);
});

describe("copilot emitter fixtures", () => {
  for (const name of CASES) {
    test(name, async () => {
      const dir = join(FIXTURES_DIR, name);
      const ir = PattersonProjectSchema.parse(await Bun.file(join(dir, "ir.json")).json());
      // `before/` (may not exist — captureSnapshot records misses as null).
      const snapshot = await captureSnapshot(join(dir, "before"), snapshotPaths(ir));

      const { ops, gaps } = compileCopilot(ir, snapshot);
      const again = compileCopilot(ir, snapshot);

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

      // Tier honesty spot-checks (obligation 2).
      for (const op of ops) {
        // copilot-instructions.md is a sentinel-merge surface, never own.
        if (op.path === COPILOT_INSTRUCTIONS_PATH) {
          expect(op.mode).toBe("merge");
          expect(op.sentinelId).toBeDefined();
        }
        // The coding-agent MCP surface is web-UI-only: instruct, ALWAYS.
        if (op.path === CODING_AGENT_MCP_PATH) expect(op.mode).toBe("instruct");
        if (op.mode === "own") expect(op.content).toBeDefined();
      }
      // No .github file op may ever be the coding-agent MCP config (C3).
      expect(ops.some((op) => op.path.includes("mcp") && op.path.startsWith(".github/"))).toBe(false);

      // Per-surface landmines (obligation 4).
      for (const op of ops) {
        // `.agent.md` era — never `.chatmode.md`; prompts never carry `mode:`.
        expect(op.path.endsWith(".chatmode.md")).toBe(false);
        if (op.path.startsWith(".github/prompts/")) {
          expect(op.content ?? "").not.toMatch(/^mode:/m);
        }
        // applyTo is a comma-separated STRING (never a YAML list).
        if (op.path.startsWith(".github/instructions/")) {
          expect(op.content ?? "").toMatch(/^applyTo: "[^[]*"$/m);
        }
        // Skills land as real copies, never symlink intents.
        if (op.path.startsWith(".github/skills/")) expect(op.linkMode).toBe("copy");
      }

      // copilot-setup-steps.yml: the job id is the required literal and the
      // emitted timeout never exceeds the 59-minute cap.
      const setupOp = ops.find((op) => op.path === SETUP_STEPS_PATH);
      if (setupOp !== undefined) {
        const content = setupOp.content ?? "";
        expect(content).toContain(`\n  ${SETUP_STEPS_JOB_ID}:\n`);
        for (const match of content.matchAll(/timeout-minutes: (\d+)/g)) {
          expect(Number(match[1])).toBeLessThanOrEqual(59);
        }
      }

      // Coding-agent blob: every server carries tools[]; secrets are
      // COPILOT_MCP_* only (no raw env interpolation syntax).
      const mcpOp = ops.find((op) => op.path === CODING_AGENT_MCP_PATH);
      if (mcpOp !== undefined) {
        const fence = /```json\n([\s\S]*?)\n```/.exec(mcpOp.content ?? "");
        expect(fence).not.toBeNull();
        const blob = JSON.parse(fence?.[1] ?? "{}") as {
          mcpServers: Record<string, { tools?: unknown }>;
        };
        for (const server of Object.values(blob.mcpServers)) {
          expect(Array.isArray(server.tools)).toBe(true);
          expect((server.tools as unknown[]).length).toBeGreaterThan(0);
        }
        expect(mcpOp.content ?? "").not.toContain("${");
      }
    });
  }
});
