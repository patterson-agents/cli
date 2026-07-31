#!/usr/bin/env bun
/**
 * Run the eval + improve loop until all pass or max iterations reached.
 *
 * Combines run_eval.ts and improve_description.ts in a loop, tracking history
 * and returning the best description found. Supports train/test split to prevent
 * overfitting.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { generateHtml } from "./generate_report.ts";
import { improveDescription, type ImproveHistoryEntry } from "./improve_description.ts";
import { findProjectRoot, runEval } from "./run_eval.ts";
import type { EvalItem, EvalOutput, HistoryEntry, LoopOutput, QueryResult } from "./types.ts";
import { openBrowser, parseSkillMd, readJson } from "./utils.ts";

/** Deterministic PRNG (mulberry32) so splits are reproducible for a given seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(items: T[], random: () => number): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = items[i] as T;
    items[i] = items[j] as T;
    items[j] = a;
  }
}

/** Split eval set into train and test sets, stratified by should_trigger. */
export function splitEvalSet(
  evalSet: EvalItem[],
  holdout: number,
  seed = 42,
): [EvalItem[], EvalItem[]] {
  const random = mulberry32(seed);

  // Separate by should_trigger
  const trigger = evalSet.filter((e) => e.should_trigger);
  const noTrigger = evalSet.filter((e) => !e.should_trigger);

  // Shuffle each group
  shuffleInPlace(trigger, random);
  shuffleInPlace(noTrigger, random);

  // Calculate split points
  const nTriggerTest = Math.max(1, Math.floor(trigger.length * holdout));
  const nNoTriggerTest = Math.max(1, Math.floor(noTrigger.length * holdout));

  // Split
  const testSet = [...trigger.slice(0, nTriggerTest), ...noTrigger.slice(0, nNoTriggerTest)];
  const trainSet = [...trigger.slice(nTriggerTest), ...noTrigger.slice(nNoTriggerTest)];

  return [trainSet, testSet];
}

export interface RunLoopOptions {
  evalSet: EvalItem[];
  skillPath: string;
  descriptionOverride?: string;
  numWorkers: number;
  timeoutSeconds: number;
  maxIterations: number;
  runsPerQuery: number;
  triggerThreshold: number;
  holdout: number;
  model: string;
  verbose: boolean;
  liveReportPath?: string | null;
  logDir?: string | null;
}

