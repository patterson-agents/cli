#!/usr/bin/env bun
/**
 * Aggregate individual run results into benchmark summary statistics.
 *
 * Reads grading.json files from run directories and produces:
 * - run_summary with mean, stddev, min, max for each metric
 * - delta between with_skill and without_skill configurations
 *
 * Usage:
 *     bun scripts/aggregate_benchmark.ts <benchmark_dir> [--skill-name NAME] [--skill-path PATH] [-o output.json]
 *
 * The script supports two directory layouts:
 *
 *     Workspace layout (from skill-creator iterations):
 *     <benchmark_dir>/
 *     └── eval-N/
 *         ├── with_skill/
 *         │   ├── run-1/grading.json
 *         │   └── run-2/grading.json
 *         └── without_skill/
 *             ├── run-1/grading.json
 *             └── run-2/grading.json
 *
 *     Legacy layout (with runs/ subdirectory):
 *     <benchmark_dir>/
 *     └── runs/
 *         └── eval-N/
 *             ├── with_skill/
 *             │   └── run-1/grading.json
 *             └── without_skill/
 *                 └── run-1/grading.json
 */

import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { parseArgs } from "node:util";

import type { Benchmark, ConfigSummary, Expectation, MetricStats, RunResult } from "./types.ts";
import { readJson } from "./utils.ts";

/** Calculate mean, stddev, min, max for a list of values. */
export function calculateStats(values: number[]): MetricStats {
  if (values.length === 0) return { mean: 0.0, stddev: 0.0, min: 0.0, max: 0.0 };

  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;

  let stddev = 0.0;
  if (n > 1) {
    const variance = values.reduce((sum, x) => sum + (x - mean) ** 2, 0) / (n - 1);
    stddev = Math.sqrt(variance);
  }

  const round4 = (v: number): number => Math.round(v * 10000) / 10000;
  return {
    mean: round4(mean),
    stddev: round4(stddev),
    min: round4(Math.min(...values)),
    max: round4(Math.max(...values)),
  };
}

function listDirs(path: string): string[] {
  if (!existsSync(path)) return [];
  return readdirSync(path)
    .map((name) => join(path, name))
    .filter((p) => statSync(p).isDirectory())
    .toSorted();
}

function tryReadJson<T>(path: string): T | null {
  try {
    return readJson<T>(path);
  } catch {
    return null;
  }
}

interface GradingFile {
  summary?: { pass_rate?: number; passed?: number; failed?: number; total?: number };
  timing?: { total_duration_seconds?: number };
  execution_metrics?: {
    total_tool_calls?: number;
    output_chars?: number;
    errors_encountered?: number;
  };
  expectations?: Expectation[];
  user_notes_summary?: {
    uncertainties?: string[];
    needs_review?: string[];
    workarounds?: string[];
  };
}

/**
 * Load all run results from a benchmark directory.
 *
 * Returns a map keyed by config name (e.g. "with_skill"/"without_skill",
 * or "new_skill"/"old_skill"), each containing a list of run results.
 */
