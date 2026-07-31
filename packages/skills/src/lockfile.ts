/**
 * skills-lock.json READER + pre-shell-out backup guard (E-P4, C14).
 *
 * Constitution II: patterson NEVER writes `skills-lock.json` (project, v1
 * schema) or the global `.skill-lock.json` (v3) — both belong to the skills
 * CLI, and both SELF-WIPE on parse failure. The guard exists precisely for
 * that failure mode: before any shell-out that can write the lockfile, we
 * parse it ourselves; unparseable or version-ahead content is backed up to
 * `.patterson/backup/` so the skills CLI's self-wipe can't destroy data.
 */
import { join } from "node:path";
import { z } from "zod";

export const LOCKFILE_BASENAME = "skills-lock.json";

/** The v1 lockfile schema the pinned skills CLI (1.5.21) writes. */
export const LockfileSchema = z.object({
  version: z.literal(1),
  skills: z.record(
    z.string(),
    z.object({
      source: z.string(),
      sourceType: z.string(),
      skillPath: z.string(),
      computedHash: z.string(),
    }),
  ),
});

export type Lockfile = z.infer<typeof LockfileSchema>;

export type LockfileReadResult =
  | { state: "absent" }
  | { state: "ok"; lockfile: Lockfile }
  | { state: "version-ahead"; version: number; raw: string }
  | { state: "unparseable"; reason: string; raw: string };

/** Parse the project lockfile without ever modifying it. */
export async function readLockfile(cwd: string): Promise<LockfileReadResult> {
  const file = Bun.file(join(cwd, LOCKFILE_BASENAME));
  if (!(await file.exists())) return { state: "absent" };
  const raw = await file.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    return {
      state: "unparseable",
      reason: cause instanceof Error ? cause.message : String(cause),
      raw,
    };
  }

  const version = (parsed as { version?: unknown }).version;
  if (typeof version === "number" && version > 1) {
    return { state: "version-ahead", version, raw };
  }

  const result = LockfileSchema.safeParse(parsed);
  if (!result.success) {
    return { state: "unparseable", reason: z.prettifyError(result.error), raw };
  }
  return { state: "ok", lockfile: result.data };
}

export interface GuardOutcome {
  /** True when a backup was written (lockfile was at risk of self-wipe). */
  backedUp: boolean;
  backupPath?: string;
  warnings: string[];
}

/**
 * Pre-shell-out guard: back the lockfile up when the skills CLI would
 * self-wipe it (unparseable) or might rewrite a newer schema it does not
 * understand (version-ahead). A healthy or absent lockfile needs no backup.
 */
export async function backupLockfileIfAtRisk(cwd: string, now: Date = new Date()): Promise<GuardOutcome> {
  const read = await readLockfile(cwd);
  if (read.state === "absent" || read.state === "ok") {
    return { backedUp: false, warnings: [] };
  }

  const stamp = now.toISOString().replaceAll(":", "-");
  const backupRel = join(".patterson", "backup", `${LOCKFILE_BASENAME}.${stamp}`);
  await Bun.write(join(cwd, backupRel), read.raw);

  const why =
    read.state === "version-ahead"
      ? `its version (${read.version}) is newer than the pinned skills CLI understands`
      : `it does not parse (${read.reason.split("\n")[0]})`;
  return {
    backedUp: true,
    backupPath: backupRel,
    warnings: [
      `${LOCKFILE_BASENAME} was backed up to ${backupRel} before invoking the skills CLI: ${why}. ` +
        "The skills CLI self-wipes lockfiles it cannot parse — the backup preserves your data.",
    ],
  };
}