/** Run the eval + improvement loop. */
export async function runLoop(options: RunLoopOptions): Promise<LoopOutput> {
  const {
    evalSet,
    skillPath,
    descriptionOverride,
    numWorkers,
    timeoutSeconds,
    maxIterations,
    runsPerQuery,
    triggerThreshold,
    holdout,
    model,
    verbose,
    liveReportPath,
    logDir,
  } = options;

  const projectRoot = findProjectRoot();
  const { name, description: originalDescription, content } = parseSkillMd(skillPath);
  let currentDescription = descriptionOverride ?? originalDescription;

  // Split into train/test if holdout > 0
  let trainSet: EvalItem[];
  let testSet: EvalItem[];
  if (holdout > 0) {
    [trainSet, testSet] = splitEvalSet(evalSet, holdout);
    if (verbose)
      console.error(`Split: ${trainSet.length} train, ${testSet.length} test (holdout=${holdout})`);
  } else {
    trainSet = evalSet;
    testSet = [];
  }

  const history: HistoryEntry[] = [];
  let exitReason = "unknown";

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    if (verbose) {
      console.error(`\n${"=".repeat(60)}`);
      console.error(`Iteration ${iteration}/${maxIterations}`);
      console.error(`Description: ${currentDescription}`);
      console.error("=".repeat(60));
    }

    // Evaluate train + test together in one batch for parallelism
    const allQueries = [...trainSet, ...testSet];
    const t0 = performance.now();
    const allResults = await runEval({
      evalSet: allQueries,
      skillName: name,
      description: currentDescription,
      numWorkers,
      timeoutSeconds,
      projectRoot,
      runsPerQuery,
      triggerThreshold,
      model,
    });
    const evalElapsed = (performance.now() - t0) / 1000;

    // Split results back into train/test by matching queries
    const trainQueriesSet = new Set(trainSet.map((q) => q.query));
    const trainResultList = allResults.results.filter((r) => trainQueriesSet.has(r.query));
    const testResultList = allResults.results.filter((r) => !trainQueriesSet.has(r.query));

    const trainPassed = trainResultList.filter((r) => r.pass).length;
    const trainTotal = trainResultList.length;
    const trainSummary = {
      passed: trainPassed,
      failed: trainTotal - trainPassed,
      total: trainTotal,
    };
    const trainResults: EvalOutput = {
      skill_name: name,
      description: currentDescription,
      results: trainResultList,
      summary: trainSummary,
    };

    let testResults: EvalOutput | null = null;
    let testSummary: { passed: number; failed: number; total: number } | null = null;
    if (testSet.length > 0) {
      const testPassed = testResultList.filter((r) => r.pass).length;
      const testTotal = testResultList.length;
      testSummary = { passed: testPassed, failed: testTotal - testPassed, total: testTotal };
      testResults = {
        skill_name: name,
        description: currentDescription,
        results: testResultList,
        summary: testSummary,
      };
    }

    history.push({
      iteration,
      description: currentDescription,
      train_passed: trainSummary.passed,
      train_failed: trainSummary.failed,
      train_total: trainSummary.total,
      train_results: trainResults.results,
      test_passed: testSummary ? testSummary.passed : null,
      test_failed: testSummary ? testSummary.failed : null,
      test_total: testSummary ? testSummary.total : null,
      test_results: testResults ? testResults.results : null,
      // For backward compat with report generator
      passed: trainSummary.passed,
      failed: trainSummary.failed,
      total: trainSummary.total,
      results: trainResults.results,
    });

    // Write live report if path provided
    if (liveReportPath) {
      const partialOutput: LoopOutput = {
        original_description: originalDescription,
        best_description: currentDescription,
        best_score: "in progress",
        iterations_run: history.length,
        holdout,
        train_size: trainSet.length,
        test_size: testSet.length,
        history,
      };
      writeFileSync(liveReportPath, generateHtml(partialOutput, true, name));
    }

    if (verbose) {
      const printEvalStats = (label: string, results: QueryResult[], elapsed: number): void => {
        const pos = results.filter((r) => r.should_trigger);
        const neg = results.filter((r) => !r.should_trigger);
        const tp = pos.reduce((sum, r) => sum + r.triggers, 0);
        const posRuns = pos.reduce((sum, r) => sum + r.runs, 0);
        const fn = posRuns - tp;
        const fp = neg.reduce((sum, r) => sum + r.triggers, 0);
        const negRuns = neg.reduce((sum, r) => sum + r.runs, 0);
        const tn = negRuns - fp;
        const total = tp + tn + fp + fn;
        const precision = tp + fp > 0 ? tp / (tp + fp) : 1.0;
        const recall = tp + fn > 0 ? tp / (tp + fn) : 1.0;
        const accuracy = total > 0 ? (tp + tn) / total : 0.0;
        const pct = (v: number): string => `${Math.round(v * 100)}%`;
        console.error(
          `${label}: ${tp + tn}/${total} correct, precision=${pct(precision)} recall=${pct(recall)} accuracy=${pct(accuracy)} (${elapsed.toFixed(1)}s)`,
        );
        for (const r of results) {
          const status = r.pass ? "PASS" : "FAIL";
          console.error(
            `  [${status}] rate=${r.triggers}/${r.runs} expected=${r.should_trigger}: ${r.query.slice(0, 60)}`,
          );
        }
      };

      printEvalStats("Train", trainResults.results, evalElapsed);
      if (testSummary && testResults) printEvalStats("Test ", testResults.results, 0);
    }

    if (trainSummary.failed === 0) {
      exitReason = `all_passed (iteration ${iteration})`;
      if (verbose) console.error(`\nAll train queries passed on iteration ${iteration}!`);
      break;
    }

    if (iteration === maxIterations) {
      exitReason = `max_iterations (${maxIterations})`;
      if (verbose) console.error(`\nMax iterations reached (${maxIterations}).`);
      break;
    }

    // Improve the description based on train results
    if (verbose) console.error("\nImproving description...");

    const t1 = performance.now();
    // Strip test scores from history so improvement model can't see them
    const blindedHistory: ImproveHistoryEntry[] = history.map((h) => {
      const blinded: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(h)) {
        if (!k.startsWith("test_")) blinded[k] = v;
      }
      return blinded as unknown as ImproveHistoryEntry;
    });
    const newDescription = await improveDescription({
      skillName: name,
      skillContent: content,
      currentDescription,
      evalResults: trainResults,
      history: blindedHistory,
      model,
      logDir,
      iteration,
    });
    const improveElapsed = (performance.now() - t1) / 1000;

    if (verbose) console.error(`Proposed (${improveElapsed.toFixed(1)}s): ${newDescription}`);

    currentDescription = newDescription;
  }

  // Find the best iteration by TEST score (or train if no test set)
  const pickMax = (score: (h: HistoryEntry) => number): HistoryEntry => {
    let best = history[0] as HistoryEntry;
    for (const h of history) if (score(h) > score(best)) best = h;
    return best;
  };
  let best: HistoryEntry;
  let bestScore: string;
  if (testSet.length > 0) {
    best = pickMax((h) => h.test_passed ?? 0);
    bestScore = `${best.test_passed}/${best.test_total}`;
  } else {
    best = pickMax((h) => h.train_passed);
    bestScore = `${best.train_passed}/${best.train_total}`;
  }

  if (verbose) {
    console.error(`\nExit reason: ${exitReason}`);
    console.error(`Best score: ${bestScore} (iteration ${best.iteration})`);
  }

  return {
    exit_reason: exitReason,
    original_description: originalDescription,
    best_description: best.description,
    best_score: bestScore,
    best_train_score: `${best.train_passed}/${best.train_total}`,
    best_test_score: testSet.length > 0 ? `${best.test_passed}/${best.test_total}` : null,
    final_description: currentDescription,
    iterations_run: history.length,
    holdout,
    train_size: trainSet.length,
    test_size: testSet.length,
    history,
  };
}