export function loadRunResults(benchmarkDir: string): Map<string, RunResult[]> {
  const results = new Map<string, RunResult[]>();

  // Support both layouts: eval dirs directly under benchmarkDir, or under runs/
  const runsDir = join(benchmarkDir, "runs");
  let searchDir: string;
  const directEvalDirs = listDirs(benchmarkDir).filter((p) => basename(p).startsWith("eval-"));
  if (existsSync(runsDir)) {
    searchDir = runsDir;
  } else if (directEvalDirs.length > 0) {
    searchDir = benchmarkDir;
  } else {
    console.log(`No eval directories found in ${benchmarkDir} or ${runsDir}`);
    return results;
  }

  const evalDirs = listDirs(searchDir).filter((p) => basename(p).startsWith("eval-"));
  evalDirs.forEach((evalDir, evalIdx) => {
    let evalId: number | string = evalIdx;
    const metadataPath = join(evalDir, "eval_metadata.json");
    const metadata = tryReadJson<{ eval_id?: number | string }>(metadataPath);
    if (metadata) {
      evalId = metadata.eval_id ?? evalIdx;
    } else {
      const parsed = Number.parseInt(basename(evalDir).split("-")[1] ?? "", 10);
      evalId = Number.isNaN(parsed) ? evalIdx : parsed;
    }

    // Discover config directories dynamically rather than hardcoding names
    for (const configDir of listDirs(evalDir)) {
      const runDirs = listDirs(configDir).filter((p) => basename(p).startsWith("run-"));
      // Skip non-config directories (inputs, outputs, etc.)
      if (runDirs.length === 0) continue;

      const config = basename(configDir);
      if (!results.has(config)) results.set(config, []);

      for (const runDir of runDirs) {
        const runNumber = Number.parseInt(basename(runDir).split("-")[1] ?? "0", 10);
        const gradingFile = join(runDir, "grading.json");

        if (!existsSync(gradingFile)) {
          console.log(`Warning: grading.json not found in ${runDir}`);
          continue;
        }

        const grading = tryReadJson<GradingFile>(gradingFile);
        if (!grading) {
          console.log(`Warning: Invalid JSON in ${gradingFile}`);
          continue;
        }

        // Extract metrics
        const result: RunResult = {
          eval_id: evalId,
          run_number: runNumber,
          pass_rate: grading.summary?.pass_rate ?? 0.0,
          passed: grading.summary?.passed ?? 0,
          failed: grading.summary?.failed ?? 0,
          total: grading.summary?.total ?? 0,
          time_seconds: grading.timing?.total_duration_seconds ?? 0.0,
          expectations: [],
          notes: [],
        };

        // Extract timing — check grading.json first, then sibling timing.json
        const timingFile = join(runDir, "timing.json");
        if (result.time_seconds === 0.0 && existsSync(timingFile)) {
          const timingData = tryReadJson<{
            total_duration_seconds?: number;
            total_tokens?: number;
          }>(timingFile);
          if (timingData) {
            result.time_seconds = timingData.total_duration_seconds ?? 0.0;
            result.tokens = timingData.total_tokens ?? 0;
          }
        }

        // Extract metrics if available
        const metrics = grading.execution_metrics ?? {};
        result.tool_calls = metrics.total_tool_calls ?? 0;
        if (!result.tokens) result.tokens = metrics.output_chars ?? 0;
        result.errors = metrics.errors_encountered ?? 0;

        // Extract expectations — viewer requires fields: text, passed, evidence
        const rawExpectations = grading.expectations ?? [];
        for (const exp of rawExpectations) {
          if (!("text" in exp) || !("passed" in exp)) {
            console.log(
              `Warning: expectation in ${gradingFile} missing required fields (text, passed, evidence): ${JSON.stringify(exp)}`,
            );
          }
        }
        result.expectations = rawExpectations;

        // Extract notes from user_notes_summary
        const notesSummary = grading.user_notes_summary ?? {};
        result.notes = [
          ...(notesSummary.uncertainties ?? []),
          ...(notesSummary.needs_review ?? []),
          ...(notesSummary.workarounds ?? []),
        ];

        results.get(config)?.push(result);
      }
    }
  });

  return results;
}

/**
 * Aggregate run results into summary statistics.
 *
 * Returns run_summary with stats for each configuration and delta.
 */
