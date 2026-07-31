/**
 * applyFileOps — the emit engine's SINGLE write path.
 *
 * Everything that touches disk goes through `writeTarget`, which runs the
 * never-write guard; a pre-flight pass additionally guards the whole batch so
 * a forbidden op aborts before anything is written (Constitution II).
 *
 * Behavior per tier:
 *   own      — whole-file ownership with contentHash drift baseline.
 *   merge    — markdown sentinel regions (content + sentinelId) or structured
 *              key-path surgery (patch) with per-key baselines.
 *   instruct — collected and rendered into SETUP.md (own-tier via this same path).
 *
 * Drift: current==recorded → rewrite; differ → keep + report DriftConflict
 * (frontends map to exit 2 / MCP structured conflicts); `acceptGenerated`
 * overwrites after a backup; `adopt` marks pre-existing content foreign.
 */
import { join } from "node:path";

import { backupFile, backupName, BACKUP_DIR } from "./backup.ts";
import { classifyDrift } from "./drift.ts";
import { contentHash, valueHash } from "./hash.ts";
import { renderSetupMd } from "./instruct.ts";
import { formatKeyPath, readValueAt, setValueAt } from "./jsonc-merge.ts";
import { assertWritable } from "./never-write.ts";
import {
  loadProvenance,
  saveProvenance,
  type EmissionRecord,
  type EmittedKeyPath,
} from "./provenance.ts";
import { findSentinel, upsertSentinel } from "./sentinel.ts";
import type { ApplyOptions, ApplyResult, FileOp } from "./types.ts";

/** The flag that authorizes overwriting drifted content (command-registry contract). */
export const RESOLVING_FLAG = "--accept-generated" as const;

const DEFAULT_SETUP_PATH = "SETUP.md";

/**
 * `currentHash` marker for deletion drift: recorded content that no longer
 * exists on disk. Hand-deletion is drift like any other hand-edit — the
 * deletion is kept and reported, never silently reverted (Constitution II).
 */
export const ABSENT_HASH = "absent" as const;

interface EngineCtx {
  root: string;
  irHash: string;
  acceptGenerated: boolean;
  adopt: boolean;
  dryRun: boolean;
  now: () => Date;
  records: Map<string, EmissionRecord>;
  result: ApplyResult;
  backedUp: Set<string>;
}

/** Apply a batch of FileOps. Never prompts; never clobbers drift without acceptGenerated. */
export async function applyFileOps(ops: readonly FileOp[], options: ApplyOptions): Promise<ApplyResult> {
  const ctx: EngineCtx = {
    root: options.root,
    irHash: options.irHash,
    acceptGenerated: options.acceptGenerated ?? false,
    adopt: options.adopt ?? false,
    dryRun: options.dryRun ?? false,
    now: options.now ?? (() => new Date()),
    records: await loadProvenance(options.root),
    result: { written: [], conflicts: [], foreignSkipped: [], backups: [], setupPath: null },
    backedUp: new Set(),
  };

  const setupPath = options.setupPath ?? DEFAULT_SETUP_PATH;
  const instructs = ops.filter((op) => op.mode === "instruct");
  const writes = ops.filter((op) => op.mode !== "instruct");

  // Pre-flight: guard every path the batch could write before writing anything.
  // A path counts as existing when it is on disk OR targeted by an earlier op
  // in this same batch — so a create-once path (.claude/settings.local.json)
  // that the batch would create and then touch again fails up front instead of
  // aborting mid-batch after earlier files were written.
  const touchedInBatch = new Set<string>();
  const preflight = async (relPath: string): Promise<void> => {
    const exists =
      touchedInBatch.has(relPath) || (await Bun.file(join(ctx.root, relPath)).exists());
    assertWritable(relPath, { exists });
    touchedInBatch.add(relPath);
  };
  for (const op of writes) await preflight(op.path);
  if (instructs.length > 0) await preflight(setupPath);

  for (const op of writes) await applyOne(op, ctx);

  if (instructs.length > 0) {
    await applyOwn(
      { path: setupPath, format: "markdown", mode: "own", content: renderSetupMd(instructs) },
      ctx,
    );
    ctx.result.setupPath = setupPath;
  }

  if (!ctx.dryRun) await saveProvenance(ctx.root, ctx.records);
  return ctx.result;
}

