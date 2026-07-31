/**
 * @patterson/tutor — lesson engine + curriculum + progress (E-P7, US6).
 * Lessons are data; the engine validates real artifacts in the learner's
 * project (GitHub-Skills model). Proprietary curricula are link-out only.
 */
export { LESSONS } from "./curriculum.ts";
export { checkPrerequisites, runLesson } from "./engine.ts";
export { freshProgress, loadProgress, markCompleted, PROGRESS_PATH, saveProgress } from "./progress.ts";
export { LessonSchema, LessonValidatorSchema, ProgressSchema, TRACKS } from "./types.ts";
export type {
  Lesson,
  LessonOutcome,
  LessonValidator,
  Progress,
  StepResult,
  TrackId,
} from "./types.ts";

import { LESSONS } from "./curriculum.ts";
import type { Lesson, Progress, TrackId } from "./types.ts";

/** Lessons of a track, in order. */
export function trackLessons(track: TrackId): Lesson[] {
  return LESSONS.filter((lesson) => lesson.track === track).toSorted((a, b) => a.order - b.order);
}

/** The next incomplete lesson of a track (null = track complete). */
export function nextLesson(track: TrackId, progress: Progress): Lesson | null {
  return trackLessons(track).find((lesson) => progress.completed[lesson.id] === undefined) ?? null;
}
