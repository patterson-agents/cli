/**
 * Backup util: copies a file to `.patterson/backup/<timestamp>-<name>` before
 * an accepted overwrite of drifted content.
 */
import { join } from "node:path";

import { assertWritable } from "./never-write.ts";

export const BACKUP_DIR = ".patterson/backup";

/** Deterministic backup file name for a given source path and instant. */
export function backupName(relPath: string, when: Date): string {
  const timestamp = when.toISOString().replaceAll(":", "-");
  const name = relPath.replaceAll("\\", "/").replaceAll("/", "__");
  return `${timestamp}-${name}`;
}

/**
 * Copy `relPath` (relative to root) into the backup directory.
 * Returns the root-relative path of the backup file.
 */
export async function backupFile(root: string, relPath: string, when: Date): Promise<string> {
  const backupRel = `${BACKUP_DIR}/${backupName(relPath, when)}`;
  // Defense in depth: even this fixed .patterson/** path goes through the
  // never-write guard, so every disk write in the engine is guarded.
  assertWritable(backupRel, { exists: await Bun.file(join(root, backupRel)).exists() });
  await Bun.write(join(root, backupRel), Bun.file(join(root, relPath)));
  return backupRel;
}
