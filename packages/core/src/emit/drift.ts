/**
 * Drift comparator (Constitution II).
 *
 * current == recorded → "clean" (rewrite allowed)
 * current != recorded → "drifted" (keep + report; --accept-generated overrides)
 * no recorded baseline → "unrecorded" (adoption marks it foreign; otherwise conflict)
 */
export type DriftState = "clean" | "drifted" | "unrecorded";

export function classifyDrift(recordedHash: string | undefined, currentHash: string): DriftState {
  if (recordedHash === undefined) return "unrecorded";
  return recordedHash === currentHash ? "clean" : "drifted";
}
