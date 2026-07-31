/**
 * @patterson/emitter-opencode — the opencode emitter (T031).
 *
 * Contract: specs/001-patterson-cli-v1/contracts/emitter.md. Pure and
 * deterministic: same IR + snapshot ⇒ byte-identical FileOps; the emitter
 * reads nothing but the IR and the FsSnapshot and never writes (Constitution I).
 *
 * Surfaces:
 * - `opencode.json` (or an existing `opencode.jsonc`) — MERGE tier key-path
 *   surgery: `$schema`, `skills.paths` (ALWAYS includes ".agents/skills",
 *   S3/D7), `instructions`, `mcp.<name>` (argv → `command` VERBATIM, C1),
 *   `permission` (via the policy.opencode raw escape only), `model`,
 *   `agent.<name>`, `command.<name>` (`template` required).
 * - `AGENTS.md` — the SHARED universal-instruction sentinel regions,
 *   coordinated with the claude-code emitter through identical sentinel ids +
 *   content (one region per block, never two).
 * - `.agents/instructions/<id>.md` — opencode-only universal blocks
 *   (referenced from opencode.json `instructions`).
 * - `.agents/skills/<name>/SKILL.md` — the canonical skill files (byte-
 *   identical to the claude-code emitter's canonical ops).
 *
 * C12 (hostile co-writer): this emitter NEVER emits a FileOp inside
 * `.opencode/` — opencode itself writes there (injected package.json,
 * node_modules), so nothing patterson owns may live in that tree. Agents and
 * commands therefore compile into opencode.json (schema-verified `agent.*` /
 * `command.*` config), NOT into `.opencode/agent|command/*.md`: an own-tier
 * md file there would violate C12, and a sentinel-wrapped merge md file is
 * empirically broken — opencode 1.18.10 ignores frontmatter when an HTML
 * comment precedes it (spike: an agent file with a leading sentinel comment
 * loses its `mode`/`description`; see the unit notes).
 *
 * Gap channel: mirrors the claude-code emitter — `compileOpencode(ir,
 * snapshot): { ops, gaps }` is the full surface; `opencodeEmitter` is the
 * core-conformant projection (`compile` → `ops`). Frontends needing gaps call
 * `compileOpencode` directly.
 */
import type { CoverageGap, Emitter, FileOp, FsSnapshot, PattersonProject } from "@patterson/core";

import { buildConfigOp, OPENCODE_JSON_PATH, OPENCODE_JSONC_PATH } from "./config.ts";
import { buildInstructionOps } from "./instructions.ts";
import { buildSkillOps } from "./skills.ts";

export interface CompileOutput {
  ops: FileOp[];
  gaps: CoverageGap[];
}

/** Full compile: FileOps plus the CoverageGap list (contracts/emitter.md obligation 3). */
export function compileOpencode(ir: PattersonProject, snapshot: FsSnapshot): CompileOutput {
  const instructions = buildInstructionOps(ir);
  const skills = buildSkillOps(ir);
  const config = buildConfigOp(ir, snapshot, instructions.refs);

  const ops: FileOp[] = [config.op, ...instructions.ops, ...skills.ops];
  const gaps: CoverageGap[] = [...config.gaps, ...instructions.gaps, ...skills.gaps];
  return { ops, gaps };
}

/** Core-contract emitter (gaps available via compileOpencode). */
export const opencodeEmitter: Emitter = {
  targets: ["opencode"],
  compile: (ir, snapshot) => compileOpencode(ir, snapshot).ops,
};

/**
 * Root-relative paths this emitter wants captured in the FsSnapshot before
 * compile: the config merge surfaces (json + jsonc — presence selects the
 * patch target). `.opencode/` is deliberately NOT captured: nothing in that
 * hostile-co-writer tree feeds this emitter (C12).
 */
export function snapshotPaths(_ir: PattersonProject): string[] {
  return [OPENCODE_JSON_PATH, OPENCODE_JSONC_PATH];
}

/**
 * Snapshot-aware coverage hook: the gap list for `patterson check` (silent
 * drops are contract violations — contracts/emitter.md obligation 3).
 */
export function coverageGaps(ir: PattersonProject, snapshot: FsSnapshot): CoverageGap[] {
  return compileOpencode(ir, snapshot).gaps;
}

export {
  AGENTS_SKILLS_PATH,
  BUILTIN_AGENT_NAMES,
  buildConfigOp,
  configPath,
  MERGE_SEMANTICS,
  mergeConfigValue,
  OPENCODE_JSON_PATH,
  OPENCODE_JSONC_PATH,
  OPENCODE_SCHEMA_URL,
  semanticsFor,
} from "./config.ts";
export type { MergeSemantics } from "./config.ts";
export {
  AGENTS_MD_PATH,
  instructionSentinelId,
  OPENCODE_INSTRUCTIONS_DIR,
  unscopedSentinelId,
} from "./instructions.ts";
export { AGENTS_SKILLS_DIR } from "./skills.ts";
