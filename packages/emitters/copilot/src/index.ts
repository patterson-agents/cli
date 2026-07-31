/**
 * @patterson/emitter-copilot — the GitHub Copilot emitter (T030).
 *
 * Contract: specs/001-patterson-cli-v1/contracts/emitter.md. Pure and
 * deterministic: same IR + snapshot ⇒ byte-identical FileOps; the emitter
 * reads nothing but the IR and the FsSnapshot and never writes (Constitution I).
 *
 * Surfaces:
 * - `.github/copilot-instructions.md` — REAL COPY of universal instruction
 *   blocks in sentinel regions (D6: Copilot has no import syntax);
 * - `.github/instructions/<id>.instructions.md` — `applyTo` comma-STRING;
 * - `.github/agents/<name>.agent.md` — `.agent.md` era (NOT `.chatmode.md`);
 * - `.github/prompts/<name>.prompt.md` — `agent:`-era prompt files;
 * - `.github/skills/<name>/` — real copies (copilot copy linkMode, D7);
 * - `.github/workflows/copilot-setup-steps.yml` — literal job id, ≤59 min;
 * - coding-agent MCP — instruct-mode SETUP.md blob with per-server `tools[]`
 *   and `COPILOT_MCP_*` secret instructions (web-UI-only surface).
 *
 * Gap channel: core's `Emitter.compile` returns `FileOp[]` only, so this
 * package defines `compileCopilot(ir, snapshot): { ops, gaps }` as the full
 * surface (mirroring @patterson/emitter-claude-code) and exposes
 * `copilotEmitter` as the core-conformant projection (`compile` → `ops`).
 * Frontends needing gaps call `compileCopilot` directly.
 */
import type { CoverageGap, Emitter, FileOp, FsSnapshot, PattersonProject } from "@patterson/core";

import { buildAgentOps } from "./agents.ts";
import { targetsCopilot } from "./common.ts";
import { buildInstructionOps, COPILOT_INSTRUCTIONS_PATH } from "./instructions.ts";
import { buildCodingAgentMcpOp } from "./mcp.ts";
import { buildPromptOps } from "./prompts.ts";
import { buildSetupStepsOp } from "./setup-steps.ts";
import { buildSkillOps, canonicalSkillPath, isSafeSkillFileEntry } from "./skills.ts";

export interface CompileOutput {
  ops: FileOp[];
  gaps: CoverageGap[];
}

/** Full compile: FileOps plus the CoverageGap list (contracts/emitter.md obligation 3). */
export function compileCopilot(ir: PattersonProject, snapshot: FsSnapshot): CompileOutput {
  const instructions = buildInstructionOps(ir);
  const agents = buildAgentOps(ir);
  const prompts = buildPromptOps(ir);
  const skills = buildSkillOps(ir, snapshot);
  const setupSteps = buildSetupStepsOp(ir);
  const mcp = buildCodingAgentMcpOp(ir);

  const ops: FileOp[] = [
    ...instructions.ops,
    ...agents.ops,
    ...prompts.ops,
    ...skills.ops,
    ...(setupSteps.op ? [setupSteps.op] : []),
    ...(mcp.op ? [mcp.op] : []),
  ];
  const gaps: CoverageGap[] = [
    ...instructions.gaps,
    ...agents.gaps,
    ...prompts.gaps,
    ...skills.gaps,
    ...setupSteps.gaps,
    ...mcp.gaps,
  ];
  return { ops, gaps };
}

/** Core-contract emitter (gaps available via compileCopilot). */
export const copilotEmitter: Emitter = {
  targets: ["copilot"],
  compile: (ir, snapshot) => compileCopilot(ir, snapshot).ops,
};

/**
 * Root-relative paths this emitter wants captured in the FsSnapshot before
 * compile: the existing merge surface plus the canonical files of every
 * copilot-targeted skill (copilot always copies, so their content can only
 * come from the snapshot).
 */
export function snapshotPaths(ir: PattersonProject): string[] {
  const paths = [COPILOT_INSTRUCTIONS_PATH];
  for (const skill of ir.skills) {
    if (!targetsCopilot(skill)) continue;
    for (const file of skill.files ?? []) {
      // Unsafe entries (traversal, absolute, backslash) are never read; the
      // compile pass reports them as CoverageGaps.
      if (!isSafeSkillFileEntry(file)) continue;
      paths.push(canonicalSkillPath(skill.name, file));
    }
  }
  return paths;
}

/**
 * Snapshot-aware coverage hook: the gap list for `patterson check` (silent
 * drops are contract violations — contracts/emitter.md obligation 3).
 */
export function coverageGaps(ir: PattersonProject, snapshot: FsSnapshot): CoverageGap[] {
  return compileCopilot(ir, snapshot).gaps;
}

export { GITHUB_AGENTS_DIR } from "./agents.ts";
export { COPILOT_INSTRUCTIONS_PATH, INSTRUCTIONS_DIR, instructionSentinelId } from "./instructions.ts";
export { CODING_AGENT_MCP_PATH } from "./mcp.ts";
export { PROMPTS_DIR } from "./prompts.ts";
export { SETUP_STEPS_JOB_ID, SETUP_STEPS_MAX_MINUTES, SETUP_STEPS_PATH } from "./setup-steps.ts";
export { AGENTS_SKILLS_DIR, canonicalSkillPath, GITHUB_SKILLS_DIR, isSafeSkillFileEntry } from "./skills.ts";
