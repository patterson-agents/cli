/**
 * Provenance store — `.patterson/emitted.json` (Constitution II).
 *
 * One EmissionRecord per emitted file, per data-model.md "Emission layer".
 * Timestamps live here and only here (never in emitted content); the file is
 * serialized deterministically (records sorted by path, keyPaths by pointer).
 */
import { join } from "node:path";

import { assertWritable } from "./never-write.ts";

export const EMITTED_RELATIVE_PATH = ".patterson/emitted.json";

export interface EmittedKeyPath {
  /** RFC 6901-style pointer ("/mcpServers/docs") or "sentinel:<id>" for markdown regions. */
  path: string;
  /** The generated value (structured) or region content (markdown). */
  value: unknown;
  /** Hash of `value` — the drift baseline for this key/region. */
  hash: string;
}

export interface EmissionRecord {
  path: string;
  mode: "own" | "merge" | "instruct";
  keyPaths?: EmittedKeyPath[];
  /** Whole-file hash — the drift baseline for own-tier files. */
  contentHash?: string;
  /** Hand-owned keys/regions adopted at init; never overwritten ("content" marks a whole file). */
  foreign?: string[];
  linkMode?: "symlink" | "copy";
  emittedAt: string;
  irHash: string;
}

interface EmittedFileShape {
  version: number;
  files?: EmissionRecord[];
}

/** Load the provenance store; an absent file is an empty store. */
export async function loadProvenance(root: string): Promise<Map<string, EmissionRecord>> {
  const file = Bun.file(join(root, EMITTED_RELATIVE_PATH));
  if (!(await file.exists())) return new Map();
  const parsed = JSON.parse(await file.text()) as EmittedFileShape;
  return new Map((parsed.files ?? []).map((record) => [record.path, record]));
}

/** Locale-independent codepoint comparison — byte-identical output on every machine. */
function comparePaths(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Deterministic serialization of the store. */
export function serializeProvenance(records: ReadonlyMap<string, EmissionRecord>): string {
  const files = [...records.values()]
    .map((record) => ({
      ...record,
      keyPaths: record.keyPaths
        ? record.keyPaths.toSorted((a, b) => comparePaths(a.path, b.path))
        : undefined,
      foreign: record.foreign ? record.foreign.toSorted() : undefined,
    }))
    .toSorted((a, b) => comparePaths(a.path, b.path));
  return `${JSON.stringify({ version: 1, files }, null, 2)}\n`;
}

/** Persist the store to `.patterson/emitted.json`. */
export async function saveProvenance(root: string, records: ReadonlyMap<string, EmissionRecord>): Promise<void> {
  const abs = join(root, EMITTED_RELATIVE_PATH);
  // Defense in depth: every engine disk write runs the never-write guard.
  assertWritable(EMITTED_RELATIVE_PATH, { exists: await Bun.file(abs).exists() });
  await Bun.write(abs, serializeProvenance(records));
}
