#!/usr/bin/env bun
/**
 * Generate and serve a review page for eval results.
 *
 * Reads the workspace directory, discovers runs (directories with outputs/),
 * embeds all output data into a self-contained HTML page, and serves it via
 * Bun.serve. Feedback auto-saves to feedback.json in the workspace.
 *
 * Usage:
 *     bun eval-viewer/generate_review.ts <workspace-path> [--port PORT] [--skill-name NAME]
 *     bun eval-viewer/generate_review.ts <workspace-path> --previous-workspace /path/to/old/workspace
 *     bun eval-viewer/generate_review.ts <workspace-path> --static out.html
 *
 * No dependencies beyond Bun are required.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";

import type { EmbeddedFile, ReviewRun } from "../scripts/types.ts";
import { openBrowser, readJson } from "../scripts/utils.ts";

// Files to exclude from output listings
const METADATA_FILES = new Set(["transcript.md", "user_notes.md", "metrics.json"]);

// Extensions we render as inline text
const TEXT_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".json",
  ".csv",
  ".py",
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".yaml",
  ".yml",
  ".xml",
  ".html",
  ".css",
  ".sh",
  ".rb",
  ".go",
  ".rs",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".sql",
  ".r",
  ".toml",
]);

// Extensions we render as inline images
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"]);

// MIME type overrides for common types
const MIME_OVERRIDES: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".pdf": "application/pdf",
};

function getMimeType(path: string): string {
  const ext = extname(path).toLowerCase();
  const override = MIME_OVERRIDES[ext];
  if (override) return override;
  return Bun.file(path).type || "application/octet-stream";
}

/** Recursively find directories that contain an outputs/ subdirectory. */
export function findRuns(workspace: string): ReviewRun[] {
  const runs: ReviewRun[] = [];
  findRunsRecursive(workspace, workspace, runs);
  runs.sort((a, b) => {
    const aEval = a.eval_id ?? Number.POSITIVE_INFINITY;
    const bEval = b.eval_id ?? Number.POSITIVE_INFINITY;
    if (aEval !== bEval) return aEval < bEval ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return runs;
}

function findRunsRecursive(root: string, current: string, runs: ReviewRun[]): void {
  if (!existsSync(current) || !statSync(current).isDirectory()) return;

  const outputsDir = join(current, "outputs");
  if (existsSync(outputsDir) && statSync(outputsDir).isDirectory()) {
    const run = buildRun(root, current);
    if (run) runs.push(run);
    return;
  }

  const skip = new Set(["node_modules", ".git", "__pycache__", "skill", "inputs"]);
  for (const child of readdirSync(current).toSorted()) {
    const childPath = join(current, child);
    if (statSync(childPath).isDirectory() && !skip.has(child)) {
      findRunsRecursive(root, childPath, runs);
    }
  }
}

/** Build a run object with prompt, outputs, and grading data. */
function buildRun(root: string, runDir: string): ReviewRun | null {
  let prompt = "";
  let evalId: number | null = null;

  // Try eval_metadata.json
  for (const candidate of [
    join(runDir, "eval_metadata.json"),
    join(dirname(runDir), "eval_metadata.json"),
  ]) {
    if (existsSync(candidate)) {
      const metadata = tryReadJson<{ prompt?: string; eval_id?: number }>(candidate);
      if (metadata) {
        prompt = metadata.prompt ?? "";
        evalId = metadata.eval_id ?? null;
      }
      if (prompt) break;
    }
  }

  // Fall back to transcript.md
  if (!prompt) {
    for (const candidate of [
      join(runDir, "transcript.md"),
      join(runDir, "outputs", "transcript.md"),
    ]) {
      if (existsSync(candidate)) {
        try {
          const text = readFileSync(candidate, "utf8");
          const match = text.match(/## Eval Prompt\n\n([\s\S]*?)(?=\n##|$)/);
          if (match?.[1]) prompt = match[1].trim();
        } catch {
          // ignore read errors
        }
        if (prompt) break;
      }
    }
  }

  if (!prompt) prompt = "(No prompt found)";

  const runId = relative(root, runDir).replaceAll("/", "-").replaceAll("\\", "-");

  // Collect output files
  const outputsDir = join(runDir, "outputs");
  const outputFiles: EmbeddedFile[] = [];
  if (existsSync(outputsDir) && statSync(outputsDir).isDirectory()) {
    for (const name of readdirSync(outputsDir).toSorted()) {
      const filePath = join(outputsDir, name);
      if (statSync(filePath).isFile() && !METADATA_FILES.has(name)) {
        outputFiles.push(embedFile(filePath));
      }
    }
  }

  // Load grading if present
  let grading: Record<string, unknown> | null = null;
  for (const candidate of [join(runDir, "grading.json"), join(dirname(runDir), "grading.json")]) {
    if (existsSync(candidate)) {
      grading = tryReadJson<Record<string, unknown>>(candidate);
      if (grading) break;
    }
  }

  return { id: runId, prompt, eval_id: evalId, outputs: outputFiles, grading };
}

function tryReadJson<T>(path: string): T | null {
  try {
    return readJson<T>(path);
  } catch {
    return null;
  }
}

/** Read a file and return an embedded representation. */
function embedFile(path: string): EmbeddedFile {
  const ext = extname(path).toLowerCase();
  const mime = getMimeType(path);
  const name = basename(path);

  const readBase64 = (): string | null => {
    try {
      return readFileSync(path).toString("base64");
    } catch {
      return null;
    }
  };

  if (TEXT_EXTENSIONS.has(ext)) {
    let content: string;
    try {
      content = readFileSync(path, "utf8");
    } catch {
      content = "(Error reading file)";
    }
    return { name, type: "text", content };
  }
  if (IMAGE_EXTENSIONS.has(ext)) {
    const b64 = readBase64();
    if (b64 === null) return { name, type: "error", content: "(Error reading file)" };
    return { name, type: "image", mime, data_uri: `data:${mime};base64,${b64}` };
  }
  if (ext === ".pdf") {
    const b64 = readBase64();
    if (b64 === null) return { name, type: "error", content: "(Error reading file)" };
    return { name, type: "pdf", data_uri: `data:${mime};base64,${b64}` };
  }
  if (ext === ".xlsx") {
    const b64 = readBase64();
    if (b64 === null) return { name, type: "error", content: "(Error reading file)" };
    return { name, type: "xlsx", data_b64: b64 };
  }
  // Binary / unknown — base64 download link
  const b64 = readBase64();
  if (b64 === null) return { name, type: "error", content: "(Error reading file)" };
  return { name, type: "binary", mime, data_uri: `data:${mime};base64,${b64}` };
}

interface PreviousIterationEntry {
  feedback: string;
  outputs: EmbeddedFile[];
}

/**
 * Load previous iteration's feedback and outputs.
 *
 * Returns a map of run_id -> { feedback, outputs }.
 */
export function loadPreviousIteration(workspace: string): Map<string, PreviousIterationEntry> {
  const result = new Map<string, PreviousIterationEntry>();

  // Load feedback
  const feedbackMap = new Map<string, string>();
  const feedbackPath = join(workspace, "feedback.json");
  if (existsSync(feedbackPath)) {
    const data = tryReadJson<{ reviews?: Array<{ run_id?: string; feedback?: string }> }>(
      feedbackPath,
    );
    for (const r of data?.reviews ?? []) {
      if (r.run_id && r.feedback?.trim()) feedbackMap.set(r.run_id, r.feedback);
    }
  }

  // Load runs (to get outputs)
  const prevRuns = findRuns(workspace);
  for (const run of prevRuns) {
    result.set(run.id, { feedback: feedbackMap.get(run.id) ?? "", outputs: run.outputs });
  }

  // Also add feedback for run_ids that had feedback but no matching run
  for (const [runId, fb] of feedbackMap) {
    if (!result.has(runId)) result.set(runId, { feedback: fb, outputs: [] });
  }

  return result;
}

/** Generate the complete standalone HTML page with embedded data. */
export function generateHtml(
  runs: ReviewRun[],
  skillName: string,
  previous?: Map<string, PreviousIterationEntry> | null,
  benchmark?: Record<string, unknown> | null,
): string {
  const templatePath = join(import.meta.dir, "viewer.html");
  const template = readFileSync(templatePath, "utf8");

  // Build previous_feedback and previous_outputs maps for the template
  const previousFeedback: Record<string, string> = {};
  const previousOutputs: Record<string, EmbeddedFile[]> = {};
  if (previous) {
    for (const [runId, data] of previous) {
      if (data.feedback) previousFeedback[runId] = data.feedback;
      if (data.outputs.length > 0) previousOutputs[runId] = data.outputs;
    }
  }

  const embedded: Record<string, unknown> = {
    skill_name: skillName,
    runs,
    previous_feedback: previousFeedback,
    previous_outputs: previousOutputs,
  };
  if (benchmark) embedded["benchmark"] = benchmark;

  return template.replace(
    "/*__EMBEDDED_DATA__*/",
    `const EMBEDDED_DATA = ${JSON.stringify(embedded)};`,
  );
}

// ---------------------------------------------------------------------------
// HTTP server (Bun.serve, zero dependencies)
// ---------------------------------------------------------------------------

/** Kill any process listening on the given port. */
async function killPort(port: number): Promise<void> {
  try {
    const proc = Bun.spawn(["lsof", "-ti", `:${port}`], { stdout: "pipe", stderr: "ignore" });
    const stdout = await new Response(proc.stdout).text();
    await proc.exited;
    let killed = false;
    for (const pidStr of stdout.trim().split("\n")) {
      const pid = Number.parseInt(pidStr.trim(), 10);
      if (!Number.isNaN(pid)) {
        try {
          process.kill(pid, "SIGTERM");
          killed = true;
        } catch {
          // process already gone
        }
      }
    }
    if (killed) await Bun.sleep(500);
  } catch {
    console.error("Note: lsof not found, cannot check if port is in use");
  }
}

interface ServeOptions {
  workspace: string;
  skillName: string;
  feedbackPath: string;
  previous: Map<string, PreviousIterationEntry>;
  benchmarkPath: string | null;
  port: number;
}

function startServer(options: ServeOptions): { url: string } {
  const { workspace, skillName, feedbackPath, previous, benchmarkPath } = options;

  const fetchHandler = async (req: Request): Promise<Response> => {
    const url = new URL(req.url);

    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      // Regenerate HTML on each request (re-scans workspace for new outputs)
      const runs = findRuns(workspace);
      let benchmark: Record<string, unknown> | null = null;
      if (benchmarkPath && existsSync(benchmarkPath)) {
        benchmark = tryReadJson<Record<string, unknown>>(benchmarkPath);
      }
      const html = generateHtml(runs, skillName, previous, benchmark);
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    if (req.method === "GET" && url.pathname === "/api/feedback") {
      const data = existsSync(feedbackPath) ? readFileSync(feedbackPath) : Buffer.from("{}");
      return new Response(data, { headers: { "Content-Type": "application/json" } });
    }

    if (req.method === "POST" && url.pathname === "/api/feedback") {
      try {
        const data: unknown = await req.json();
        if (typeof data !== "object" || data === null || !("reviews" in data)) {
          throw new Error("Expected JSON object with 'reviews' key");
        }
        writeFileSync(feedbackPath, `${JSON.stringify(data, null, 2)}\n`);
        return new Response('{"ok":true}', { headers: { "Content-Type": "application/json" } });
      } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  };

  let server: ReturnType<typeof Bun.serve>;
  try {
    server = Bun.serve({ hostname: "127.0.0.1", port: options.port, fetch: fetchHandler });
  } catch {
    // Port still in use after kill attempt — find a free one
    server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: fetchHandler });
  }
  return { url: `http://localhost:${server.port}` };
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      port: { type: "string", short: "p", default: "3117" },
      "skill-name": { type: "string", short: "n" },
      "previous-workspace": { type: "string" },
      benchmark: { type: "string" },
      static: { type: "string", short: "s" },
    },
  });

  const workspaceArg = positionals[0];
  if (workspaceArg === undefined) {
    console.error(
      "Usage: bun eval-viewer/generate_review.ts <workspace-path> [--port PORT] [--skill-name NAME] [--static out.html]",
    );
    process.exit(1);
  }
  const workspace = resolve(workspaceArg);
  if (!existsSync(workspace) || !statSync(workspace).isDirectory()) {
    console.error(`Error: ${workspace} is not a directory`);
    process.exit(1);
  }

  const runs = findRuns(workspace);
  if (runs.length === 0) {
    console.error(`No runs found in ${workspace}`);
    process.exit(1);
  }

  const skillName = values["skill-name"] ?? basename(workspace).replace("-workspace", "");
  const feedbackPath = join(workspace, "feedback.json");

  let previous = new Map<string, PreviousIterationEntry>();
  if (values["previous-workspace"]) {
    previous = loadPreviousIteration(resolve(values["previous-workspace"]));
  }

  const benchmarkPath = values.benchmark ? resolve(values.benchmark) : null;
  let benchmark: Record<string, unknown> | null = null;
  if (benchmarkPath && existsSync(benchmarkPath)) {
    benchmark = tryReadJson<Record<string, unknown>>(benchmarkPath);
  }

  if (values.static) {
    const html = generateHtml(runs, skillName, previous, benchmark);
    mkdirSync(dirname(resolve(values.static)), { recursive: true });
    writeFileSync(values.static, html);
    console.log(`\n  Static viewer written to: ${values.static}\n`);
    process.exit(0);
  }

  // Kill any existing process on the target port
  const port = Number(values.port);
  await killPort(port);
  const { url } = startServer({
    workspace,
    skillName,
    feedbackPath,
    previous,
    benchmarkPath,
    port,
  });

  console.log("\n  Eval Viewer");
  console.log("  ─────────────────────────────────");
  console.log(`  URL:       ${url}`);
  console.log(`  Workspace: ${workspace}`);
  console.log(`  Feedback:  ${feedbackPath}`);
  if (previous.size > 0)
    console.log(`  Previous:  ${values["previous-workspace"]} (${previous.size} runs)`);
  if (benchmarkPath) console.log(`  Benchmark: ${benchmarkPath}`);
  console.log("\n  Press Ctrl+C to stop.\n");

  openBrowser(url);
  // Bun.serve keeps the process alive until Ctrl+C.
}

if (import.meta.main) {
  await main();
}
