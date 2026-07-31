/**
 * `.vscode/extensions.json` emission (MERGE tier — the `recommendations`
 * array, concat-dedupe).
 *
 * Source: data-model.md ExtensionRec — `{ id, targets? }` →
 * `.vscode/extensions.json` recommendations. The file format (a
 * `recommendations` array of `publisher.name` ids, comments allowed) is the
 * documented workspace-recommendations surface
 * (https://code.visualstudio.com/docs/configure/extensions/extension-marketplace#_workspace-recommended-extensions).
 *
 * Merge semantics: existing entries are preserved in order (hand-added
 * recommendations survive); missing patterson ids are appended. Extension ids
 * are matched case-insensitively (Marketplace ids are case-insensitive), and
 * the existing casing wins.
 */
import type { CoverageGap, FileOp, FsSnapshot, KeyPathPatch, PattersonProject } from "@patterson/core";
import { readValueAt } from "@patterson/core";

import { appendMissing, targetsVscode } from "./common.ts";

export const EXTENSIONS_JSON_PATH = ".vscode/extensions.json";

export interface ExtensionsOutput {
  op: FileOp | null;
  gaps: CoverageGap[];
}

export function buildExtensionsOp(ir: PattersonProject, snapshot: FsSnapshot): ExtensionsOutput {
  const desired: string[] = [];
  for (const extension of ir.extensions) {
    if (!targetsVscode(extension)) continue;
    desired.push(extension.id);
  }
  if (desired.length === 0) return { op: null, gaps: [] };

  const currentText = snapshot.read(EXTENSIONS_JSON_PATH);
  const current =
    currentText === null ? undefined : readValueAt(currentText, ["recommendations"]).value;
  const base = Array.isArray(current)
    ? (current as unknown[]).filter((item): item is string => typeof item === "string")
    : [];
  const merged = appendMissing(base, desired, (id) => id.toLowerCase());

  const patch: KeyPathPatch[] = [{ keyPath: ["recommendations"], value: merged }];
  return { op: { path: EXTENSIONS_JSON_PATH, format: "jsonc", mode: "merge", patch }, gaps: [] };
}
