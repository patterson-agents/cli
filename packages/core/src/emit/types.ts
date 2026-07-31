/**
 * Emission-layer types: FileOp, Emitter, FsSnapshot, DriftConflict, CoverageGap.
 *
 * Source of truth: specs/001-patterson-cli-v1/contracts/emitter.md and
 * data-model.md ("Emission layer").
 */
import type { PattersonProject, TargetId } from "../ir/index.ts";

/** Formats the engine knows how to apply. Merge surgery exists for markdown (sentinels) and json/jsonc (key paths). */
export type FileFormat = "markdown" | "json" | "jsonc" | "yaml" | "toml" | "text";

/** One JSON key-path assignment inside a merge-tier structured file. */
export interface KeyPathPatch {
  /** jsonc-parser JSONPath segments, e.g. ["mcpServers", "docs", "command"]. */
  keyPath: (string | number)[];
  value: unknown;
}

/**
 * A single intended file change produced by an emitter.
 *
 * - `own`: whole-file ownership; requires `content`.
 * - `merge` + `sentinelId`: markdown sentinel region; requires `content`.
 * - `merge` + `patch`: structured key-path surgery (json/jsonc).
 * - `instruct`: never written to `path`; rendered into SETUP.md.
 */
export interface FileOp {
  /** Project-root-relative POSIX path. */
  path: string;
  format: FileFormat;
  mode: "own" | "merge" | "instruct";
  content?: string;
  patch?: KeyPathPatch[];
  sentinelId?: string;
  /** Recorded on the EmissionRecord for skill links (data-model `linkMode`). */
  linkMode?: "symlink" | "copy";
}

/**
 * Read-only capture of the listed target files, taken before compile. Emitters
 * MUST NOT read anything else (Constitution I) and MUST NOT write.
 */
export interface FsSnapshot {
  readonly root: string;
  /** Content of a captured path, or null when missing/not captured. */
  read(path: string): string | null;
  /** True when the path was captured and existed. */
  has(path: string): boolean;
  /** All captured paths (existing or not). */
  paths(): string[];
}

/** Contract: every emitter package implements exactly this (contracts/emitter.md). */
export interface Emitter {
  /** Target binding lives in emitter identity; "cross" for cross-cutting emitters. */
  targets: TargetId[] | "cross";
  /** Pure & deterministic: same IR + snapshot ⇒ byte-identical FileOps. */
  compile(ir: PattersonProject, snapshot: FsSnapshot): FileOp[];
}

/** Reachability gap: an entity an emitter cannot express (silent drops are contract violations). */
export interface CoverageGap {
  entityId: string;
  targetId: TargetId;
  reason: string;
  fallbackApplied: boolean;
}

/**
 * A drift conflict: hand-edited (or unrecorded) content the engine kept instead
 * of overwriting. Non-interactive frontends map a non-empty conflict list to
 * exit code 2 / an MCP structured conflict result.
 */
export interface DriftConflict {
  path: string;
  /** Set for structured-file conflicts (RFC 6901-style pointer). */
  keyPath?: string;
  /** Set for markdown sentinel-region conflicts. */
  sentinelId?: string;
  reason: "hand-edited" | "unrecorded";
  recordedHash?: string;
  currentHash: string;
  /** The flag that authorizes overwriting (contracts/command-registry.md). */
  resolvingFlag: "--accept-generated";
}

/** Options for applyFileOps — the engine's single write path. */
export interface ApplyOptions {
  /** Project root all FileOp paths are resolved against. */
  root: string;
  /** Hash of the IR this emission derives from (recorded, never rendered). */
  irHash: string;
  /** Overwrite drifted content (after backup) instead of keeping + reporting. */
  acceptGenerated?: boolean;
  /** Adoption mode (init): pre-existing keys/regions/files become `foreign` (hand-owned forever). */
  adopt?: boolean;
  /** Compute the full plan and result without writing anything. */
  dryRun?: boolean;
  /** Clock injection for tests; only ever used for EmissionRecord.emittedAt and backup names. */
  now?: () => Date;
  /** Where instruct-tier steps are rendered (default "SETUP.md"). */
  setupPath?: string;
}

/** Result of one applyFileOps run. */
export interface ApplyResult {
  /** Paths written (or that would be written under dryRun). */
  written: string[];
  /** Drift kept + reported; empty ⇔ fully applied. */
  conflicts: DriftConflict[];
  /** Foreign (adopted, hand-owned) paths/keys skipped silently: "path" or "path#key". */
  foreignSkipped: string[];
  /** Backup files created under .patterson/backup/ before accepted overwrites. */
  backups: string[];
  /** SETUP.md path when instruct ops were rendered, else null. */
  setupPath: string | null;
}
