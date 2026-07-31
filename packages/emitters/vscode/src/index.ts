/**
 * @patterson/emitter-vscode — the vscode emitter (T033).
 *
 * Contract: specs/001-patterson-cli-v1/contracts/emitter.md. Pure and
 * deterministic: same IR + snapshot ⇒ byte-identical FileOps; the emitter
 * reads nothing but the IR and the FsSnapshot and never writes (Constitution I).
 *
 * Surfaces (plan.md P2b / T033):
 * - `.vscode/mcp.json` — top-level `servers` (NOT `mcpServers`) + synthesized
 *   `inputs[]` from SecretRefs (see src/mcp.ts for the primary-source notes).
 * - `.vscode/settings.json` — deviations-only; empty in v1 because every
 *   patterson surface lands on a VS Code default (see src/settings.ts).
 * - `.vscode/extensions.json` — `recommendations` concat-dedupe.
 * - `.vscode/tasks.json` — version 2.0.0 + the DevopsDef lint task.
 * All four are jsonc merge-tier: the engine's key-path surgery preserves
 * comments and unknown (user-owned) keys byte-for-byte.
 *
 * Out of scope here (not silent drops — these entities reach VS Code through
 * other emitters' surfaces): instructions (AGENTS.md, read natively by
 * VS Code), skills/agents/commands/prompts (the copilot emitter's `.github/`
 * files, VS Code's default discovery locations).
 *
 * Gap channel: mirrors claude-code — `compileVscode(ir, snapshot): { ops,
 * gaps }` is the full surface; `vscodeEmitter` is the core-conformant
 * projection (`compile` → `ops`); frontends needing gaps call `compileVscode`
 * or `coverageGaps` directly.
 */
import type { CoverageGap, Emitter, FileOp, FsSnapshot, PattersonProject } from "@patterson/core";

import { buildExtensionsOp, EXTENSIONS_JSON_PATH } from "./extensions.ts";
import { buildMcpOp, MCP_JSON_PATH } from "./mcp.ts";
import { buildSettingsOp, SETTINGS_JSON_PATH } from "./settings.ts";
import { buildTasksOp, TASKS_JSON_PATH } from "./tasks.ts";

export interface CompileOutput {
  ops: FileOp[];
  gaps: CoverageGap[];
}

/** Full compile: FileOps plus the CoverageGap list (contracts/emitter.md obligation 3). */
export function compileVscode(ir: PattersonProject, snapshot: FsSnapshot): CompileOutput {
  const mcp = buildMcpOp(ir, snapshot);
  const settings = buildSettingsOp(ir, snapshot);
  const extensions = buildExtensionsOp(ir, snapshot);
  const tasks = buildTasksOp(ir, snapshot);

  const ops: FileOp[] = [
    ...(mcp.op ? [mcp.op] : []),
    ...(settings.op ? [settings.op] : []),
    ...(extensions.op ? [extensions.op] : []),
    ...(tasks.op ? [tasks.op] : []),
  ];
  const gaps: CoverageGap[] = [...mcp.gaps, ...settings.gaps, ...extensions.gaps, ...tasks.gaps];
  return { ops, gaps };
}

/** Core-contract emitter (gaps available via compileVscode). */
export const vscodeEmitter: Emitter = {
  targets: ["vscode"],
  compile: (ir, snapshot) => compileVscode(ir, snapshot).ops,
};

/**
 * Root-relative paths this emitter wants captured in the FsSnapshot before
 * compile: all four merge surfaces (their current arrays feed the merge).
 */
export function snapshotPaths(_ir: PattersonProject): string[] {
  return [MCP_JSON_PATH, SETTINGS_JSON_PATH, EXTENSIONS_JSON_PATH, TASKS_JSON_PATH];
}

/**
 * Snapshot-aware coverage hook: the gap list for `patterson check` (silent
 * drops are contract violations — contracts/emitter.md obligation 3).
 */
export function coverageGaps(ir: PattersonProject, snapshot: FsSnapshot): CoverageGap[] {
  return compileVscode(ir, snapshot).gaps;
}

export { appendMissing, INPUT_ID_RE, overrideByIdentity, targetsVscode, VSCODE_TARGET } from "./common.ts";
export { buildExtensionsOp, EXTENSIONS_JSON_PATH } from "./extensions.ts";
export { buildMcpOp, MCP_JSON_PATH } from "./mcp.ts";
export type { McpInput } from "./mcp.ts";
export { buildSettingsOp, SETTINGS_JSON_PATH } from "./settings.ts";
export { buildTasksOp, TASK_LABEL_PREFIX, TASKS_JSON_PATH, TASKS_VERSION } from "./tasks.ts";
