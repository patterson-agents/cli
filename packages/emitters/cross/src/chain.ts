/**
 * C7 chain guard (T034) — cross-cutting Zed instructions-chain check.
 *
 * Zed reads exactly ONE instructions file, chosen by first-match over a fixed
 * chain — including files patterson never wrote (research.md D6/C7). When a
 * foreign file (e.g. a pre-existing `.cursorrules`) wins the chain, every
 * patterson-managed instruction block in AGENTS.md silently never reaches
 * Zed. This check scans the REAL disk chain, names the winning file, lists
 * the unreachable blocks, and offers the two fix decisions (fold the managed
 * blocks behind patterson sentinels into the winner, or rename the winner so
 * AGENTS.md wins).
 *
 * Pure inspection through CheckCtx (Constitution I/III): reads only the chain
 * files under `ctx.cwd`, never prompts, never writes.
 */
import { join } from "node:path";

import {
  findSentinel,
  type CheckCtx,
  type CheckDef,
  type Finding,
  type InstructionBlock,
  type PattersonProject,
} from "@patterson/core";

// ---------------------------------------------------------------------------
// The chain
// ---------------------------------------------------------------------------

/**
 * Zed's first-match instructions chain, in priority order (highest first).
 * Source: research.md D6 (verified reach matrix) — Zed reads exactly one of
 * these, the first that exists on disk.
 */
export const ZED_CHAIN = [
  ".rules",
  ".cursorrules",
  ".windsurfrules",
  ".clinerules",
  ".github/copilot-instructions.md",
  "AGENT.md",
  "AGENTS.md",
  "CLAUDE.md",
] as const;

export type ZedChainFile = (typeof ZED_CHAIN)[number];

/** The chain file patterson manages (D6: AGENTS.md is the widest artifact). */
export const AGENTS_MD: ZedChainFile = "AGENTS.md";

const ZED_TARGET = "zed";

// ---------------------------------------------------------------------------
// Disk scan
// ---------------------------------------------------------------------------

export interface ZedChainScan {
  /** Chain files present on disk, in chain (priority) order. */
  present: ZedChainFile[];
  /** First-match winner, or null when no chain file exists. */
  winner: ZedChainFile | null;
  /** Content of the winning file ("" when `winner` is null). */
  winnerContent: string;
}

/** Scan the real disk chain under `root` (read-only; missing files skipped). */
export async function scanZedChain(root: string): Promise<ZedChainScan> {
  const present: ZedChainFile[] = [];
  let winnerContent = "";
  for (const rel of ZED_CHAIN) {
    const file = Bun.file(join(root, rel));
    if (!(await file.exists())) continue;
    if (present.length === 0) winnerContent = await file.text();
    present.push(rel);
  }
  const winner = present[0] ?? null;
  return { present, winner, winnerContent };
}

// ---------------------------------------------------------------------------
// Block reachability
// ---------------------------------------------------------------------------

/**
 * Sentinel id for a universal instruction block. Mirrors the claude-code
 * emitter's `instructionSentinelId` — the AGENTS.md sentinel-id convention is
 * shared across emitters (D6; opencode coordinates on the same block id) and
 * MUST stay in sync with `@patterson/emitter-claude-code`.
 */
export function instructionSentinelId(blockId: string): string {
  return `instruction:${blockId}`;
}

/** Same alphabet core's sentinel module accepts; invalid ids can never appear in a doc. */
const SENTINEL_SAFE_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/;

/**
 * Universal instruction blocks that compile into AGENTS.md for Zed: entity
 * `targets` absent means "all root targets" (ir/values.ts); path-scoped
 * blocks go to per-agent rules files, not the chain.
 */
export function zedReachingBlocks(ir: PattersonProject): InstructionBlock[] {
  return ir.instructions.filter(
    (block) => block.reach === "universal" && (block.targets === undefined || block.targets.includes(ZED_TARGET)),
  );
}

/** True when `doc` carries the patterson sentinel region for `block`. */
export function docCarriesBlock(doc: string, block: InstructionBlock): boolean {
  const id = instructionSentinelId(block.id);
  if (!SENTINEL_SAFE_RE.test(id)) return false;
  return findSentinel(doc, id) !== null;
}

