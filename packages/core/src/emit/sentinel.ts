/**
 * Markdown sentinel merger (Constitution II: provenance via sentinel blocks
 * with content hashes).
 *
 * Managed regions look like:
 *
 *   <!-- patterson:begin id=core hash=sha256:… -->
 *   …generated content…
 *   <!-- patterson:end id=core -->
 *
 * The hash in the begin marker is the sha256 of the exact content between the
 * marker lines; it doubles as a recovery baseline when `.patterson/emitted.json`
 * is missing. Drift = current region hash differing from the recorded hash.
 */
import { contentHash } from "./hash.ts";

const SENTINEL_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/;

function assertSentinelId(id: string): void {
  if (!SENTINEL_ID_RE.test(id)) {
    throw new Error(`Invalid sentinel id "${id}" (allowed: alphanumerics plus "_.:-", must start alphanumeric).`);
  }
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function beginMarker(id: string, hash: string): string {
  return `<!-- patterson:begin id=${id} hash=${hash} -->`;
}

export function endMarker(id: string): string {
  return `<!-- patterson:end id=${id} -->`;
}

/** Render a full sentinel block for `content` (hash computed over `content`). */
export function renderSentinelBlock(id: string, content: string): string {
  assertSentinelId(id);
  return `${beginMarker(id, contentHash(content))}\n${content}\n${endMarker(id)}`;
}

export interface SentinelMatch {
  id: string;
  /** The hash embedded in the begin marker (baseline of the last emission). */
  markerHash: string;
  /** Exact content between the marker lines. */
  content: string;
  /** Offsets of the whole block (markers inclusive) in the document. */
  start: number;
  end: number;
}

/** Locate the sentinel block for `id`, or null when the document has none. */
export function findSentinel(doc: string, id: string): SentinelMatch | null {
  assertSentinelId(id);
  const escaped = escapeRegExp(id);
  const re = new RegExp(
    `<!-- patterson:begin id=${escaped} hash=(sha256:[0-9a-f]{64}) -->\\n([\\s\\S]*?)\\n<!-- patterson:end id=${escaped} -->`,
  );
  const match = re.exec(doc);
  if (!match) return null;
  const markerHash = match[1];
  const content = match[2];
  if (markerHash === undefined || content === undefined) return null;
  return { id, markerHash, content, start: match.index, end: match.index + match[0].length };
}

/**
 * Insert or replace the sentinel block for `id`. Insertion appends at the end
 * of the document, preserving existing bytes exactly; replacement swaps only
 * the block. Callers are responsible for drift checks before replacing.
 */
export function upsertSentinel(doc: string, id: string, content: string): { doc: string; replaced: boolean } {
  const block = renderSentinelBlock(id, content);
  const match = findSentinel(doc, id);
  if (match) {
    return { doc: doc.slice(0, match.start) + block + doc.slice(match.end), replaced: true };
  }
  if (doc === "") return { doc: `${block}\n`, replaced: false };
  let separator: string;
  if (doc.endsWith("\n\n")) separator = "";
  else if (doc.endsWith("\n")) separator = "\n";
  else separator = "\n\n";
  return { doc: `${doc}${separator}${block}\n`, replaced: false };
}
