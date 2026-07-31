#!/usr/bin/env bun
/**
 * Run trigger evaluation for a skill description.
 *
 * Tests whether a skill's description causes Claude to trigger (read the skill)
 * for a set of queries. Outputs results as JSON.
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import type { EvalItem, EvalOutput, QueryResult } from "./types.ts";
import { claudeEnv, findProjectRoot, mapWithConcurrency, parseSkillMd, readJson } from "./utils.ts";

export { findProjectRoot };

interface StreamEvent {
  type?: string;
  event?: {
    type?: string;
    content_block?: { type?: string; name?: string };
    delta?: { type?: string; partial_json?: string };
  };
  message?: {
    content?: Array<{
      type?: string;
      name?: string;
      input?: { skill?: string; file_path?: string };
    }>;
  };
}

/**
 * Run a single query and return whether the skill was triggered.
 *
 * Creates a command file in .claude/commands/ so it appears in Claude's
 * available_skills list, then runs `claude -p` with the raw query.
 * Uses --include-partial-messages to detect triggering early from
 * stream events (content_block_start) rather than waiting for the
 * full assistant message, which only arrives after tool execution.
 */
export async function runSingleQuery(
  query: string,
  skillName: string,
  skillDescription: string,
  timeoutSeconds: number,
  projectRoot: string,
  model?: string,
): Promise<boolean> {
  const uniqueId = crypto.randomUUID().replaceAll("-", "").slice(0, 8);
  const cleanName = `${skillName}-skill-${uniqueId}`;
  const projectCommandsDir = join(projectRoot, ".claude", "commands");
  const commandFile = join(projectCommandsDir, `${cleanName}.md`);

  try {
    mkdirSync(projectCommandsDir, { recursive: true });
    // Use YAML block scalar to avoid breaking on quotes in description
    const indentedDesc = skillDescription.split("\n").join("\n  ");
    const commandContent = `---\ndescription: |\n  ${indentedDesc}\n---\n\n# ${skillName}\n\nThis skill handles: ${skillDescription}\n`;
    writeFileSync(commandFile, commandContent);

    const cmd = [
      "claude",
      "-p",
      query,
      "--output-format",
      "stream-json",
      "--verbose",
      "--include-partial-messages",
    ];
    if (model) cmd.push("--model", model);

    const proc = Bun.spawn(cmd, {
      cwd: projectRoot,
      env: claudeEnv(),
      stdout: "pipe",
      stderr: "ignore",
    });

    let triggered = false;
    let pendingToolName: string | null = null;
    let accumulatedJson = "";
    let buffer = "";
    let settled = false;

    const finish = (value: boolean): boolean => {
      settled = true;
      return value;
    };

    const timer = setTimeout(() => {
      if (!settled) proc.kill();
    }, timeoutSeconds * 1000);

    try {
      const decoder = new TextDecoder();
      for await (const chunk of proc.stdout) {
        buffer += decoder.decode(chunk, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIdx).trim();
          buffer = buffer.slice(newlineIdx + 1);
          if (!line) continue;

          let event: StreamEvent;
          try {
            event = JSON.parse(line) as StreamEvent;
          } catch {
            continue;
          }

          // Early detection via stream events
          if (event.type === "stream_event") {
            const se = event.event ?? {};
            const seType = se.type ?? "";

            if (seType === "content_block_start") {
              const cb = se.content_block ?? {};
              if (cb.type === "tool_use") {
                const toolName = cb.name ?? "";
                if (toolName === "Skill" || toolName === "Read") {
                  pendingToolName = toolName;
                  accumulatedJson = "";
                } else {
                  return finish(false);
                }
              }
            } else if (seType === "content_block_delta" && pendingToolName) {
              const delta = se.delta ?? {};
              if (delta.type === "input_json_delta") {
                accumulatedJson += delta.partial_json ?? "";
                if (accumulatedJson.includes(cleanName)) return finish(true);
              }
            } else if (seType === "content_block_stop" || seType === "message_stop") {
              if (pendingToolName) return finish(accumulatedJson.includes(cleanName));
              if (seType === "message_stop") return finish(false);
            }
          }

          // Fallback: full assistant message
          else if (event.type === "assistant") {
            for (const contentItem of event.message?.content ?? []) {
              if (contentItem.type !== "tool_use") continue;
              const toolName = contentItem.name ?? "";
              const toolInput = contentItem.input ?? {};
              if (toolName === "Skill" && (toolInput.skill ?? "").includes(cleanName)) {
                triggered = true;
              } else if (toolName === "Read" && (toolInput.file_path ?? "").includes(cleanName)) {
                triggered = true;
              }
              return finish(triggered);
            }
          } else if (event.type === "result") {
            return finish(triggered);
          }
        }
      }
      return finish(triggered);
    } finally {
      clearTimeout(timer);
      // Clean up process on any exit path (return, exception, timeout)
      if (proc.exitCode === null) {
        proc.kill();
        await proc.exited;
      }
    }
  } finally {
    if (existsSync(commandFile)) rmSync(commandFile, { force: true });
  }
}

