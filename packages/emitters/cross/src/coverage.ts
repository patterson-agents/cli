/**
 * Coverage reporter (T034) — aggregate `CoverageGap[]` from every emitter's
 * coverage hook into one table model for `patterson check`.
 *
 * Contract: contracts/emitter.md obligation 3 — an emitter receiving an
 * entity it cannot express returns a CoverageGap; the engine/CLI aggregates
 * them and NEVER silently drops one. This module is the aggregation point:
 * rows are deduplicated, stably sorted, and rendered both as a stable JSON
 * shape (`CoverageReport`) and as a text table (`renderCoverageTable`).
 *
 * Pure data transformation: no IO, no IR access — callers (the check command)
 * collect the per-emitter gap lists and hand them in.
 */
import type { CoverageGap, TargetId } from "@patterson/core";

// ---------------------------------------------------------------------------
// Table model
// ---------------------------------------------------------------------------

/** One coverage-table row: an entity a target cannot (fully) express. */
export interface CoverageRow {
  entityId: string;
  target: TargetId;
  reason: string;
  fallbackApplied: boolean;
}

/**
 * The stable JSON shape of the aggregated table. Key order (rows, summary)
 * and row ordering are part of the `--json` contract; `summary.byTarget`
 * keys are sorted.
 */
export interface CoverageReport {
  rows: CoverageRow[];
  summary: {
    total: number;
    byTarget: Record<string, number>;
  };
}

/**
 * Locale-independent codepoint comparison (mirrors core's check registry):
 * `localeCompare` depends on the runtime's resolved ICU locale and would
 * break golden fixtures for non-ASCII ids.
 */
function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Stable row order: entityId, then target, then reason, then
 * fallbackApplied (gaps with no fallback first — they are the harder news).
 */
export function compareCoverageRows(a: CoverageRow, b: CoverageRow): number {
  const byEntity = compareStrings(a.entityId, b.entityId);
  if (byEntity !== 0) return byEntity;
  const byTarget = compareStrings(a.target, b.target);
  if (byTarget !== 0) return byTarget;
  const byReason = compareStrings(a.reason, b.reason);
  if (byReason !== 0) return byReason;
  return Number(a.fallbackApplied) - Number(b.fallbackApplied);
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/**
 * Aggregate the gap lists of every emitter into one report: flatten,
 * deduplicate identical rows (the same gap surfacing through two hooks is one
 * fact), sort stably, and count per target.
 */
export function aggregateCoverageGaps(gapLists: readonly (readonly CoverageGap[])[]): CoverageReport {
  const rows: CoverageRow[] = [];
  const seen = new Set<string>();
  for (const list of gapLists) {
    for (const gap of list) {
      const row: CoverageRow = {
        entityId: gap.entityId,
        target: gap.targetId,
        reason: gap.reason,
        fallbackApplied: gap.fallbackApplied,
      };
      const key = JSON.stringify([row.entityId, row.target, row.reason, row.fallbackApplied]);
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
    }
  }
  rows.sort(compareCoverageRows);

  const byTarget: Record<string, number> = {};
  const targets = [...new Set(rows.map((row) => row.target))].toSorted(compareStrings);
  for (const target of targets) {
    byTarget[target] = rows.filter((row) => row.target === target).length;
  }

  return { rows, summary: { total: rows.length, byTarget } };
}

// ---------------------------------------------------------------------------
// Text rendering
// ---------------------------------------------------------------------------

const HEADERS = ["entity", "target", "reason", "fallback"] as const;

function pad(cell: string, width: number): string {
  return cell.padEnd(width, " ");
}

/**
 * Render the aggregated table as aligned plain text (the `patterson check`
 * human view). Deterministic: same report ⇒ same string.
 */
export function renderCoverageTable(report: CoverageReport): string {
  if (report.rows.length === 0) {
    return "No coverage gaps: every IR entity is expressible on its targets.";
  }

  const body = report.rows.map((row) => [
    row.entityId,
    row.target,
    row.reason,
    row.fallbackApplied ? "yes" : "no",
  ]);
  const widths = HEADERS.map((header, column) =>
    Math.max(header.length, ...body.map((cells) => (cells[column] ?? "").length)),
  );

  const renderLine = (cells: readonly string[]): string =>
    cells.map((cell, column) => pad(cell, widths[column] ?? cell.length)).join("  ").trimEnd();

  const lines = [
    renderLine(HEADERS),
    renderLine(widths.map((width) => "-".repeat(width))),
    ...body.map(renderLine),
  ];

  const targetCount = Object.keys(report.summary.byTarget).length;
  lines.push("", `${report.summary.total} gap(s) across ${targetCount} target(s).`);
  return lines.join("\n");
}
