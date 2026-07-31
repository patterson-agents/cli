/**
 * FsSnapshot — read-only capture of the listed target paths, handed to
 * emitters for merge computation (Constitution I: emitters may read nothing
 * else, and never write).
 */
import { join } from "node:path";

import type { FsSnapshot } from "./types.ts";

/** Capture the listed root-relative paths. Missing files are captured as null. */
export async function captureSnapshot(root: string, paths: readonly string[]): Promise<FsSnapshot> {
  const files = new Map<string, string | null>();
  for (const path of paths.toSorted()) {
    const file = Bun.file(join(root, path));
    files.set(path, (await file.exists()) ? await file.text() : null);
  }
  return {
    root,
    read: (path) => files.get(path) ?? null,
    has: (path) => (files.get(path) ?? null) !== null,
    paths: () => [...files.keys()],
  };
}