// ---------------------------------------------------------------------------
// The check
// ---------------------------------------------------------------------------

export const ZED_CHAIN_CHECK_ID = "cross.zed-chain";

const FOLD_OR_RENAME = (winner: string): string =>
  `Either fold the managed instruction blocks behind patterson sentinels into "${winner}", ` +
  `or rename "${winner}" so "AGENTS.md" wins the chain.`;

async function runZedChainGuard(ctx: CheckCtx): Promise<Finding[]> {
  const ir = ctx.ir;
  // No IR (adoption/init) or zed not targeted: the chain is not our concern.
  if (!ir || !ir.targets.includes(ZED_TARGET)) return [];

  const blocks = zedReachingBlocks(ir);
  const scan = await scanZedChain(ctx.cwd);

  if (scan.winner === null) {
    if (blocks.length === 0) return [];
    const ids = blocks.map((block) => `"${block.id}"`).join(", ");
    return [
      {
        checkId: ZED_CHAIN_CHECK_ID,
        severity: "warn",
        message:
          `No file in Zed's instructions chain (${ZED_CHAIN.join(", ")}) exists on disk; ` +
          `${blocks.length} managed instruction block(s) (${ids}) cannot reach Zed.`,
        fix: "Run `patterson sync` to emit AGENTS.md with the managed regions.",
      },
    ];
  }

  const winner = scan.winner;
  const unreachable = blocks.filter((block) => !docCarriesBlock(scan.winnerContent, block));

  if (winner === AGENTS_MD) {
    // Our file wins — but a hand-written AGENTS.md may lack the managed regions.
    return unreachable.map((block) => ({
      checkId: ZED_CHAIN_CHECK_ID,
      severity: "warn",
      path: AGENTS_MD,
      message:
        `AGENTS.md wins Zed's instructions chain but carries no patterson region for ` +
        `instruction block "${block.id}" — the block cannot reach Zed.`,
      fix: "Run `patterson sync` to (re)emit the managed region into AGENTS.md.",
    }));
  }

  // A foreign file wins the chain.
  if (unreachable.length > 0) {
    const summary: Finding = {
      checkId: ZED_CHAIN_CHECK_ID,
      severity: "warn",
      path: winner,
      message:
        `Zed reads "${winner}", not AGENTS.md — it is the first match in Zed's instructions ` +
        `chain (present: ${scan.present.join(" → ")}). ${unreachable.length} managed instruction ` +
        `block(s) never reach Zed.`,
      fix: FOLD_OR_RENAME(winner),
    };
    const perBlock: Finding[] = unreachable.map((block) => ({
      checkId: ZED_CHAIN_CHECK_ID,
      severity: "warn",
      path: winner,
      message:
        `Instruction block "${block.id}" is unreachable in Zed: it compiles into AGENTS.md ` +
        `but "${winner}" wins the first-match chain.`,
      fix: FOLD_OR_RENAME(winner),
    }));
    return [summary, ...perBlock];
  }

  if (blocks.length > 0) {
    // The "fold" fix has been applied: the winner carries every managed region.
    return [
      {
        checkId: ZED_CHAIN_CHECK_ID,
        severity: "info",
        path: winner,
        message:
          `Zed reads "${winner}", not AGENTS.md, but every managed instruction block is ` +
          `folded behind a patterson sentinel there — all blocks reach Zed.`,
      },
    ];
  }

  return [
    {
      checkId: ZED_CHAIN_CHECK_ID,
      severity: "info",
      path: winner,
      message:
        `Zed reads "${winner}" (first match in its instructions chain); patterson manages ` +
        `no universal instruction blocks for Zed.`,
    },
  ];
}

/** The C7 chain-guard check, ready for CheckRegistry.register. */
export const zedChainGuardCheck: CheckDef = {
  id: ZED_CHAIN_CHECK_ID,
  description: "C7: Zed reads one instructions file by first-match — verify managed blocks are reachable",
  run: runZedChainGuard,
};
