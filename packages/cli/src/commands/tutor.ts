/**
 * `patterson tutor …` — the AI-fluency tutor surface (E-P7, US6).
 *
 * - `tutor list`: tracks, lessons, licensing tier per lesson.
 * - `tutor status`: progress across tracks (from .patterson/tutor-progress.json).
 * - `tutor next <track>`: validate the track's next lesson against the REAL
 *   project. Pass ⇒ recorded + the next lesson is announced; fail ⇒ each
 *   step's verdict + hint (the tutor never does the work for the learner);
 *   missing prerequisite ⇒ skip-with-explanation, exit 0.
 */
import { z } from "zod";

import { defineCommand, type CommandResult } from "@patterson/core";
import {
  LESSONS,
  loadProgress,
  markCompleted,
  nextLesson,
  runLesson,
  TRACKS,
  trackLessons,
  type TrackId,
} from "@patterson/tutor";

// ---------------------------------------------------------------------------
// tutor list
// ---------------------------------------------------------------------------

export const TutorListInputSchema = z.strictObject({});

export const TutorListOutputSchema = z.strictObject({
  tracks: z.array(
    z.strictObject({
      track: z.string(),
      lessons: z.array(
        z.strictObject({
          id: z.string(),
          title: z.string(),
          licenseTier: z.string(),
          source: z.string().optional(),
        }),
      ),
    }),
  ),
});

export type TutorListOutput = z.infer<typeof TutorListOutputSchema>;

export const tutorListCommand = defineCommand({
  id: "tutor.list",
  path: ["tutor", "list"],
  summary: "List tutor tracks and lessons (with licensing provenance)",
  inputSchema: TutorListInputSchema,
  outputSchema: TutorListOutputSchema,
  annotations: { readOnlyHint: true, destructiveHint: false },
  async run(): Promise<CommandResult<TutorListOutput>> {
    const tracks = TRACKS.map((track) => ({
      track,
      lessons: trackLessons(track).map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        licenseTier: lesson.license.tier,
        ...(lesson.license.source !== undefined ? { source: lesson.license.source } : {}),
      })),
    }));
    return {
      kind: "ok",
      value: { tracks },
      report: {
        summary: `${LESSONS.length} lesson(s) across ${TRACKS.length} track(s).`,
        details: tracks.flatMap((entry) => [
          `${entry.track}:`,
          ...entry.lessons.map((lesson) => `  ${lesson.id} — ${lesson.title} [${lesson.licenseTier}]`),
        ]),
      },
    };
  },
});

// ---------------------------------------------------------------------------
// tutor status
// ---------------------------------------------------------------------------

export const TutorStatusInputSchema = z.strictObject({});

export const TutorStatusOutputSchema = z.strictObject({
  tracks: z.array(
    z.strictObject({
      track: z.string(),
      completed: z.number(),
      total: z.number(),
      nextLessonId: z.string().nullable(),
    }),
  ),
});

export type TutorStatusOutput = z.infer<typeof TutorStatusOutputSchema>;

export const tutorStatusCommand = defineCommand({
  id: "tutor.status",
  path: ["tutor", "status"],
  summary: "Show tutor progress per track",
  inputSchema: TutorStatusInputSchema,
  outputSchema: TutorStatusOutputSchema,
  annotations: { readOnlyHint: true, destructiveHint: false },
  async run(_args, ctx): Promise<CommandResult<TutorStatusOutput>> {
    const progress = await loadProgress(ctx.cwd);
    const tracks = TRACKS.map((track) => {
      const lessons = trackLessons(track);
      const completed = lessons.filter((lesson) => progress.completed[lesson.id] !== undefined).length;
      return {
        track,
        completed,
        total: lessons.length,
        nextLessonId: nextLesson(track, progress)?.id ?? null,
      };
    });
    return {
      kind: "ok",
      value: { tracks },
      report: {
        summary: tracks
          .map((entry) => `${entry.track} ${entry.completed}/${entry.total}`)
          .join(", "),
        details: tracks.map((entry) =>
          entry.nextLessonId === null
            ? `${entry.track}: complete`
            : `${entry.track}: next → ${entry.nextLessonId}`,
        ),
      },
    };
  },
});

// ---------------------------------------------------------------------------
// tutor next <track>
// ---------------------------------------------------------------------------

export const TutorNextInputSchema = z.strictObject({
  track: z.enum(TRACKS),
});

export const TutorNextOutputSchema = z.strictObject({
  lessonId: z.string().nullable(),
  status: z.enum(["passed", "failed", "skipped", "track-complete"]),
  title: z.string().optional(),
  body: z.string().optional(),
  steps: z
    .array(z.strictObject({ ok: z.boolean(), description: z.string(), hint: z.string().optional() }))
    .optional(),
  reason: z.string().optional(),
});

export type TutorNextOutput = z.infer<typeof TutorNextOutputSchema>;

export const tutorNextCommand = defineCommand({
  id: "tutor.next",
  path: ["tutor", "next"],
  summary: "Validate the next lesson of a track against this project",
  inputSchema: TutorNextInputSchema,
  outputSchema: TutorNextOutputSchema,
  annotations: { readOnlyHint: false, destructiveHint: false },
  async run(args, ctx): Promise<CommandResult<TutorNextOutput>> {
    const progress = await loadProgress(ctx.cwd);
    const lesson = nextLesson(args.track as TrackId, progress);
    if (lesson === null) {
      return {
        kind: "ok",
        value: { lessonId: null, status: "track-complete" },
        report: { summary: `Track "${args.track}" is complete.` },
      };
    }

    const outcome = await runLesson(lesson, ctx.cwd);
    if (outcome.status === "skipped") {
      return {
        kind: "ok",
        value: { lessonId: lesson.id, status: "skipped", title: lesson.title, reason: outcome.reason },
        report: { summary: outcome.reason },
      };
    }

    const steps = outcome.steps.map((step) => ({
      ok: step.ok,
      description: step.description,
      ...(step.hint !== undefined ? { hint: step.hint } : {}),
    }));
    const stepLines = steps.map(
      (step) => `${step.ok ? "✓" : "✗"} ${step.description}${step.hint ? ` — ${step.hint}` : ""}`,
    );

    if (outcome.status === "passed") {
      await markCompleted(ctx.cwd, lesson.id, new Date().toISOString());
      const following = nextLesson(args.track as TrackId, await loadProgress(ctx.cwd));
      return {
        kind: "ok",
        value: { lessonId: lesson.id, status: "passed", title: lesson.title, steps },
        report: {
          summary: `Lesson "${lesson.title}" passed.`,
          details: [
            ...stepLines,
            following === null
              ? `Track "${args.track}" is now complete.`
              : `Next up: ${following.title} (patterson tutor next ${args.track})`,
          ],
        },
      };
    }

    return {
      kind: "ok",
      value: {
        lessonId: lesson.id,
        status: "failed",
        title: lesson.title,
        body: lesson.body,
        steps,
      },
      report: {
        summary: `Lesson "${lesson.title}" — ${steps.filter((step) => !step.ok).length} step(s) remaining.`,
        details: [
          ...lesson.body.split("\n"),
          "",
          ...stepLines,
          ...(lesson.license.source !== undefined ? ["", `Source: ${lesson.license.source}`] : []),
        ],
      },
    };
  },
});
