/**
 * T034 — C7 chain guard fixture tests.
 *
 * Shape mirrors the claude-code emitter suite: `test/fixtures/<case>/` holds
 * an `ir.json` plus a `root/` directory that plays the REAL project disk the
 * guard scans (including files patterson never wrote — the pre-existing
 * `.cursorrules` case the task mandates).
 */
import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";

import { CheckRegistry, PattersonProjectSchema, type CheckCtx, type Finding } from "@patterson/core";

import {
  AGENTS_MD,
  instructionSentinelId,
  scanZedChain,
  ZED_CHAIN,
  ZED_CHAIN_CHECK_ID,
  zedChainGuardCheck,
  zedReachingBlocks,
} from "../src/index.ts";

const FIXTURES_DIR = join(import.meta.dir, "fixtures");

async function runFixture(name: string): Promise<{ ctx: CheckCtx; findings: Finding[] }> {
  const dir = join(FIXTURES_DIR, name);
  const ir = PattersonProjectSchema.parse(await Bun.file(join(dir, "ir.json")).json());
  const ctx: CheckCtx = { cwd: join(dir, "root"), ir };
  const findings = await zedChainGuardCheck.run(ctx);
  return { ctx, findings };
}

test("fixture case list is present", () => {
  expect(readdirSync(FIXTURES_DIR).toSorted()).toEqual([
    "agents-missing-region",
    "agents-ok",
    "cursorrules-preexisting",
    "folded-winner",
    "no-chain-file",
    "not-zed-targeted",
  ]);
});

test("the chain order is the verified Zed first-match order (D6/C7)", () => {
  expect([...ZED_CHAIN]).toEqual([
    ".rules",
    ".cursorrules",
    ".windsurfrules",
    ".clinerules",
    ".github/copilot-instructions.md",
    "AGENT.md",
    "AGENTS.md",
    "CLAUDE.md",
  ]);
});

describe("scanZedChain", () => {
  test("first match wins; presence is reported in chain order", async () => {
    const scan = await scanZedChain(join(FIXTURES_DIR, "cursorrules-preexisting", "root"));
    expect(scan.winner).toBe(".cursorrules");
    expect(scan.present).toEqual([".cursorrules", "AGENTS.md"]);
    expect(scan.winnerContent).toContain("Use tabs for indentation.");
  });

  test("empty root yields no winner", async () => {
    const scan = await scanZedChain(join(FIXTURES_DIR, "no-chain-file", "root"));
    expect(scan.winner).toBeNull();
    expect(scan.present).toEqual([]);
    expect(scan.winnerContent).toBe("");
  });
});

describe("C7 chain guard", () => {
  test("pre-existing .cursorrules shadows AGENTS.md: winner + unreachable blocks + fix options", async () => {
    const { findings } = await runFixture("cursorrules-preexisting");

    // Summary finding + one per unreachable zed-reaching block ("core",
    // "zed-extra"); "claude-only" does not reach zed and is not reported.
    expect(findings).toHaveLength(3);
    for (const finding of findings) {
      expect(finding.checkId).toBe(ZED_CHAIN_CHECK_ID);
      expect(finding.severity).toBe("warn");
      expect(finding.path).toBe(".cursorrules");
    }

    const summary = findings[0];
    expect(summary?.message).toContain('Zed reads ".cursorrules", not AGENTS.md');
    expect(summary?.message).toContain(".cursorrules → AGENTS.md");
    expect(summary?.message).toContain("2 managed instruction block(s)");
    // Both fix decisions are named: fold behind sentinels, or rename.
    expect(summary?.fix).toContain("fold the managed instruction blocks behind patterson sentinels");
    expect(summary?.fix).toContain('rename ".cursorrules" so "AGENTS.md" wins the chain');

    const blockMessages = findings.slice(1).map((finding) => finding.message);
    expect(blockMessages[0]).toContain('Instruction block "core" is unreachable in Zed');
    expect(blockMessages[1]).toContain('Instruction block "zed-extra" is unreachable in Zed');
    expect(blockMessages.join("\n")).not.toContain("claude-only");
  });

  test("AGENTS.md winning with all managed regions present is clean", async () => {
    const { findings } = await runFixture("agents-ok");
    expect(findings).toEqual([]);
  });

  test("AGENTS.md winning but lacking a block's region reports exactly that block", async () => {
    const { findings } = await runFixture("agents-missing-region");
    expect(findings).toHaveLength(1);
    const finding = findings[0];
    expect(finding?.severity).toBe("warn");
    expect(finding?.path).toBe(AGENTS_MD);
    expect(finding?.message).toContain('instruction block "style"');
    expect(finding?.message).not.toContain('"core"');
    expect(finding?.fix).toContain("patterson sync");
  });

  test("a foreign winner carrying every managed region is only informational", async () => {
    const { findings } = await runFixture("folded-winner");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("info");
    expect(findings[0]?.path).toBe(".rules");
    expect(findings[0]?.message).toContain("folded behind a patterson sentinel");
  });

  test("no chain file on disk warns that blocks cannot reach Zed yet", async () => {
    const { findings } = await runFixture("no-chain-file");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("warn");
    expect(findings[0]?.message).toContain('"core"');
    expect(findings[0]?.fix).toContain("patterson sync");
  });

  test("zed not in targets: the guard stays silent even with a foreign winner", async () => {
    const { findings } = await runFixture("not-zed-targeted");
    expect(findings).toEqual([]);
  });

  test("no IR (adoption/init context): the guard stays silent", async () => {
    const findings = await zedChainGuardCheck.run({
      cwd: join(FIXTURES_DIR, "cursorrules-preexisting", "root"),
    });
    expect(findings).toEqual([]);
  });

  test("determinism: same disk + IR ⇒ identical findings", async () => {
    const first = await runFixture("cursorrules-preexisting");
    const second = await runFixture("cursorrules-preexisting");
    expect(JSON.stringify(second.findings)).toBe(JSON.stringify(first.findings));
  });

  test("registers and runs through the core CheckRegistry", async () => {
    const registry = new CheckRegistry();
    registry.register(zedChainGuardCheck);
    const dir = join(FIXTURES_DIR, "cursorrules-preexisting");
    const ir = PattersonProjectSchema.parse(await Bun.file(join(dir, "ir.json")).json());
    const report = await registry.runAll({ cwd: join(dir, "root"), ir });
    expect(report.ok).toBe(true); // warns, no errors
    expect(report.summary.warn).toBe(3);
    expect(report.checks.map((record) => record.id)).toEqual([ZED_CHAIN_CHECK_ID]);
  });
});

describe("helpers", () => {
  test("instructionSentinelId matches the shared AGENTS.md convention", () => {
    expect(instructionSentinelId("core")).toBe("instruction:core");
  });

  test("zedReachingBlocks filters by reach and target", async () => {
    const dir = join(FIXTURES_DIR, "cursorrules-preexisting");
    const ir = PattersonProjectSchema.parse(await Bun.file(join(dir, "ir.json")).json());
    expect(zedReachingBlocks(ir).map((block) => block.id)).toEqual(["core", "zed-extra"]);
  });
});
