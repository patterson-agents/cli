/**
 * `.vscode/settings.json` emission (MERGE tier, deviations-only).
 *
 * Workspace settings carry ONLY deviations from VS Code defaults — patterson
 * never writes a setting whose default already produces the configured
 * behavior. In v1 every patterson surface deliberately lands on a VS Code
 * default, so the deviation set is EMPTY (primary sources, Constitution V):
 *
 * - Instructions: VS Code reads the repo-root `AGENTS.md` (D6's widest
 *   artifact) natively via `chat.useAgentsMdFile`, enabled by default, and
 *   discovers `.github/instructions/*.instructions.md` via the default
 *   `chat.instructionsFilesLocations`
 *   (https://code.visualstudio.com/docs/copilot/customization/custom-instructions).
 * - MCP: `.vscode/mcp.json` is the native workspace discovery location — no
 *   setting required
 *   (https://code.visualstudio.com/docs/copilot/customization/mcp-servers).
 * - Prompts/skills/agents reach VS Code through the copilot emitter's
 *   `.github/` surfaces, which are likewise default discovery locations.
 *
 * The module keeps the full deviations-only pipeline (desired entries →
 * snapshot-aware merge → KeyPathPatch[]) so later phases add mappings without
 * structural change; jsonc comment preservation is the engine's
 * jsonc-parser-based key-path surgery, exercised by the roundtrip suite on
 * the sibling `.vscode` files.
 */
import type { CoverageGap, FileOp, FsSnapshot, KeyPathPatch, PattersonProject } from "@patterson/core";

export const SETTINGS_JSON_PATH = ".vscode/settings.json";

export interface SettingsOutput {
  op: FileOp | null;
  gaps: CoverageGap[];
}

/**
 * Compute the settings deviations for this IR. Empty in v1 by design (see the
 * module header); the signature is snapshot-aware so future deviations merge
 * against the on-disk file exactly like the mcp/extensions/tasks surfaces.
 */
function desiredDeviations(_ir: PattersonProject, _snapshot: FsSnapshot): KeyPathPatch[] {
  return [];
}

export function buildSettingsOp(ir: PattersonProject, snapshot: FsSnapshot): SettingsOutput {
  const patch = desiredDeviations(ir, snapshot);
  if (patch.length === 0) return { op: null, gaps: [] };
  return { op: { path: SETTINGS_JSON_PATH, format: "jsonc", mode: "merge", patch }, gaps: [] };
}
