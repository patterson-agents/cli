/**
 * `.vscode/tasks.json` emission (MERGE tier — `version` "2.0.0" plus
 * patterson-owned entries in the `tasks` array).
 *
 * Format source: the VS Code tasks documentation
 * (https://code.visualstudio.com/docs/editor/tasks) — tasks.json requires
 * `"version": "2.0.0"`; a task entry is `{ label, type, command, args?,
 * problemMatcher? }`; `"type": "process"` runs the command directly with args
 * (no shell interpretation — C1-friendly), and `"problemMatcher": []`
 * suppresses the matcher-selection prompt.
 *
 * IR source: DevopsDef. v1 projects exactly one task — the configured linter
 * (`devops.lint`, an oxlint/biome XOR) invoked the repo-standard way
 * (`bunx <linter> …`, Bun-only per the constitution's Additional Constraints).
 * No devops ⇒ no tasks.json (deviations-only discipline).
 *
 * Merge semantics: hand-added tasks are preserved (identity: `label`);
 * patterson's labels are replaced with the generated definition so
 * `--accept-generated` restores generated content.
 */
import type { CoverageGap, FileOp, FsSnapshot, KeyPathPatch, PattersonProject } from "@patterson/core";
import { readValueAt } from "@patterson/core";

import { overrideByIdentity } from "./common.ts";

export const TASKS_JSON_PATH = ".vscode/tasks.json";

/** The tasks.json schema version this emitter writes (the only current one). */
export const TASKS_VERSION = "2.0.0";

/** Label prefix marking patterson-owned tasks. */
export const TASK_LABEL_PREFIX = "patterson: ";

interface TaskEntry {
  label: string;
  type: "process";
  command: string;
  args: string[];
  problemMatcher: string[];
}

function lintTask(lint: "oxlint" | "biome"): TaskEntry {
  const args = lint === "oxlint" ? ["oxlint", "."] : ["biome", "check", "."];
  return {
    label: `${TASK_LABEL_PREFIX}lint`,
    type: "process",
    command: "bunx",
    args,
    problemMatcher: [],
  };
}

export interface TasksOutput {
  op: FileOp | null;
  gaps: CoverageGap[];
}

export function buildTasksOp(ir: PattersonProject, snapshot: FsSnapshot): TasksOutput {
  if (ir.devops === undefined) return { op: null, gaps: [] };

  const desired: TaskEntry[] = [lintTask(ir.devops.lint)];

  const currentText = snapshot.read(TASKS_JSON_PATH);
  const current = currentText === null ? undefined : readValueAt(currentText, ["tasks"]).value;
  const merged = overrideByIdentity(current, desired, (item) => {
    if (typeof item === "object" && item !== null && "label" in item) {
      const label = (item as { label: unknown }).label;
      if (typeof label === "string") return label;
    }
    return null;
  });

  const patch: KeyPathPatch[] = [
    { keyPath: ["version"], value: TASKS_VERSION },
    { keyPath: ["tasks"], value: merged },
  ];
  return { op: { path: TASKS_JSON_PATH, format: "jsonc", mode: "merge", patch }, gaps: [] };
}