// ---------------------------------------------------------------------------
// Guarded write helpers (the single write path)
// ---------------------------------------------------------------------------

async function writeTarget(ctx: EngineCtx, relPath: string, content: string): Promise<void> {
  const abs = join(ctx.root, relPath);
  assertWritable(relPath, { exists: await Bun.file(abs).exists() });
  if (!ctx.dryRun) await Bun.write(abs, content);
  ctx.result.written.push(relPath);
}

async function backupBeforeOverwrite(ctx: EngineCtx, relPath: string): Promise<void> {
  if (ctx.backedUp.has(relPath)) return;
  if (!(await Bun.file(join(ctx.root, relPath)).exists())) return;
  ctx.backedUp.add(relPath);
  if (ctx.dryRun) {
    // Faithful plan: report the backup the real run would create, write nothing.
    ctx.result.backups.push(`${BACKUP_DIR}/${backupName(relPath, ctx.now())}`);
    return;
  }
  ctx.result.backups.push(await backupFile(ctx.root, relPath, ctx.now()));
}

// ---------------------------------------------------------------------------
// Record helpers
// ---------------------------------------------------------------------------

function upsertRecord(
  ctx: EngineCtx,
  path: string,
  mode: EmissionRecord["mode"],
  mutate: (record: EmissionRecord) => void,
): void {
  const previous = ctx.records.get(path);
  const record: EmissionRecord = previous
    ? { ...previous }
    : { path, mode, emittedAt: "", irHash: "" };
  record.mode = mode;
  record.emittedAt = ctx.now().toISOString();
  record.irHash = ctx.irHash;
  mutate(record);
  ctx.records.set(path, record);
}

/** Replace the entries whose pointer appears in `entries`, keeping all others. */
function mergeKeyPaths(
  existing: readonly EmittedKeyPath[] | undefined,
  entries: readonly EmittedKeyPath[],
): EmittedKeyPath[] {
  const replaced = new Set(entries.map((entry) => entry.path));
  return [...(existing ?? []).filter((entry) => !replaced.has(entry.path)), ...entries];
}