function timestamp(format: "compact" | "dashed"): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}${format === "dashed" ? "-" : ""}${pad(d.getMonth() + 1)}${format === "dashed" ? "-" : ""}${pad(d.getDate())}`;
  return `${date}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      "eval-set": { type: "string" },
      "skill-path": { type: "string" },
      description: { type: "string" },
      "num-workers": { type: "string", default: "10" },
      timeout: { type: "string", default: "30" },
      "max-iterations": { type: "string", default: "5" },
      "runs-per-query": { type: "string", default: "3" },
      "trigger-threshold": { type: "string", default: "0.5" },
      holdout: { type: "string", default: "0.4" },
      model: { type: "string" },
      verbose: { type: "boolean", default: false },
      report: { type: "string", default: "auto" },
      "results-dir": { type: "string" },
    },
  });

  const evalSetPath = values["eval-set"];
  const skillPath = values["skill-path"];
  const model = values.model;
  if (!evalSetPath || !skillPath || !model) {
    console.error(
      "Usage: bun scripts/run_loop.ts --eval-set <file> --skill-path <dir> --model <model> [options]",
    );
    process.exit(1);
  }

  const evalSet = readJson<EvalItem[]>(evalSetPath);

  if (!existsSync(join(skillPath, "SKILL.md"))) {
    console.error(`Error: No SKILL.md found at ${skillPath}`);
    process.exit(1);
  }

  const { name } = parseSkillMd(skillPath);

  // Set up live report path
  let liveReportPath: string | null = null;
  if (values.report !== "none") {
    liveReportPath =
      values.report === "auto"
        ? join(
            tmpdir(),
            `skill_description_report_${basename(resolve(skillPath))}_${timestamp("compact")}.html`,
          )
        : (values.report as string);
    // Open the report immediately so the user can watch
    writeFileSync(
      liveReportPath,
      "<html><body><h1>Starting optimization loop...</h1><meta http-equiv='refresh' content='5'></body></html>",
    );
    openBrowser(liveReportPath);
  }

  // Determine output directory (create before runLoop so logs can be written)
  let resultsDir: string | null = null;
  if (values["results-dir"]) {
    resultsDir = join(values["results-dir"], timestamp("dashed"));
    mkdirSync(resultsDir, { recursive: true });
  }
  const logDir = resultsDir ? join(resultsDir, "logs") : null;

  const output = await runLoop({
    evalSet,
    skillPath,
    descriptionOverride: values.description,
    numWorkers: Number(values["num-workers"]),
    timeoutSeconds: Number(values.timeout),
    maxIterations: Number(values["max-iterations"]),
    runsPerQuery: Number(values["runs-per-query"]),
    triggerThreshold: Number(values["trigger-threshold"]),
    holdout: Number(values.holdout),
    model,
    verbose: values.verbose ?? false,
    liveReportPath,
    logDir,
  });

  // Save JSON output
  const jsonOutput = JSON.stringify(output, null, 2);
  console.log(jsonOutput);
  if (resultsDir) writeFileSync(join(resultsDir, "results.json"), jsonOutput);

  // Write final HTML report (without auto-refresh)
  if (liveReportPath) {
    writeFileSync(liveReportPath, generateHtml(output, false, name));
    console.error(`\nReport: ${liveReportPath}`);
  }

  if (resultsDir && liveReportPath) {
    writeFileSync(join(resultsDir, "report.html"), generateHtml(output, false, name));
  }

  if (resultsDir) console.error(`Results saved to: ${resultsDir}`);
}

if (import.meta.main) {
  await main();
}
