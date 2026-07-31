/**
 * Content and value hashing for provenance records (Constitution II).
 *
 * All hashes are rendered as `sha256:<hex>` so records are self-describing.
 */
import { createHash } from "node:crypto";

/** Raw sha256 hex digest of a UTF-8 string. */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** Provenance-format hash (`sha256:<hex>`) of exact file/region content. */
export function contentHash(input: string): string {
  return `sha256:${sha256Hex(input)}`;
}

/**
 * Deterministic JSON serialization: object keys sorted recursively so the same
 * logical value always hashes identically regardless of construction order.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value)) ?? "undefined";
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).toSorted()) {
      out[key] = sortValue(record[key]);
    }
    return out;
  }
  return value;
}

/** Provenance-format hash of a structured (JSON) value. */
export function valueHash(value: unknown): string {
  return contentHash(stableStringify(value));
}

/** Hash of a full IR document, recorded as `irHash` on every EmissionRecord. */
export function computeIrHash(ir: unknown): string {
  return valueHash(ir);
}