function addForeign(record: EmissionRecord, key: string): void {
  const foreign = record.foreign ?? [];
  if (!foreign.includes(key)) record.foreign = [...foreign, key];
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

async function applyOne(op: FileOp, ctx: EngineCtx): Promise<void> {
  if (op.mode === "own") return applyOwn(op, ctx);
  if (op.sentinelId !== undefined) return applyMarkdownMerge(op, ctx);
  if (op.patch !== undefined) return applyStructuredMerge(op, ctx);
  throw new Error(
    `Invalid merge FileOp for "${op.path}": a merge op needs either sentinelId+content (markdown) or patch (json/jsonc).`,
  );
}

// ---------------------------------------------------------------------------
// OWN tier
// ---------------------------------------------------------------------------

async function applyOwn(op: FileOp, ctx: EngineCtx): Promise<void> {
  const desired = op.content;
  if (desired === undefined) throw new Error(`own-tier FileOp for "${op.path}" requires content.`);

  const file = Bun.file(join(ctx.root, op.path));
  const current = (await file.exists()) ? await file.text() : null;
  const record = ctx.records.get(op.path);
  const desiredHash = contentHash(desired);

  if (record?.foreign?.includes("content")) {
    ctx.result.foreignSkipped.push(op.path);
    return;
  }

  const recordOwn = (hash: string): void => {
    upsertRecord(ctx, op.path, "own", (rec) => {
      rec.contentHash = hash;
      if (op.linkMode !== undefined) rec.linkMode = op.linkMode;
    });
  };

  if (current === null) {
    // Deletion drift: the file was emitted before (recorded baseline exists)
    // but is gone now. Keep the deletion + report; acceptGenerated recreates.
    if (record?.contentHash !== undefined && !ctx.acceptGenerated) {
      ctx.result.conflicts.push({
        path: op.path,
        reason: "hand-edited",
        recordedHash: record.contentHash,
        currentHash: ABSENT_HASH,
        resolvingFlag: RESOLVING_FLAG,
      });
      return;
    }
    await writeTarget(ctx, op.path, desired);
    recordOwn(desiredHash);
    return;
  }

  const currentHash = contentHash(current);
  if (current === desired) {
    recordOwn(desiredHash);
    return;
  }

  const state = classifyDrift(record?.contentHash, currentHash);
  if (state === "clean") {
    await writeTarget(ctx, op.path, desired);
    recordOwn(desiredHash);
    return;
  }

  if (ctx.acceptGenerated) {
    await backupBeforeOverwrite(ctx, op.path);
    await writeTarget(ctx, op.path, desired);
    recordOwn(desiredHash);
    return;
  }

  if (state === "unrecorded" && ctx.adopt) {
    // Adoption (init): the pre-existing file is hand-owned forever.
    upsertRecord(ctx, op.path, "own", (rec) => {
      rec.contentHash = currentHash;
      addForeign(rec, "content");
    });
    ctx.result.foreignSkipped.push(op.path);
    return;
  }

  ctx.result.conflicts.push({
    path: op.path,
    reason: state === "drifted" ? "hand-edited" : "unrecorded",
    recordedHash: record?.contentHash,
    currentHash,
    resolvingFlag: RESOLVING_FLAG,
  });
}

// ---------------------------------------------------------------------------
// MERGE tier — markdown sentinels
// ---------------------------------------------------------------------------

async function applyMarkdownMerge(op: FileOp, ctx: EngineCtx): Promise<void> {
  const id = op.sentinelId;
  const desired = op.content;
  if (id === undefined || desired === undefined) {
    throw new Error(`markdown merge FileOp for "${op.path}" requires sentinelId and content.`);
  }
  const key = `sentinel:${id}`;

  const file = Bun.file(join(ctx.root, op.path));
  const doc = (await file.exists()) ? await file.text() : "";
  const record = ctx.records.get(op.path);
  const recorded = record?.keyPaths?.find((entry) => entry.path === key);

  if (record?.foreign?.includes(key)) {
    ctx.result.foreignSkipped.push(`${op.path}#${key}`);
    return;
  }

  const desiredHash = contentHash(desired);
  const recordRegion = (value: string, hash: string): void => {
    upsertRecord(ctx, op.path, "merge", (rec) => {
      rec.keyPaths = mergeKeyPaths(rec.keyPaths, [{ path: key, value, hash }]);
    });
  };
  const writeRegion = async (): Promise<void> => {
    const { doc: next } = upsertSentinel(doc, id, desired);
    if (next !== doc) await writeTarget(ctx, op.path, next);
    recordRegion(desired, desiredHash);
  };

  const match = findSentinel(doc, id);
  if (!match) {
    // Deletion drift: the region was emitted before (recorded baseline exists)
    // but the sentinel block is gone. Keep the deletion + report; only
    // acceptGenerated re-appends.
    if (recorded !== undefined && !ctx.acceptGenerated) {
      ctx.result.conflicts.push({
        path: op.path,
        sentinelId: id,
        reason: "hand-edited",
        recordedHash: recorded.hash,
        currentHash: ABSENT_HASH,
        resolvingFlag: RESOLVING_FLAG,
      });
      return;
    }
    if (recorded !== undefined) await backupBeforeOverwrite(ctx, op.path);
    await writeRegion();
    return;
  }

  const regionHash = contentHash(match.content);
  // Recorded baseline; the marker's own hash is the recovery fallback when
  // .patterson/emitted.json is missing.
  const baseline = recorded?.hash ?? match.markerHash;

  if (classifyDrift(baseline, regionHash) === "clean") {
    await writeRegion();
    return;
  }

  if (ctx.acceptGenerated) {
    await backupBeforeOverwrite(ctx, op.path);
    await writeRegion();
    return;
  }

  if (ctx.adopt && !recorded) {
    upsertRecord(ctx, op.path, "merge", (rec) => {
      rec.keyPaths = mergeKeyPaths(rec.keyPaths, [{ path: key, value: match.content, hash: regionHash }]);
      addForeign(rec, key);
    });
    ctx.result.foreignSkipped.push(`${op.path}#${key}`);
    return;
  }

  ctx.result.conflicts.push({
    path: op.path,
    sentinelId: id,
    reason: "hand-edited",
    recordedHash: baseline,
    currentHash: regionHash,
    resolvingFlag: RESOLVING_FLAG,
  });
}

// ---------------------------------------------------------------------------
// MERGE tier — structured (json/jsonc) key paths
// ---------------------------------------------------------------------------

async function applyStructuredMerge(op: FileOp, ctx: EngineCtx): Promise<void> {
  const patch = op.patch;
  if (patch === undefined) throw new Error(`structured merge FileOp for "${op.path}" requires patch.`);

  const file = Bun.file(join(ctx.root, op.path));
  const exists = await file.exists();
  let text = exists ? await file.text() : "{}\n";
  const record = ctx.records.get(op.path);

  const newEntries: EmittedKeyPath[] = [];
  const newForeign: string[] = [];
  let mutated = false;
  let needsBackup = false;

  for (const entry of patch) {
    const pointer = formatKeyPath(entry.keyPath);
    const recorded = record?.keyPaths?.find((kp) => kp.path === pointer);

    if (record?.foreign?.includes(pointer)) {
      ctx.result.foreignSkipped.push(`${op.path}#${pointer}`);
      continue;
    }

    const desiredHash = valueHash(entry.value);
    const current = readValueAt(text, entry.keyPath);

    if (!current.present) {
      // Deletion drift: the key was emitted before (recorded baseline exists)
      // but was removed by hand. Keep the deletion + report; only
      // acceptGenerated re-sets it.
      if (recorded !== undefined && !ctx.acceptGenerated) {
        ctx.result.conflicts.push({
          path: op.path,
          keyPath: pointer,
          reason: "hand-edited",
          recordedHash: recorded.hash,
          currentHash: ABSENT_HASH,
          resolvingFlag: RESOLVING_FLAG,
        });
        continue;
      }
      if (recorded !== undefined) needsBackup = true;
      text = setValueAt(text, entry.keyPath, entry.value);
      mutated = true;
      newEntries.push({ path: pointer, value: entry.value, hash: desiredHash });
      continue;
    }

    const currentHash = valueHash(current.value);
    const state = classifyDrift(recorded?.hash, currentHash);

    if (state === "clean" || (state === "unrecorded" && currentHash === desiredHash && !ctx.adopt)) {
      if (currentHash !== desiredHash) {
        text = setValueAt(text, entry.keyPath, entry.value);
        mutated = true;
      }
      newEntries.push({ path: pointer, value: entry.value, hash: desiredHash });
      continue;
    }

    if (ctx.acceptGenerated) {
      needsBackup = true;
      text = setValueAt(text, entry.keyPath, entry.value);
      mutated = true;
      newEntries.push({ path: pointer, value: entry.value, hash: desiredHash });
      continue;
    }

    if (state === "unrecorded" && ctx.adopt) {
      // Adoption: pre-existing key is hand-owned; record its current value as foreign.
      newForeign.push(pointer);
      newEntries.push({ path: pointer, value: current.value, hash: currentHash });
      ctx.result.foreignSkipped.push(`${op.path}#${pointer}`);
      continue;
    }

    ctx.result.conflicts.push({
      path: op.path,
      keyPath: pointer,
      reason: state === "drifted" ? "hand-edited" : "unrecorded",
      recordedHash: recorded?.hash,
      currentHash,
      resolvingFlag: RESOLVING_FLAG,
    });
  }

  if (mutated) {
    if (needsBackup && exists) await backupBeforeOverwrite(ctx, op.path);
    await writeTarget(ctx, op.path, text);
  }

  if (mutated || newEntries.length > 0 || newForeign.length > 0) {
    upsertRecord(ctx, op.path, "merge", (rec) => {
      rec.keyPaths = mergeKeyPaths(rec.keyPaths, newEntries);
      for (const key of newForeign) addForeign(rec, key);
    });
  }
}