export function aggregateResults(results: Map<string, RunResult[]>): Benchmark["run_summary"] {
  const runSummary: Record<string, ConfigSummary> = {};
  const configs = [...results.keys()];

  for (const config of configs) {
    const runs = results.get(config) ?? [];

    if (runs.length === 0) {
      runSummary[config] = {
        pass_rate: { mean: 0.0, stddev: 0.0, min: 0.0, max: 0.0 },
        time_seconds: { mean: 0.0, stddev: 0.0, min: 0.0, max: 0.0 },
        tokens: { mean: 0, stddev: 0, min: 0, max: 0 },
      };
      continue;
    }

    runSummary[config] = {
      pass_rate: calculateStats(runs.map((r) => r.pass_rate)),
      time_seconds: calculateStats(runs.map((r) => r.time_seconds)),
      tokens: calculateStats(runs.map((r) => r.tokens ?? 0)),
    };
  }

  // Calculate delta between the first two configs (if two exist)
  const firstConfig = configs[0];
  const secondConfig = configs[1];
  const primary = firstConfig !== undefined ? runSummary[firstConfig] : undefined;
  const baseline = secondConfig !== undefined ? runSummary[secondConfig] : undefined;

  const deltaPassRate = (primary?.pass_rate.mean ?? 0) - (baseline?.pass_rate.mean ?? 0);
  const deltaTime = (primary?.time_seconds.mean ?? 0) - (baseline?.time_seconds.mean ?? 0);
  const deltaTokens = (primary?.tokens.mean ?? 0) - (baseline?.tokens.mean ?? 0);

  const signed = (v: number, digits: number): string => `${v >= 0 ? "+" : ""}${v.toFixed(digits)}`;

  return {
    ...runSummary,
    delta: {
      pass_rate: signed(deltaPassRate, 2),
      time_seconds: signed(deltaTime, 1),
      tokens: signed(deltaTokens, 0),
    },
  };
}

/** Generate complete benchmark.json from run results. */
export function generateBenchmark(benchmarkDir: string, skillName = "", skillPath = ""): Benchmark {
  const results = loadRunResults(benchmarkDir);
  const runSummary = aggregateResults(results);

  // Build runs array for benchmark.json
  const runs: Benchmark["runs"] = [];
  for (const [config, configResults] of results) {
    for (const result of configResults) {
      runs.push({
        eval_id: result.eval_id,
        configuration: config,
        run_number: result.run_number,
        result: {
          pass_rate: result.pass_rate,
          passed: result.passed,
          failed: result.failed,
          total: result.total,
          time_seconds: result.time_seconds,
          tokens: result.tokens ?? 0,
          tool_calls: result.tool_calls ?? 0,
          errors: result.errors ?? 0,
        },
        expectations: result.expectations,
        notes: result.notes,
      });
    }
  }

  // Determine eval IDs from results
  const evalIds = [...new Set([...results.values()].flat().map((r) => r.eval_id))].toSorted();

  return {
    metadata: {
      skill_name: skillName || "<skill-name>",
      skill_path: skillPath || "<path/to/skill>",
      executor_model: "<model-name>",
      analyzer_model: "<model-name>",
      timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      evals_run: evalIds,
      runs_per_configuration: 3,
    },
    runs,
    run_summary: runSummary,
    notes: [], // To be filled by analyzer
  };
}

