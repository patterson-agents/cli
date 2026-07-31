/**
 * Shared helpers for the vscode emitter.
 */
import type { TargetId } from "@patterson/core";

export const VSCODE_TARGET: TargetId = "vscode";

/** Entity-level target filter: included when unfiltered or explicitly listing vscode. */
export function targetsVscode(entity: { targets?: TargetId[] | undefined }): boolean {
  return entity.targets === undefined || entity.targets.includes(VSCODE_TARGET);
}

/**
 * Ids usable as `${input:<id>}` references in `.vscode/mcp.json`. VS Code's
 * documented examples use alphanumerics with `-`/`_`/`.` separators
 * (https://code.visualstudio.com/docs/agents/reference/mcp-configuration);
 * anything outside this conservative set is refused (CoverageGap) rather than
 * emitted into a reference whose parse behavior we have not verified.
 */
export const INPUT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Append `additions` to `base`, skipping additions whose identity is already
 * present in `base` (existing entries win — hand-added order/casing is kept).
 * Used for `.vscode/extensions.json` recommendations.
 */
export function appendMissing<T>(
  base: readonly T[],
  additions: readonly T[],
  identity: (item: T) => string,
): T[] {
  const seen = new Set(base.map(identity));
  const merged = [...base];
  for (const item of additions) {
    const key = identity(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

/**
 * Merge patterson-owned entries into an existing array: foreign entries
 * (identities we do not emit) are preserved in their original order, and our
 * entries are appended in emission order, REPLACING any existing entry with
 * the same identity. This makes `--accept-generated` restore the generated
 * definition while hand-added foreign entries always survive.
 * Used for `.vscode/mcp.json` inputs (identity: id) and `.vscode/tasks.json`
 * tasks (identity: label).
 */
export function overrideByIdentity(
  current: unknown,
  additions: readonly unknown[],
  identity: (item: unknown) => string | null,
): unknown[] {
  const base = Array.isArray(current) ? (current as unknown[]) : [];
  const ours = new Set<string>();
  for (const item of additions) {
    const key = identity(item);
    if (key !== null) ours.add(key);
  }
  const kept = base.filter((item) => {
    const key = identity(item);
    return key === null || !ours.has(key);
  });
  return [...kept, ...additions];
}
