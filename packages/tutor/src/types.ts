/**
 * Tutor data model (E-P7, US6).
 *
 * A lesson is DATA: teaching text (markdown) plus declarative validation
 * steps the engine executes locally (GitHub-Skills style — the learner does
 * the work in their real project; the tutor verifies artifacts, it never
 * does the work for them). Licensing tiers are carried per-lesson
 * (Constitution VI): `original` content, `adapted-mit` (adapted from
 * MIT-licensed sources, attributed), or `link-out` (proprietary curricula
 * are referenced, never copied).
 */
import { z } from "zod";

export const TRACKS = ["fluency", "claude-code", "copilot", "mcp", "cert-prep"] as const;
export type TrackId = (typeof TRACKS)[number];

/** Declarative validation step — the only way a lesson checks anything. */
export const LessonValidatorSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("file-exists"),
    path: z.string().min(1),
    /** Shown when the file is missing. */
    hint: z.string().min(1),
  }),
  z.strictObject({
    kind: z.literal("file-contains"),
    path: z.string().min(1),
    needle: z.string().min(1),
    hint: z.string().min(1),
  }),
  z.strictObject({
    kind: z.literal("command"),
    argv: z.array(z.string().min(1)).min(1),
    expectExitCode: z.number().int().default(0),
    hint: z.string().min(1),
  }),
  z.strictObject({
    kind: z.literal("mcp-handshake"),
    argv: z.array(z.string().min(1)).min(1),
    /** Working directory relative to the project root. */
    dir: z.string().default("."),
    hint: z.string().min(1),
  }),
]);
export type LessonValidator = z.infer<typeof LessonValidatorSchema>;

export const LessonSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  track: z.enum(TRACKS),
  /** Order within the track (ascending). */
  order: z.number().int().nonnegative(),
  title: z.string().min(1),
  /** Prerequisite tool ids; missing ⇒ skip-with-explanation (plan.md). */
  requires: z.array(z.enum(["git", "bun", "gh"])).default([]),
  license: z.strictObject({
    tier: z.enum(["original", "adapted-mit", "link-out"]),
    /** Attribution / link target (required for adapted + link-out tiers). */
    source: z.string().optional(),
  }),
  /** Teaching text, markdown. Rendered as the lesson body. */
  body: z.string().min(1),
  /** What the learner must produce; validated locally by the engine. */
  validate: z.array(LessonValidatorSchema),
});
export type Lesson = z.infer<typeof LessonSchema>;

// ---------------------------------------------------------------------------
// Engine result shapes
// ---------------------------------------------------------------------------

export interface StepResult {
  ok: boolean;
  description: string;
  hint?: string;
}

export type LessonOutcome =
  | { status: "passed"; steps: StepResult[] }
  | { status: "failed"; steps: StepResult[] }
  | { status: "skipped"; reason: string };

// ---------------------------------------------------------------------------
// Progress (.patterson/tutor-progress.json — patterson-owned)
// ---------------------------------------------------------------------------

export const ProgressSchema = z.object({
  version: z.literal(1),
  /** Lesson ids that validated successfully, with completion timestamps. */
  completed: z.record(z.string(), z.string()),
});
export type Progress = z.infer<typeof ProgressSchema>;
