/**
 * T016/T017 tests: check registry (registration, aggregation, severity ordering,
 * stable --json shape) and the definePattersonPlugin identity helper.
 */
import { describe, expect, test } from "bun:test";

import {
  CheckRegistry,
  SEVERITIES,
  SEVERITY_RANK,
  compareFindings,
  type CheckCtx,
  type CheckDef,
  type CheckReport,
  type Finding,
} from "../src/checks/index.ts";
import {
  definePattersonPlugin,
  type PattersonPlugin,
} from "../src/plugin.ts";

const ctx: CheckCtx = { cwd: "/tmp/example" };

function makeCheck(
  id: string,
  findings: Omit<Finding, "checkId">[],
  description = `check ${id}`,
): CheckDef {
  return {
    id,
    description,
    run: async () => findings.map((f) => ({ ...f, checkId: id })),
  };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

describe("CheckRegistry registration", () => {
  test("registers and resolves a check by id", () => {
    const registry = new CheckRegistry();
    const check = makeCheck("ir.valid", []);
    registry.register(check);
    expect(registry.has("ir.valid")).toBe(true);
    expect(registry.get("ir.valid")).toBe(check);
  });

  test("rejects duplicate ids", () => {
    const registry = new CheckRegistry();
    registry.register(makeCheck("dup", []));
    expect(() => registry.register(makeCheck("dup", []))).toThrow(/dup/);
  });

  test("rejects empty ids", () => {
    const registry = new CheckRegistry();
    expect(() => registry.register(makeCheck("", []))).toThrow(/id/);
  });

  test("list() returns checks sorted by id (deterministic)", () => {
    const registry = new CheckRegistry();
    registry.register(makeCheck("zed.chain", []));
    registry.register(makeCheck("drift.settings", []));
    registry.register(makeCheck("mcp.reachable", []));
    expect(registry.list().map((c) => c.id)).toEqual([
      "drift.settings",
      "mcp.reachable",
      "zed.chain",
    ]);
    expect(registry.ids()).toEqual(["drift.settings", "mcp.reachable", "zed.chain"]);
  });
});

// ---------------------------------------------------------------------------
// Running: all / subset
// ---------------------------------------------------------------------------

describe("CheckRegistry run", () => {
  test("runAll runs every registered check", async () => {
    const registry = new CheckRegistry();
    registry.register(makeCheck("a", [{ severity: "info", message: "a ok" }]));
    registry.register(makeCheck("b", [{ severity: "warn", message: "b iffy" }]));
    const report = await registry.runAll(ctx);
    expect(report.checks.map((c) => c.id)).toEqual(["a", "b"]);
    expect(report.summary.total).toBe(2);
  });

  test("run(subset) runs only the named checks", async () => {
    const registry = new CheckRegistry();
    registry.register(makeCheck("a", [{ severity: "error", message: "bad" }]));
    registry.register(makeCheck("b", []));
    registry.register(makeCheck("c", []));
    const report = await registry.run(["c", "a"], ctx);
    // sorted by id regardless of requested order
    expect(report.checks.map((c) => c.id)).toEqual(["a", "c"]);
  });

  test("run(subset) with unknown id throws and names the known ids", async () => {
    const registry = new CheckRegistry();
    registry.register(makeCheck("known", []));
    await expect(registry.run(["nope"], ctx)).rejects.toThrow(/nope/);
    await expect(registry.run(["nope"], ctx)).rejects.toThrow(/known/);
  });

  test("run([]) yields an empty ok report", async () => {
    const registry = new CheckRegistry();
    registry.register(makeCheck("a", [{ severity: "error", message: "bad" }]));
    const report = await registry.run([], ctx);
    expect(report.ok).toBe(true);
    expect(report.summary).toEqual({ total: 0, error: 0, warn: 0, info: 0 });
    expect(report.checks).toEqual([]);
    expect(report.findings).toEqual([]);
  });

  test("duplicate ids in a subset run once", async () => {
    let runs = 0;
    const registry = new CheckRegistry();
    registry.register({
      id: "once",
      description: "counts runs",
      run: async () => {
        runs += 1;
        return [];
      },
    });
    await registry.run(["once", "once"], ctx);
    expect(runs).toBe(1);
  });

  test("ctx is passed through to run()", async () => {
    const registry = new CheckRegistry();
    let seen: CheckCtx | undefined;
    registry.register({
      id: "ctx.probe",
      description: "records ctx",
      run: async (c) => {
        seen = c;
        return [];
      },
    });
    await registry.runAll(ctx);
    expect(seen).toBe(ctx);
  });

  test("a throwing check aggregates as an error finding, not a crash", async () => {
    const registry = new CheckRegistry();
    registry.register({
      id: "boom",
      description: "always throws",
      run: async () => {
        throw new Error("kaput");
      },
    });
    registry.register(makeCheck("fine", []));
    const report = await registry.runAll(ctx);
    expect(report.ok).toBe(false);
    expect(report.summary.error).toBe(1);
    const finding = report.findings[0];
    expect(finding?.checkId).toBe("boom");
    expect(finding?.severity).toBe("error");
    expect(finding?.message).toContain("kaput");
  });

  test("a check returning findings without a message aggregates as an error, not a crash", async () => {
    const registry = new CheckRegistry();
    registry.register({
      id: "malformed",
      description: "returns findings with no message",
      // Simulates an untyped third-party JS plugin check.
      run: async () =>
        [{ severity: "error" }, { severity: "error" }] as unknown as Finding[],
    });
    registry.register(makeCheck("fine", []));

    const report = await registry.runAll(ctx);
    expect(report.ok).toBe(false);
    expect(report.summary.error).toBe(1);
    const finding = report.findings[0];
    expect(finding?.checkId).toBe("malformed");
    expect(finding?.severity).toBe("error");
    expect(finding?.message).toContain("malformed");
  });

  test("a check returning an unknown severity aggregates as an error with consistent summary", async () => {
    const registry = new CheckRegistry();
    registry.register({
      id: "fatalist",
      description: "invents a severity",
      run: async () =>
        [{ severity: "fatal", message: "doom" }] as unknown as Finding[],
    });
    registry.register(makeCheck("info-check", [{ severity: "info", message: "fyi" }]));

    const report = await registry.runAll(ctx);
    expect(report.ok).toBe(false);
    // Buckets always sum to total — no NaN bucket dropped by JSON.stringify.
    expect(report.summary.error + report.summary.warn + report.summary.info).toBe(
      report.summary.total,
    );
    expect(JSON.stringify(report)).not.toContain("NaN");
    const err = report.findings[0];
    expect(err?.checkId).toBe("fatalist");
    expect(err?.severity).toBe("error");
    expect(err?.message).toContain("fatalist");
  });

  test("a check returning a non-array aggregates as an error, not a crash", async () => {
    const registry = new CheckRegistry();
    registry.register({
      id: "not-array",
      description: "returns garbage",
      run: async () => ({ oops: true }) as unknown as Finding[],
    });
    const report = await registry.runAll(ctx);
    expect(report.ok).toBe(false);
    expect(report.findings[0]?.message).toContain("not-array");
  });

  test("checkId is stamped with the running check's id", async () => {
    const registry = new CheckRegistry();
    registry.register({
      id: "real.id",
      description: "misreports its id",
      run: async () => [
        { checkId: "lying-id", severity: "info", message: "hello" },
      ],
    });
    const report = await registry.runAll(ctx);
    expect(report.findings[0]?.checkId).toBe("real.id");
  });
});

// ---------------------------------------------------------------------------
// Aggregation + severity ordering
// ---------------------------------------------------------------------------

describe("aggregation report", () => {
  async function sampleReport(): Promise<CheckReport> {
    const registry = new CheckRegistry();
    registry.register(
      makeCheck("beta", [
        { severity: "info", message: "fyi", path: "b.md" },
        { severity: "error", message: "broken", path: "a.json", fix: "run sync" },
      ]),
    );
    registry.register(makeCheck("alpha", [{ severity: "warn", message: "meh" }]));
    return registry.runAll(ctx);
  }

  test("summary counts per severity and ok flag", async () => {
    const report = await sampleReport();
    expect(report.summary).toEqual({ total: 3, error: 1, warn: 1, info: 1 });
    expect(report.ok).toBe(false);
  });

  test("ok is true when nothing reaches error severity", async () => {
    const registry = new CheckRegistry();
    registry.register(makeCheck("w", [{ severity: "warn", message: "meh" }]));
    registry.register(makeCheck("i", [{ severity: "info", message: "fyi" }]));
    const report = await registry.runAll(ctx);
    expect(report.ok).toBe(true);
    expect(report.summary.error).toBe(0);
  });

  test("flattened findings are ordered error > warn > info, then by checkId", async () => {
    const report = await sampleReport();
    expect(report.findings.map((f) => [f.severity, f.checkId])).toEqual([
      ["error", "beta"],
      ["warn", "alpha"],
      ["info", "beta"],
    ]);
  });

  test("per-check records keep description and severity-sorted findings", async () => {
    const report = await sampleReport();
    expect(report.checks.map((c) => c.id)).toEqual(["alpha", "beta"]);
    const beta = report.checks[1];
    expect(beta?.description).toBe("check beta");
    expect(beta?.findings.map((f) => f.severity)).toEqual(["error", "info"]);
  });

  test("optional finding fields survive aggregation", async () => {
    const report = await sampleReport();
    const err = report.findings[0];
    expect(err?.path).toBe("a.json");
    expect(err?.fix).toBe("run sync");
  });

  test("--json shape is stable: same inputs => byte-identical JSON, fixed key order", async () => {
    const a = JSON.stringify(await sampleReport());
    const b = JSON.stringify(await sampleReport());
    expect(a).toBe(b);
    const parsed = JSON.parse(a) as Record<string, unknown>;
    expect(Object.keys(parsed)).toEqual(["ok", "summary", "checks", "findings"]);
    expect(Object.keys(parsed["summary"] as object)).toEqual([
      "total",
      "error",
      "warn",
      "info",
    ]);
  });

  test("ordering is locale-independent codepoint order (not ICU collation)", () => {
    // Under sv/de ICU collation "ä" sorts before "z"; codepoint order puts
    // "z" (0x7A) before "ä" (0xE4). Pinning codepoint order keeps --json
    // byte-identical across machines and runtimes.
    const zed: Finding = { checkId: "x", severity: "info", message: "z" };
    const auml: Finding = { checkId: "x", severity: "info", message: "ä" };
    expect(compareFindings(zed, auml)).toBeLessThan(0);
    expect(compareFindings(auml, zed)).toBeGreaterThan(0);

    const registry = new CheckRegistry();
    registry.register(makeCheck("ä.check", []));
    registry.register(makeCheck("z.check", []));
    expect(registry.ids()).toEqual(["z.check", "ä.check"]);
  });

  test("compareFindings ranks severity per SEVERITY_RANK", () => {
    const err: Finding = { checkId: "x", severity: "error", message: "m" };
    const warn: Finding = { checkId: "x", severity: "warn", message: "m" };
    const info: Finding = { checkId: "x", severity: "info", message: "m" };
    expect(compareFindings(err, warn)).toBeLessThan(0);
    expect(compareFindings(warn, info)).toBeLessThan(0);
    expect(compareFindings(info, err)).toBeGreaterThan(0);
    expect(SEVERITIES).toEqual(["error", "warn", "info"]);
    expect(SEVERITY_RANK.error).toBeLessThan(SEVERITY_RANK.warn);
    expect(SEVERITY_RANK.warn).toBeLessThan(SEVERITY_RANK.info);
  });
});

// ---------------------------------------------------------------------------
// definePattersonPlugin (T017 — types only + identity helper)
// ---------------------------------------------------------------------------

describe("definePattersonPlugin", () => {
  test("is an identity function (no loading side effects in v1)", () => {
    const plugin = definePattersonPlugin({ name: "my-plugin" });
    expect(plugin).toEqual({ name: "my-plugin" });
  });

  test("preserves the exact object reference", () => {
    const input: PattersonPlugin = {
      name: "ref-check",
      checks: [makeCheck("plugin.check", [])],
    };
    expect(definePattersonPlugin(input)).toBe(input);
  });

  test("accepts every contribution slot and check contributions run in a registry", async () => {
    const plugin = definePattersonPlugin({
      name: "full",
      commands: [{ id: "skills.audit" }],
      emitters: [{ targets: ["claude-code"] }, { targets: "cross" }],
      checks: [makeCheck("full.check", [{ severity: "info", message: "hi" }])],
      generators: [{ id: "gen.api" }],
      lessons: [{ id: "lesson-1" }],
    });
    expect(plugin.name).toBe("full");

    const registry = new CheckRegistry();
    for (const check of plugin.checks ?? []) registry.register(check);
    const report = await registry.runAll(ctx);
    expect(report.findings[0]?.checkId).toBe("full.check");
  });

  test("type-level: plugin checks slot is CheckDef-compatible", () => {
    // Compile-time assertion (verbatimModuleSyntax-safe): a CheckDef is
    // assignable to the plugin's checks slot and back.
    const check: CheckDef = makeCheck("t", []);
    const plugin: PattersonPlugin = { name: "t", checks: [check] };
    const roundTrip: readonly CheckDef[] | undefined = plugin.checks;
    expect(roundTrip?.[0]).toBe(check);
  });
});
