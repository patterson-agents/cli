/**
 * The never-write guard (Constitution II, NON-NEGOTIABLE).
 *
 * The CLI MUST NEVER write:
 *   - `skills-lock.json` (any directory)
 *   - `.skill-lock.json` (any directory — covers the global/XDG variants when
 *     an absolute or home-relative path is handed in)
 *   - `.claude/settings.local.json` beyond first creation
 *
 * The guard sits inside the engine's single write path (applyFileOps) and is
 * additionally run as a pre-flight over a whole batch so a forbidden op aborts
 * before anything at all is written.
 */
import { PattersonNeverWriteError } from "./errors.ts";

const NEVER_WRITE_BASENAMES = new Set(["skills-lock.json", ".skill-lock.json"]);

const SETTINGS_LOCAL = ".claude/settings.local.json";

function normalize(path: string): string {
  return path.replaceAll("\\", "/");
}

/**
 * Throws PattersonNeverWriteError when `path` may not be written.
 *
 * @param path root-relative (or absolute) path about to be written
 * @param opts.exists whether the file currently exists — settings.local.json
 *   is create-only: first creation is allowed, any later write is refused.
 */
export function assertWritable(path: string, opts: { exists: boolean }): void {
  const norm = normalize(path);
  const base = norm.split("/").at(-1) ?? norm;

  if (NEVER_WRITE_BASENAMES.has(base)) {
    throw new PattersonNeverWriteError(path, `"${base}" is on the never-write list (Constitution II).`);
  }

  if ((norm === SETTINGS_LOCAL || norm.endsWith(`/${SETTINGS_LOCAL}`)) && opts.exists) {
    throw new PattersonNeverWriteError(
      path,
      `"${SETTINGS_LOCAL}" may only be created once and never modified (Constitution II).`,
    );
  }
}