/** Generate human-readable benchmark.md from benchmark data. */
export function generateMarkdown(benchmark: Benchmark): string {
  const metadata = benchmark.metadata;
  const runSummary = benchmark.run_summary;

  // Determine config names (excluding "delta")
  const configs = Object.keys(runSummary).filter((k) => k !== "delta");
  const configA = configs[0] ?? "config_a";
  const configB = configs[1] ?? "config_b";
  const title = (s: string): string =>
    s
      .split("_")
      .map((w) => (w ? w[0]?.toUpperCase() + w.slice(1) : w))
      .join(" ");
  const labelA = title(configA);
  const labelB = title(configB);

  const aSummary = (runSummary[configA] ?? {}) as Partial<ConfigSummary>;
  const bSummary = (runSummary[configB] ?? {}) as Partial<ConfigSummary>;
  const delta = (runSummary["delta"] ?? {}) as Partial<{
    pass_rate: string;
    time_seconds: string;
    tokens: string;
  }>;

  const lines = [
    `# Skill Benchmark: ${metadata.skill_name}`,
    "",
    `**Model**: ${metadata.executor_model}`,
    `**Date**: ${metadata.timestamp}`,
    `**Evals**: ${metadata.evals_run.join(", ")} (${metadata.runs_per_configuration} runs each per configuration)`,
    "",
    "## Summary",
    "",
    `| Metric | ${labelA} | ${labelB} | Delta |`,
    "|--------|------------|---------------|-------|",
  ];

  const pct = (v: number): string => `${Math.round(v * 100)}%`;
  const aPr = aSummary.pass_rate ?? { mean: 0, stddev: 0, min: 0, max: 0 };
  const bPr = bSummary.pass_rate ?? { mean: 0, stddev: 0, min: 0, max: 0 };
  lines.push(
    `| Pass Rate | ${pct(aPr.mean)} ± ${pct(aPr.stddev)} | ${pct(bPr.mean)} ± ${pct(bPr.stddev)} | ${delta.pass_rate ?? "—"} |`,
  );

  const aTime = aSummary.time_seconds ?? { mean: 0, stddev: 0, min: 0, max: 0 };
  const bTime = bSummary.time_seconds ?? { mean: 0, stddev: 0, min: 0, max: 0 };
  lines.push(
    `| Time | ${aTime.mean.toFixed(1)}s ± ${aTime.stddev.toFixed(1)}s | ${bTime.mean.toFixed(1)}s ± ${bTime.stddev.toFixed(1)}s | ${delta.time_seconds ?? "—"}s |`,
  );

  const aTokens = aSummary.tokens ?? { mean: 0, stddev: 0, min: 0, max: 0 };
  const bTokens = bSummary.tokens ?? { mean: 0, stddev: 0, min: 0, max: 0 };
  lines.push(
    `| Tokens | ${aTokens.mean.toFixed(0)} ± ${aTokens.stddev.toFixed(0)} | ${bTokens.mean.toFixed(0)} ± ${bTokens.stddev.toFixed(0)} | ${delta.tokens ?? "—"} |`,
  );

  // Notes section
  if (benchmark.notes.length > 0) {
    lines.push("", "## Notes", "");
    for (const note of benchmark.notes) lines.push(`- ${note}`);
  }

  return lines.join("\n");
}

function main(): void {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      "skill-name": { type: "string", default: "" },
      "skill-path": { type: "string", default: "" },
      output: { type: "string", short: "o" },
    },
  });

  const benchmarkDirArg = positionals[0];
  if (benchmarkDirArg === undefined) {
    console.error(
      "Usage: bun scripts/aggregate_benchmark.ts <benchmark_dir> [--skill-name NAME] [--skill-path PATH] [-o output.json]",
    );
    process.exit(1);
  }
  const benchmarkDir = resolve(benchmarkDirArg);

  if (!existsSync(benchmarkDir)) {
    console.log(`Directory not found: ${benchmarkDir}`);
    process.exit(1);
  }

  // Generate benchmark
  const benchmark = generateBenchmark(
    benchmarkDir,
    values["skill-name"] ?? "",
    values["skill-path"] ?? "",
  );

  // Determine output paths
  const outputJson = values.output ?? join(benchmarkDir, "benchmark.json");
  const outputMd = join(dirname(outputJson), `${basename(outputJson, extname(outputJson))}.md`);

  // Write benchmark.json
  writeFileSync(outputJson, JSON.stringify(benchmark, null, 2));
  console.log(`Generated: ${outputJson}`);

  // Write benchmark.md
  writeFileSync(outputMd, generateMarkdown(benchmark));
  console.log(`Generated: ${outputMd}`);

  // Print summary
  const runSummary = benchmark.run_summary;
  const configs = Object.keys(runSummary).filter((k) => k !== "delta");
  const delta = (runSummary["delta"] ?? {}) as Partial<{ pass_rate: string }>;

  console.log("\nSummary:");
  for (const config of configs) {
    const summary = runSummary[config] as ConfigSummary;
    const pr = summary.pass_rate.mean;
    const label = config
      .split("_")
      .map((w) => (w ? w[0]?.toUpperCase() + w.slice(1) : w))
      .join(" ");
    console.log(`  ${label}: ${(pr * 100).toFixed(1)}% pass rate`);
  }
  console.log(`  Delta:         ${delta.pass_rate ?? "—"}`);
}

if (import.meta.main) {
  main();
}
