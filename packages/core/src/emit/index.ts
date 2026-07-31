/**
 * Barrel for the emit engine (T015).
 *
 * Contracts: specs/001-patterson-cli-v1/contracts/emitter.md and
 * data-model.md "Emission layer"; Constitution I–II.
 */
export { ABSENT_HASH, applyFileOps, RESOLVING_FLAG } from "./apply.ts";
export { backupFile, backupName, BACKUP_DIR } from "./backup.ts";
export { classifyDrift } from "./drift.ts";
export type { DriftState } from "./drift.ts";
export { PattersonNeverWriteError } from "./errors.ts";
export { computeIrHash, contentHash, sha256Hex, stableStringify, valueHash } from "./hash.ts";
export { renderSetupMd } from "./instruct.ts";
export { formatKeyPath, readValueAt, setValueAt } from "./jsonc-merge.ts";
export { assertWritable } from "./never-write.ts";
export {
  EMITTED_RELATIVE_PATH,
  loadProvenance,
  saveProvenance,
  serializeProvenance,
} from "./provenance.ts";
export type { EmissionRecord, EmittedKeyPath } from "./provenance.ts";
export { beginMarker, endMarker, findSentinel, renderSentinelBlock, upsertSentinel } from "./sentinel.ts";
export type { SentinelMatch } from "./sentinel.ts";
export { captureSnapshot } from "./snapshot.ts";
export type {
  ApplyOptions,
  ApplyResult,
  CoverageGap,
  DriftConflict,
  Emitter,
  FileFormat,
  FileOp,
  FsSnapshot,
  KeyPathPatch,
} from "./types.ts";
