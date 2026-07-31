/**
 * ExtensionRec → instruct-tier note (T032).
 *
 * Zed installs extensions to the USER machine (a global, per-user store —
 * not into the repository), so there is nothing patterson can materialize in
 * the project. The recommendation is rendered as an instruct-tier step in
 * SETUP.md, with the user-machine side effect stated explicitly
 * (data-model.md ExtensionRec: "zed extension side effect (user-machine
 * install) is surfaced as a warning").
 */
import type { CoverageGap, FileOp, PattersonProject } from "@patterson/core";

import { targetsZed } from "./common.ts";

/**
 * Instruct-tier pseudo-path (never written — it names the SETUP.md section;
 * Zed has no project-level extensions file to point at).
 */
export const ZED_EXTENSIONS_INSTRUCT_PATH = "zed:extensions";

export interface ExtensionsOutput {
  ops: FileOp[];
  gaps: CoverageGap[];
}

export function buildExtensionOps(ir: PattersonProject): ExtensionsOutput {
  const ids = ir.extensions.filter((ext) => targetsZed(ext)).map((ext) => ext.id);
  if (ids.length === 0) return { ops: [], gaps: [] };

  const content = [
    "WARNING: Zed installs extensions on the USER machine (globally, for every",
    "project of that user), not into this repository — patterson cannot",
    "materialize them, and installing one affects more than this project.",
    "Each teammate installs them once by hand:",
    "",
    "1. Open Zed and run `zed: extensions` from the command palette.",
    "2. Search for and install:",
    ...ids.map((id) => `   - ${id}`),
  ].join("\n");

  return {
    ops: [
      {
        path: ZED_EXTENSIONS_INSTRUCT_PATH,
        format: "markdown",
        mode: "instruct",
        content,
      },
    ],
    gaps: [],
  };
}
