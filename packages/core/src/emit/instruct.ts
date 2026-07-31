/**
 * Instruct collector → SETUP.md renderer.
 *
 * Instruct-tier FileOps are never written to their target path; they render
 * into a deterministic SETUP.md (plus the frontend's final prompt note).
 * No timestamps: determinism obligation applies to SETUP.md like any content.
 */
import type { FileOp } from "./types.ts";

const HEADER = [
  "# SETUP — manual steps required",
  "",
  "Patterson cannot apply the changes below automatically. Complete each step",
  "by hand, then re-run `patterson doctor` to verify.",
  "",
].join("\n");

/** Render the SETUP.md content for the instruct-tier ops in `ops` (others ignored). */
export function renderSetupMd(ops: readonly FileOp[]): string {
  const instructs = ops
    .filter((op) => op.mode === "instruct")
    .toSorted(
      (a, b) => a.path.localeCompare(b.path) || (a.sentinelId ?? "").localeCompare(b.sentinelId ?? ""),
    );

  const sections = instructs.map((op) => `## ${op.path}\n\n${(op.content ?? "").trimEnd()}\n`);
  return `${HEADER}\n${sections.join("\n")}`;
}
