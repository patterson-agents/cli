/**
 * T034 — coverage reporter tests: aggregation across emitters, stable sort,
 * dedupe, text rendering, and the stable JSON shape consumed by
 * `patterson check`.
 */
import { describe, expect, test } from "bun:test";

import type { CoverageGap } from "@patterson/core";

import { aggregateCoverageGaps, compareCoverageRows, renderCoverageTable } from "../src/index.ts";

// Per-emitter gap lists, as each emitter's coverageGaps(ir, snapshot) hook
// would return them (deliberately unsorted, with one duplicate across hooks).
const claudeGaps: CoverageGap[] = [
  {
    entityId: "mcp.tunnel",
    targetId: "claude-code",
    reason: "ws transport is not expressible in .mcp.json v1",
    fallbackApplied: false,
  },
];
const copilotGaps: CoverageGap[] = [
  {
    entityId: "mcp.docs",
    targetId: "copilot",
    reason: "coding-agent MCP is instruct-only",
    fallbackApplied: true,
  },
  {
    entityId: "instructions.scoped",
    targetId: "copilot",
    reason: "scope globs collapsed to applyTo comma-string",
    fallbackApplied: true,
  },
];
const opencodeGaps: CoverageGap[] = [
  {
    entityId: "instructions.scoped",
    targetId: "opencode",
    reason: "path-scoped blocks inlined per emit.scopeFallback",
    fallbackApplied: true,
  },
  // Exact duplicate of a copilot row — the same fact through two hooks.
  {
    entityId: "instructions.scoped",
    targetId: "copilot",
    reason: "scope globs collapsed to applyTo comma-string",
    fallbackApplied: true,
  },
];

describe("aggregateCoverageGaps", () => {
  test("flattens all emitters, dedupes, and sorts stably", () => {
    const report = aggregateCoverageGaps([claudeGaps, copilotGaps, opencodeGaps]);
    expect(report.rows).toEqual([
      {
        entityId: "instructions.scoped",
        target: "copilot",
        reason: "scope globs collapsed to applyTo comma-string",
        fallbackApplied: true,
      },
      {
        entityId: "instructions.scoped",
        target: "opencode",
        reason: "path-scoped blocks inlined per emit.scopeFallback",
        fallbackApplied: true,
      },
      {
        entityId: "mcp.docs",
        target: "copilot",
        reason: "coding-agent MCP is instruct-only",
        fallbackApplied: true,
      },
      {
        entityId: "mcp.tunnel",
        target: "claude-code",
        reason: "ws transport is not expressible in .mcp.json v1",
        fallbackApplied: false,
      },
    ]);
    expect(report.summary).toEqual({
      total: 4,
      byTarget: { "claude-code": 1, copilot: 2, opencode: 1 },
    });
  });

  test("input order never changes the output (stable sort)", () => {
    const forward = aggregateCoverageGaps([claudeGaps, copilotGaps, opencodeGaps]);
    const backward = aggregateCoverageGaps([opencodeGaps, copilotGaps, claudeGaps]);
    expect(JSON.stringify(backward)).toBe(JSON.stringify(forward));
  });

  test("empty input yields an empty report", () => {
    expect(aggregateCoverageGaps([])).toEqual({ rows: [], summary: { total: 0, byTarget: {} } });
    expect(aggregateCoverageGaps([[], []])).toEqual({ rows: [], summary: { total: 0, byTarget: {} } });
  });

  test("JSON key order is the stable --json contract", () => {
    const report = aggregateCoverageGaps([claudeGaps]);
    expect(Object.keys(report)).toEqual(["rows", "summary"]);
    expect(Object.keys(report.summary)).toEqual(["total", "byTarget"]);
    const row = report.rows[0];
    expect(row === undefined ? [] : Object.keys(row)).toEqual([
      "entityId",
      "target",
      "reason",
      "fallbackApplied",
    ]);
  });
});

describe("compareCoverageRows", () => {
  test("orders by entityId, target, reason, then fallbackApplied (false first)", () => {
    const base = { entityId: "a", target: "copilot", reason: "r", fallbackApplied: false } as const;
    expect(compareCoverageRows(base, { ...base, entityId: "b" })).toBeLessThan(0);
    expect(compareCoverageRows(base, { ...base, target: "zed" })).toBeLessThan(0);
    expect(compareCoverageRows(base, { ...base, reason: "s" })).toBeLessThan(0);
    expect(compareCoverageRows(base, { ...base, fallbackApplied: true })).toBeLessThan(0);
    expect(compareCoverageRows(base, { ...base })).toBe(0);
  });
});

describe("renderCoverageTable", () => {
  test("renders an aligned table with header, rows, and summary", () => {
    const report = aggregateCoverageGaps([claudeGaps, copilotGaps]);
    const text = renderCoverageTable(report);
    expect(text).toBe(
      [
        "entity               target       reason                                           fallback",
        "-------------------  -----------  -----------------------------------------------  --------",
        "instructions.scoped  copilot      scope globs collapsed to applyTo comma-string    yes",
        "mcp.docs             copilot      coding-agent MCP is instruct-only                yes",
        "mcp.tunnel           claude-code  ws transport is not expressible in .mcp.json v1  no",
        "",
        "3 gap(s) across 2 target(s).",
      ].join("\n"),
    );
  });

  test("empty report renders the no-gaps line", () => {
    expect(renderCoverageTable(aggregateCoverageGaps([]))).toBe(
      "No coverage gaps: every IR entity is expressible on its targets.",
    );
  });

  test("deterministic: same report ⇒ same string", () => {
    const report = aggregateCoverageGaps([copilotGaps, opencodeGaps]);
    expect(renderCoverageTable(report)).toBe(renderCoverageTable(report));
  });
});