export interface RunEvalOptions {
  evalSet: EvalItem[];
  skillName: string;
  description: string;
  numWorkers: number;
  timeoutSeconds: number;
  projectRoot: string;
  runsPerQuery?: number;
  triggerThreshold?: number;
  model?: string;
}

/** Run the full eval set and return results. */
export async function runEval(options: RunEvalOptions): Promise<EvalOutput> {
  const {
    evalSet,
    skillName,
    description,
    numWorkers,
    timeoutSeconds,
    projectRoot,
    runsPerQuery = 1,
    triggerThreshold = 0.5,
    model,
  } = options;

  const jobs: Array<{ item: EvalItem; runIdx: number }> = [];
  for (const item of evalSet) {
    for (let runIdx = 0; runIdx < runsPerQuery; runIdx++) {
      jobs.push({ item, runIdx });
    }
  }

  const outcomes = await mapWithConcurrency(jobs, numWorkers, async ({ item }) => {
    try {
      return await runSingleQuery(
        item.query,
        skillName,
        description,
        timeoutSeconds,
        projectRoot,
        model,
      );
    } catch (error) {
      console.error(`Warning: query failed: ${String(error)}`);
      return false;
    }
  });

  const queryTriggers = new Map<string, boolean[]>();
  const queryItems = new Map<string, EvalItem>();
  jobs.forEach(({ item }, index) => {
    queryItems.set(item.query, item);
    const list = queryTriggers.get(item.query) ?? [];
    list.push(outcomes[index] ?? false);
    queryTriggers.set(item.query, list);
  });

  const results: QueryResult[] = [];
  for (const [query, triggers] of queryTriggers) {
    const item = queryItems.get(query) as EvalItem;
    const triggerCount = triggers.filter(Boolean).length;
    const triggerRate = triggerCount / triggers.length;
    const shouldTrigger = item.should_trigger;
    const didPass = shouldTrigger
      ? triggerRate >= triggerThreshold
      : triggerRate < triggerThreshold;
    results.push({
      query,
      should_trigger: shouldTrigger,
      trigger_rate: triggerRate,
      triggers: triggerCount,
      runs: triggers.length,
      pass: didPass,
    });
  }

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;

  return {
    skill_name: skillName,
    description,
    results,
    summary: { total, passed, failed: total - passed },
  };
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
      "runs-per-query": { type: "string", default: "3" },
      "trigger-threshold": { type: "string", default: "0.5" },
      model: { type: "string" },
      verbose: { type: "boolean", default: false },
    },
  });

  const evalSetPath = values["eval-set"];
  const skillPathArg = values["skill-path"];
  if (!evalSetPath || !skillPathArg) {
    console.error("Usage: bun scripts/run_eval.ts --eval-set <file> --skill-path <dir> [options]");
    process.exit(1);
  }

  const evalSet = readJson<EvalItem[]>(evalSetPath);

  if (!existsSync(join(skillPathArg, "SKILL.md"))) {
    console.error(`Error: No SKILL.md found at ${skillPathArg}`);
    process.exit(1);
  }

  const { name, description: originalDescription } = parseSkillMd(skillPathArg);
  const description = values.description ?? originalDescription;
  const projectRoot = findProjectRoot();

  if (values.verbose) console.error(`Evaluating: ${description}`);

  const output = await runEval({
    evalSet,
    skillName: name,
    description,
    numWorkers: Number(values["num-workers"]),
    timeoutSeconds: Number(values.timeout),
    projectRoot,
    runsPerQuery: Number(values["runs-per-query"]),
    triggerThreshold: Number(values["trigger-threshold"]),
    model: values.model,
  });

  if (values.verbose) {
    const summary = output.summary;
    console.error(`Results: ${summary.passed}/${summary.total} passed`);
    for (const r of output.results) {
      const status = r.pass ? "PASS" : "FAIL";
      console.error(
        `  [${status}] rate=${r.triggers}/${r.runs} expected=${r.should_trigger}: ${r.query.slice(0, 70)}`,
      );
    }
  }

  console.log(JSON.stringify(output, null, 2));
}

if (import.meta.main) {
  await main();
}
