/**
 * `patterson create` CLI entry routing: interactive sessions enter the wizard
 * (T026 wiring), non-interactive/opted-out sessions run the plain descriptor,
 * and --resume skips completed steps.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";

import {
  isInteractiveSession,
  runCreateCli,
  shouldRunWizard,
  wizardFlagsFrom,
} from "../src/commands/create-entry.ts";
import { buildRegistry } from "../src/commands/registry.ts";
import { WIZARD_STATE_FILE, WizardCancelledError, type Prompter } from "../src/wizard/index.ts";

import { makeIo, makeTempDir, removeDir, stubDeps } from "./helpers.ts";

const dirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await makeTempDir();
  dirs.push(dir);
  return dir;
}
afterEach(async () => {
  while (dirs.length > 0) await removeDir(dirs.pop() as string);
  // runCreateCli sets process.exitCode per the CLI contract; keep the test
  // runner's exit status clean.
  process.exitCode = 0;
});

/** Dequeue the next scripted answer; an exhausted queue acts like Ctrl-C. */
function take<T>(queue: T[] | undefined): T {
  const next = queue?.shift();
  if (next === undefined) throw new WizardCancelledError();
  return next;
}

function scriptedPrompter(script: {
  select?: string[];
  text?: string[];
  multiselect?: string[][];
}): { prompter: Prompter; counts: { select: number; text: number; multiselect: number } } {
  const counts = { select: 0, text: 0, multiselect: 0 };
  const prompter: Prompter = {
    async select() {
      counts.select += 1;
      return take(script.select);
    },
    async text() {
      counts.text += 1;
      return take(script.text);
    },
    async multiselect() {
      counts.multiselect += 1;
      return take(script.multiselect);
    },
    async confirm() {
      return true;
    },
    note() {
      /* headless */
    },
  };
  return { prompter, counts };
}

describe("interactivity routing", () => {
  test("isInteractiveSession requires BOTH stdin and stdout TTYs and not CI", () => {
    expect(isInteractiveSession({}, true, true)).toBe(true);
    expect(isInteractiveSession({}, false, true)).toBe(false); // stdin redirected
    expect(isInteractiveSession({}, true, false)).toBe(false);
    expect(isInteractiveSession({ CI: "true" }, true, true)).toBe(false);
  });

  test("shouldRunWizard: interactive default yes; --yes/--dry-run/non-interactive no", () => {
    expect(shouldRunWizard({}, true)).toBe(true);
    expect(shouldRunWizard({ resume: true }, true)).toBe(true);
    expect(shouldRunWizard({ yes: true }, true)).toBe(false);
    expect(shouldRunWizard({ "dry-run": true }, true)).toBe(false);
    expect(shouldRunWizard({}, false)).toBe(false);
  });

  test("wizardFlagsFrom collects template/name/agents/install/git", () => {
    expect(
      wizardFlagsFrom({
        template: "skeleton",
        name: "x",
        agents: "claude-code,copilot",
        install: false,
        git: false,
      }),
    ).toEqual({
      template: "skeleton",
      name: "x",
      agents: ["claude-code", "copilot"],
      install: false,
      git: false,
    });
  });
});

describe("runCreateCli", () => {
  test("interactive, no flags ⇒ enters the wizard and scaffolds via the real registry", async () => {
    const root = await tempDir();
    const { prompter, counts } = scriptedPrompter({
      select: ["skeleton"],
      text: ["wizard-app"],
      multiselect: [["claude-code"]],
    });
    const { io } = makeIo();

    const outcome = await runCreateCli(
      { dir: root, install: false, git: false },
      { interactive: true, prompter, registry: buildRegistry(stubDeps()), io, cwd: root },
    );

    expect("kind" in outcome && outcome.kind).toBe("ran");
    if (!("kind" in outcome) || outcome.kind !== "ran") throw new Error("unreachable");
    expect(outcome.result.kind).toBe("ok");
    expect(counts.text).toBe(1); // the name prompt ran — the wizard was entered
    expect(await Bun.file(join(root, "patterson.config.ts")).exists()).toBe(true);
  });

  test("--resume skips completed steps", async () => {
    const root = await tempDir();
    // First run: cancel at the name prompt (template answered).
    const first = scriptedPrompter({ select: ["skeleton"], text: [] });
    const firstOutcome = await runCreateCli(
      { dir: root, install: false, git: false },
      {
        interactive: true,
        prompter: first.prompter,
        registry: buildRegistry(stubDeps()),
        io: makeIo().io,
        cwd: root,
      },
    );
    expect("kind" in firstOutcome && firstOutcome.kind).toBe("cancelled");
    expect(await Bun.file(join(root, WIZARD_STATE_FILE)).exists()).toBe(true);

    // Resume: the template select must not run again.
    const second = scriptedPrompter({ text: ["resumed-app"], multiselect: [["claude-code"]] });
    const outcome = await runCreateCli(
      { dir: root, resume: true, install: false, git: false },
      {
        interactive: true,
        prompter: second.prompter,
        registry: buildRegistry(stubDeps()),
        io: makeIo().io,
        cwd: root,
      },
    );
    expect("kind" in outcome && outcome.kind).toBe("ran");
    expect(second.counts.select).toBe(0);
    expect(second.counts.text).toBe(1);
  });

  test("non-interactive falls through to the plain descriptor (decision-required without --yes)", async () => {
    const root = await tempDir();
    const { io, err } = makeIo();
    const result = await runCreateCli(
      { dir: root },
      { interactive: false, registry: buildRegistry(stubDeps()), io, cwd: root },
    );
    expect("kind" in result && result.kind).toBe("decision-required");
    expect(err.join("\n")).toContain("--yes");
  });
});
