/**
 * Tutor progress persistence — `.patterson/tutor-progress.json` (a
 * patterson-owned bookkeeping file, like wizard state; NOT on the
 * never-write list).
 */
import { join } from "node:path";

import { ProgressSchema, type Progress } from "./types.ts";

export const PROGRESS_PATH = ".patterson/tutor-progress.json";

export function freshProgress(): Progress {
  return { version: 1, completed: {} };
}

/** Load progress; a missing or corrupt file degrades to fresh progress. */
export async function loadProgress(cwd: string): Promise<Progress> {
  const file = Bun.file(join(cwd, PROGRESS_PATH));
  if (!(await file.exists())) return freshProgress();
  try {
    const parsed = ProgressSchema.safeParse(await file.json());
    return parsed.success ? parsed.data : freshProgress();
  } catch {
    return freshProgress();
  }
}

export async function saveProgress(cwd: string, progress: Progress): Promise<void> {
  await Bun.write(join(cwd, PROGRESS_PATH), `${JSON.stringify(progress, null, 2)}\n`);
}

/** Record a completed lesson (timestamp supplied by the caller for determinism). */
export async function markCompleted(
  cwd: string,
  lessonId: string,
  completedAt: string,
): Promise<Progress> {
  const progress = await loadProgress(cwd);
  progress.completed[lessonId] = completedAt;
  await saveProgress(cwd, progress);
  return progress;
}
