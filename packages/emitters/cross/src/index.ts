/**
 * @patterson/emitter-cross — cross-cutting concerns no single-target emitter
 * can own (T034; contracts/emitter.md "Cross-cutting"):
 *
 * - C7 chain guard: Zed reads exactly one instructions file by first-match
 *   over a fixed chain, including files patterson never wrote. The guard is a
 *   check (registered into the core check registry, consumed by
 *   doctor/check), not a compile step — reachability of the REAL disk state
 *   is only observable at check time.
 * - Coverage reporter: aggregates every emitter's `CoverageGap[]` into the
 *   one stable table `patterson check` prints (obligation 3: silent drops are
 *   contract violations).
 */
import type { CheckDef } from "@patterson/core";

import { zedChainGuardCheck } from "./chain.ts";

export {
  AGENTS_MD,
  docCarriesBlock,
  instructionSentinelId,
  scanZedChain,
  ZED_CHAIN,
  ZED_CHAIN_CHECK_ID,
  zedChainGuardCheck,
  zedReachingBlocks,
} from "./chain.ts";
export type { ZedChainFile, ZedChainScan } from "./chain.ts";

export { aggregateCoverageGaps, compareCoverageRows, renderCoverageTable } from "./coverage.ts";
export type { CoverageReport, CoverageRow } from "./coverage.ts";

/** Every cross-cutting check, in registration order (wire into CheckRegistry). */
export const crossChecks: CheckDef[] = [zedChainGuardCheck];
