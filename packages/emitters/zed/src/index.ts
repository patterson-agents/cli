/**
 * @patterson/emitter-zed — the zed emitter (T032).
 *
 * Contract: specs/001-patterson-cli-v1/contracts/emitter.md. Pure and
 * deterministic: same IR + snapshot ⇒ byte-identical FileOps; the emitter
 * reads nothing but the IR and the FsSnapshot and never writes (Constitution I).
 *
 * S6 verdict: **file** — project-scope `.zed/settings.json` carries
 * `context_servers` (research.md S6), so project-scoped MCP servers are
 * emitted there (merge tier, C2 shape: no `type` discriminator). Everything
 * else about Zed is either an instruct-tier note (extensions install to the
 * USER machine; worktree trust gate) or a CoverageGap (Zed's project-scope
 * surface is context_servers + context_server_timeout only).
 *
 * C7 participation: Zed reads exactly one instructions file (first-match
 * chain). This emitter emits NO chain file (no .rules, no AGENTS.md — the
 * cross package owns chain analysis); it declares the file it expects to win
 * via `ZED_EXPECTED_INSTRUCTIONS_FILE`.
 *
 * Gap channel: like the claude-code emitter, `compileZed(ir, snapshot)`
 * returns `{ ops, gaps }` as the full surface; `zedEmitter` is the
 * core-conformant projection (`compile` → `ops`). Frontends needing gaps call
 * `compileZed` (or `coverageGaps`) directly.
 */
import type { CoverageGap, Emitter, FileOp, FsSnapshot, PattersonProject } from "@patterson/core";

import { buildCoverageGaps } from "./coverage.ts";
import { buildExtensionOps } from "./extensions.ts";
import { buildContextServersOp, ZED_SETTINGS_PATH } from "./settings.ts";

export interface CompileOutput {
  ops: FileOp[];
  gaps: CoverageGap[];
}

/** Full compile: FileOps plus the CoverageGap list (contracts/emitter.md obligation 3). */
export function compileZed(ir: PattersonProject, _snapshot: FsSnapshot): CompileOutput {
  // The snapshot is accepted per the Emitter contract but unused today: every
  // emitted key path is whole-value override (per-server objects), so the
  // engine's key-path surgery needs no emitter-side merge computation.
  const settings = buildContextServersOp(ir);
  const extensions = buildExtensionOps(ir);

  return {
    ops: [...settings.ops, ...extensions.ops],
    gaps: [...settings.gaps, ...extensions.gaps, ...buildCoverageGaps(ir)],
  };
}

/** Core-contract emitter (gaps available via compileZed). */
export const zedEmitter: Emitter = {
  targets: ["zed"],
  compile: (ir, snapshot) => compileZed(ir, snapshot).ops,
};

/**
 * Root-relative paths this emitter wants captured in the FsSnapshot before
 * compile: the single merge surface it patches.
 */
export function snapshotPaths(_ir: PattersonProject): string[] {
  return [ZED_SETTINGS_PATH];
}

/**
 * Snapshot-aware coverage hook: the gap list for `patterson check` (silent
 * drops are contract violations — contracts/emitter.md obligation 3).
 */
export function coverageGaps(ir: PattersonProject, snapshot: FsSnapshot): CoverageGap[] {
  return compileZed(ir, snapshot).gaps;
}

export { CHAIN_WRITER_TARGETS, ZED_EXPECTED_INSTRUCTIONS_FILE, ZED_TARGET } from "./common.ts";
export { ZED_EXTENSIONS_INSTRUCT_PATH } from "./extensions.ts";
export {
  assertZedProjectKeyPath,
  TRUST_NOTE_CONTENT,
  ZED_PROJECT_SETTINGS_KEYS,
  ZED_SETTINGS_PATH,
} from "./settings.ts";
