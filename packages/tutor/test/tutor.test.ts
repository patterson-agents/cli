/**
 * E-P7 — tutor engine (verification 10): lesson 1 validates headless against
 * a real directory; a missing prerequisite skips-with-explanation; progress
 * round-trips; curriculum invariants (licensing tiers, unique ids, orders).
 */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  LESSONS,
  LessonSchema,
  loadProgress,
  markCompleted,
  nextLesson,
  runLesson,
  trackLessons,
  TRACKS,
} from "../src/index.ts";

const dirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "patterson-tutor-"));
  dirs.push(dir);
  return dir;
}
afterEach(async () => {
  while (dirs.length > 0) await rm(dirs.pop() as string, { recursive: true, force: true });
});

describe("curriculum invariants", () => {
  test("every lesson parses, ids unique, orders unique per track", () => {
    const ids = new Set<string>();
    for (const lesson of LESSONS) {
      expect(LessonSchema.safeParse(lesson).success).toBe(true);
      expect(ids.has(lesson.id)).toBe(false);
      ids.add(lesson.id);
    }
    for (const track of TRACKS) {
      const orders = trackLessons(track).map((lesson) => lesson.order);
      expect(new Set(orders).size).toBe(orders.length);
      expect(trackLessons(track).length).toBeGreaterThan(0);
    }
  });

  test("licensing: adapted/link-out lessons always carry a source (Constitution VI)", () => {
    for (const lesson of LESSONS) {
      if (lesson.license.tier !== "original") {
        expect(lesson.license.source).toBeDefined();
      }
    }
  });
});

describe("lesson engine (verification 10)", () => {
  test("fluency lesson 1: fails with hints, then passes after doing the work", async () => {
    const root = await tempDir();
    const lesson = trackLessons("fluency")[0];
    if (!lesson) throw new Error("fluency track is empty");

    // Before: not a git repo, no README ⇒ failed with actionable hints.
    const before = await runLesson(lesson, root);
    expect(before.status).toBe("failed");
    if (before.status !== "failed") throw new Error("expected failed");
    expect(before.steps.filter((step) => !step.ok).length).toBeGreaterThan(0);
    expect(before.steps.find((step) => !step.ok)?.hint).toContain("git init");

    // The learner does the work (the tutor never does it for them).
    const init = Bun.spawn(["git", "init"], { cwd: root, stdout: "ignore", stderr: "ignore" });
    expect(await init.exited).toBe(0);
    await Bun.write(join(root, "README.md"), "# my project\n");

    const after = await runLesson(lesson, root);
    expect(after.status).toBe("passed");
  });

  test("missing git prerequisite ⇒ skip-with-explanation, not failure", async () => {
    const root = await tempDir();
    const lesson = LESSONS.find((candidate) => candidate.requires.includes("git"));
    if (!lesson) throw new Error("no git-requiring lesson");
    const outcome = await runLesson(lesson, root);
    expect(outcome.status).toBe("skipped");
    if (outcome.status !== "skipped") throw new Error("expected skipped");
    expect(outcome.reason).toContain("git init");
  });
});

describe("progress", () => {
  test("round-trips and drives nextLesson", async () => {
    const root = await tempDir();
    const fluency = trackLessons("fluency");
    expect(nextLesson("fluency", await loadProgress(root))?.id).toBe(fluency[0]?.id as string);

    await markCompleted(root, fluency[0]?.id as string, "2026-07-31T00:00:00Z");
    const progress = await loadProgress(root);
    expect(progress.completed[fluency[0]?.id as string]).toBe("2026-07-31T00:00:00Z");
    expect(nextLesson("fluency", progress)?.id).toBe(fluency[1]?.id as string);
  });

  test("corrupt progress file degrades to fresh, never crashes", async () => {
    const root = await tempDir();
    await Bun.write(join(root, ".patterson/tutor-progress.json"), "{ nope");
    const progress = await loadProgress(root);
    expect(progress.completed).toEqual({});
  });
});
