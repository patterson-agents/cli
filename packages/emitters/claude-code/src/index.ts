/**
 * @patterson/emitter-claude-code — the claude-code emitter (T022).
 *
 * Contract: specs/001-patterson-cli-v1/contracts/emitter.md. Pure and
 * deterministic: same IR + snapshot ⇒ byte-identical FileOps; the emitter
 * reads nothing but the IR and the FsSnapshot and never writes (Constitution I).
 *
 * Gap channel: core's `Emitter.compile` returns `FileOp[]` only, so this
 * package defines `compileClaudeCode(ir, snapshot): { ops, gaps }` as the full
 * surface (documented here as the shape for the engine/checks to consume until
 * core grows a native gap channel) and exposes `claudeCodeEmitter` as the
 * core-conformant projection (`compile` → `ops`). Frontends needing gaps call
 * `compileClaudeCode` directly.
 */
import type { CoverageGap, Emitter, FileOp, FsSnapshot, PattersonProject } from "@patterson/core";

import { buildAgentOps } from "./agents.ts";
import { targetsClaude } from "./common.ts";
import { AGENTS_MD_PATH, buildInstructionOps, CLAUDE_MD_PATH } from "./instructions.ts";
import { buildMcpOp, MCP_JSON_PATH } from "./mcp.ts";
import { buildSettingsOp, SETTINGS_PATH } from "./settings.ts";
import { buildCommandOps, buildSkillOps, canonicalSkillPath } from "./skills.ts";

export interface CompileOutput {
  ops: FileOp[];
  gaps: CoverageGap[];
}

/** Full compile: FileOps plus the CoverageGap list (contracts/emitter.md obligation 3). */
export function compileClaudeCode(ir: PattersonProject, snapshot: FsSnapshot): CompileOutput {
  const settings = buildSettingsOp(ir, snapshot);
  const mcp = buildMcpOp(ir);
  const instructions = buildInstructionOps(ir);
  const skills = buildSkillOps(ir, snapshot);
  const commands = buildCommandOps(ir);
  const agents = buildAgentOps(ir);

  const ops: FileOp[] = [
    ...(settings.op ? [settings.op] : []),
    ...(mcp.op ? [mcp.op] : []),
    ...instructions.ops,
    ...skills.ops,
    ...commands.ops,
    ...agents.ops,
  ];
  const gaps: CoverageGap[] = [
    ...settings.gaps,
    ...mcp.gaps,
    ...instructions.gaps,
    ...skills.gaps,
    ...commands.gaps,
    ...agents.gaps,
  ];
  return { ops, gaps };
}

/** Core-contract emitter (gaps available via compileClaudeCode). */
export const claudeCodeEmitter: Emitter = {
  targets: ["claude-code"],
  compile: (ir, snapshot) => compileClaudeCode(ir, snapshot).ops,
};

/**
 * Root-relative paths this emitter wants captured in the FsSnapshot before
 * compile: existing merge surfaces plus the canonical files of copy-mode
 * skills (their content can only come from the snapshot).
 */
export function snapshotPaths(ir: PattersonProject): string[] {
  const paths = [SETTINGS_PATH, MCP_JSON_PATH, AGENTS_MD_PATH, CLAUDE_MD_PATH];
  for (const skill of ir.skills) {
    if (!targetsClaude(skill) || skill.linkMode !== "copy") continue;
    for (const file of skill.files ?? []) paths.push(canonicalSkillPath(skill.name, file));
  }
  return paths;
}

export { CLAUDE_AGENTS_DIR } from "./agents.ts";
export { AGENTS_MD_PATH, CLAUDE_MD_PATH, instructionSentinelId, RULES_DIR } from "./instructions.ts";
export { MCP_JSON_PATH } from "./mcp.ts";
export {
  assertWhitelistedKeyPath,
  HOOK_EVENTS,
  MERGE_SEMANTICS,
  mergeSettingsValue,
  semanticsFor,
  SETTINGS_PATH,
  SETTINGS_PERMISSIONS_KEYS,
  SETTINGS_TOP_LEVEL_KEYS,
} from "./settings.ts";
export type { MergeSemantics } from "./settings.ts";
export { AGENTS_SKILLS_DIR, canonicalSkillPath, CLAUDE_SKILLS_DIR } from "./skills.ts";
