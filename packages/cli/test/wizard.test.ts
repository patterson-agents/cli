/**
 * T026 — Wizard step registry tests (written before/with the implementation
 * per constitution Development Workflow: tests-first for core mechanisms).
 *
 * The wizard is driven headlessly through a scripted Prompter — no @clack in
 * this test's module graph. Covers:
 *   - step ordering + registry validation (duplicate ids)
 *   - full interactive run: prompts template → name → agents, persists
 *     .patterson/wizard.json after every step, calls the `create` descriptor
 *     with the assembled non-interactive args, clears state on ok
 *   - processArgument pattern: provided flags skip prompting entirely
 *   - cancellation mid-flow keeps persisted state; --resume skips completed
 *     steps
 *   - invalid flag values → structured error result (no throw)
 *   - agents multiselect exposes only claude-code as enabled
 *   - create result propagation (conflicts ⇒ state NOT cleared)
 *   - missing `create` descriptor → error result
 */
import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createRegistry,
  type AnyCommandDescriptor,
  type CommandCtx,
  type CommandRegistry,
  type CommandResult,
} from "@patterson/core";

import { buildRegistry } from "../src/commands/registry.ts";
import {
  AGENT_CHOICES,
  agentsStep,
  assembleCreateArgs,
  builtinTemplateSource,
  freshWizardState,
  loadWizardState,
  nameStep,
  orderSteps,
  runWizard,
  sanitizeResumedState,
  templateStep,
  validateProjectName,
  WIZARD_STATE_FILE,
  WIZARD_STEPS,
  WizardCancelledError,
  WizardInputError,
  wizardStatePath,
  type CreateArgs,
  type MultiselectOptions,
  type Prompter,
  type SelectOptions,
  type TextOptions,
  type WizardState,
  type WizardStep,
} from "../src/wizard/index.ts";

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const roots: string[] = [];
function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "patterson-wizard-"));
  roots.push(root);
  return root;
}
process.on("exit", () => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

interface ScriptedCalls {
  select: SelectOptions[];
  text: TextOptions[];
  multiselect: MultiselectOptions[];
}

interface Script {
  select?: (string | "cancel")[];
  text?: (string | "cancel")[];
  multiselect?: (string[] | "cancel")[];
  confirm?: boolean[];
}

function take<T>(queue: (T | "cancel")[] | undefined, kind: string): T {
  const next = queue?.shift();
  if (next === undefined) throw new Error(`Scripted prompter exhausted for ${kind}`);
  if (next === "cancel") throw new WizardCancelledError();
  return next as T;
}

/** Headless Prompter: replays scripted answers and records every call. */
function scriptedPrompter(script: Script): { prompter: Prompter; calls: ScriptedCalls } {
  const calls: ScriptedCalls = { select: [], text: [], multiselect: [] };
  const prompter: Prompter = {
    async select(opts) {
      calls.select.push(opts);
      return take(script.select, "select");
    },
    async text(opts) {
      calls.text.push(opts);
      return take(script.text, "text");
    },
    async multiselect(opts) {
      calls.multiselect.push(opts);
      return take(script.multiselect, "multiselect");
    },
    async confirm() {
      return take(script.confirm, "confirm");
    },
    note() {
      /* headless */
    },
  };
  return { prompter, calls };
}

interface CreateStub {
  registry: CommandRegistry;
  invocations: { args: CreateArgs; ctx: CommandCtx }[];
}

/**
 * Registry with a stub `create` descriptor. The wizard never touches the zod
 * schemas (the real create descriptor validates its own input), so the stub
 * casts a schema-free object into descriptor shape.
 */
function stubCreateRegistry(result?: CommandResult<unknown>): CreateStub {
  const registry = createRegistry();
  const invocations: CreateStub["invocations"] = [];
  const descriptor = {
    id: "create",
    path: ["create"],
    summary: "stub create",
    inputSchema: undefined,
    outputSchema: undefined,
    annotations: { readOnlyHint: false, destructiveHint: false },
    async run(args: CreateArgs, ctx: CommandCtx): Promise<CommandResult<unknown>> {
      invocations.push({ args, ctx });
      return result ?? { kind: "ok", value: { created: args.name } };
    },
  } as unknown as AnyCommandDescriptor;
  registry.register(descriptor);
  return { registry, invocations };
}

const silentIo = { out() {}, err() {} };

// ---------------------------------------------------------------------------
// Step registry mechanics
// ---------------------------------------------------------------------------

describe("step registry", () => {
  test("WIZARD_STEPS contains exactly template, name, agents in order", () => {
    expect(WIZARD_STEPS.map((s) => s.id)).toEqual(["template", "name", "agents"]);
    const orders = WIZARD_STEPS.map((s) => s.order);
    expect(orders).toEqual([...orders].toSorted((a, b) => a - b));
  });

  test("orderSteps sorts by order (id tiebreak) regardless of array order", () => {
    const ordered = orderSteps([agentsStep, nameStep, templateStep]);
    expect(ordered.map((s) => s.id)).toEqual(["template", "name", "agents"]);
  });

  test("orderSteps rejects duplicate step ids", () => {
    expect(() => orderSteps([templateStep, { ...nameStep, id: "template" }])).toThrow(
      /duplicate/i,
    );
  });

  test("later phases can append steps without touching the driver", async () => {
    const seen: string[] = [];
    const extra: WizardStep = {
      id: "extra",
      order: 99,
      applicable: () => true,
      async run() {
        seen.push("extra ran");
        return {};
      },
    };
    const root = makeRoot();
    const { prompter } = scriptedPrompter({
      select: ["skeleton"],
      text: ["demo"],
      multiselect: [["claude-code"]],
    });
    const { registry } = stubCreateRegistry();
    const outcome = await runWizard({
      cwd: root,
      prompter,
      registry,
      io: silentIo,
      steps: [...WIZARD_STEPS, extra],
    });
    expect(outcome.kind).toBe("ran");
    expect(seen).toEqual(["extra ran"]);
  });

  test("inapplicable steps are skipped without being marked completed", async () => {
    const root = makeRoot();
    const never: WizardStep = {
      id: "never",
      order: 5,
      applicable: () => false,
      async run() {
        throw new Error("must not run");
      },
    };
    const { prompter } = scriptedPrompter({
      select: ["skeleton"],
      text: ["demo"],
      multiselect: [["claude-code"]],
    });
    const { registry } = stubCreateRegistry({ kind: "error", code: "E", message: "stop" });
    const outcome = await runWizard({
      cwd: root,
      prompter,
      registry,
      io: silentIo,
      steps: [never, ...WIZARD_STEPS],
    });
    expect(outcome.kind).toBe("ran");
    const state = await loadWizardState(root);
    expect(state?.completedSteps).toEqual(["template", "name", "agents"]);
  });
});

// ---------------------------------------------------------------------------
// Full interactive run
// ---------------------------------------------------------------------------

describe("interactive run", () => {
  test("prompts template → name → agents, persists state, calls create, clears on ok", async () => {
    const root = makeRoot();
    const { prompter, calls } = scriptedPrompter({
      select: ["skeleton"],
      text: ["my-app"],
      multiselect: [["claude-code"]],
    });
    const { registry, invocations } = stubCreateRegistry();

    const outcome = await runWizard({ cwd: root, prompter, registry, io: silentIo });

    expect(outcome.kind).toBe("ran");
    if (outcome.kind !== "ran") throw new Error("unreachable");
    expect(outcome.result.kind).toBe("ok");
    expect(outcome.args).toEqual({
      name: "my-app",
      template: "skeleton",
      targets: ["claude-code"],
      yes: true,
    });

    // Single code path: the create descriptor was invoked, non-interactively.
    expect(invocations).toHaveLength(1);
    expect(invocations[0]?.args).toEqual(outcome.args);
    expect(invocations[0]?.ctx.nonInteractive).toBe(true);
    expect(invocations[0]?.ctx.cwd).toBe(root);

    // Each prompt happened exactly once.
    expect(calls.select).toHaveLength(1);
    expect(calls.text).toHaveLength(1);
    expect(calls.multiselect).toHaveLength(1);

    // Template choices came from the TemplateSource.
    expect(calls.select[0]?.options.map((o) => o.value)).toEqual(["skeleton"]);

    // State file is cleared after a successful create.
    expect(await Bun.file(wizardStatePath(root)).exists()).toBe(false);
  });

  test("agents multiselect exposes only claude-code as enabled", async () => {
    const root = makeRoot();
    const { prompter, calls } = scriptedPrompter({
      select: ["skeleton"],
      text: ["demo"],
      multiselect: [["claude-code"]],
    });
    const { registry } = stubCreateRegistry();
    await runWizard({ cwd: root, prompter, registry, io: silentIo });

    const options = calls.multiselect[0]?.options ?? [];
    const enabled = options.filter((o) => !o.disabled).map((o) => o.value);
    expect(enabled).toEqual(["claude-code"]);
    // The other agent surfaces are present but disabled.
    expect(options.length).toBeGreaterThan(1);
    for (const choice of options) {
      if (choice.value !== "claude-code") expect(choice.disabled).toBe(true);
    }
  });

  test("state is persisted after every completed step", async () => {
    const root = makeRoot();
    // Cancel at the name prompt — template must already be on disk.
    const { prompter } = scriptedPrompter({ select: ["skeleton"], text: ["cancel"] });
    const { registry, invocations } = stubCreateRegistry();

    const outcome = await runWizard({ cwd: root, prompter, registry, io: silentIo });
    expect(outcome.kind).toBe("cancelled");
    expect(invocations).toHaveLength(0);

    const state = await loadWizardState(root);
    expect(state).toBeDefined();
    expect(state?.template).toBe("skeleton");
    expect(state?.completedSteps).toEqual(["template"]);
    expect(state?.name).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// processArgument pattern (flags skip prompting)
// ---------------------------------------------------------------------------

describe("flags (processArgument)", () => {
  test("all flags provided ⇒ zero prompts, create still called", async () => {
    const root = makeRoot();
    const { prompter, calls } = scriptedPrompter({});
    const { registry, invocations } = stubCreateRegistry();

    const outcome = await runWizard({
      cwd: root,
      prompter,
      registry,
      io: silentIo,
      flags: { template: "skeleton", name: "flagged", agents: ["claude-code"] },
    });

    expect(outcome.kind).toBe("ran");
    expect(calls.select).toHaveLength(0);
    expect(calls.text).toHaveLength(0);
    expect(calls.multiselect).toHaveLength(0);
    expect(invocations[0]?.args).toEqual({
      name: "flagged",
      template: "skeleton",
      targets: ["claude-code"],
      yes: true,
    });
  });

  test("partial flags: only the missing answers are prompted", async () => {
    const root = makeRoot();
    const { prompter, calls } = scriptedPrompter({ multiselect: [["claude-code"]] });
    const { registry } = stubCreateRegistry();

    const outcome = await runWizard({
      cwd: root,
      prompter,
      registry,
      io: silentIo,
      flags: { template: "skeleton", name: "partial" },
    });

    expect(outcome.kind).toBe("ran");
    expect(calls.select).toHaveLength(0);
    expect(calls.text).toHaveLength(0);
    expect(calls.multiselect).toHaveLength(1);
  });

  test("unknown --template value ⇒ structured error result", async () => {
    const root = makeRoot();
    const { prompter } = scriptedPrompter({});
    const { registry, invocations } = stubCreateRegistry();

    const outcome = await runWizard({
      cwd: root,
      prompter,
      registry,
      io: silentIo,
      flags: { template: "no-such-template", name: "x", agents: ["claude-code"] },
    });

    expect(outcome.kind).toBe("error");
    if (outcome.kind !== "error") throw new Error("unreachable");
    expect(outcome.message).toContain("no-such-template");
    expect(invocations).toHaveLength(0);
  });

  test("disabled agent via --agents ⇒ structured error result", async () => {
    const root = makeRoot();
    const { prompter } = scriptedPrompter({});
    const { registry, invocations } = stubCreateRegistry();

    const outcome = await runWizard({
      cwd: root,
      prompter,
      registry,
      io: silentIo,
      flags: { template: "skeleton", name: "x", agents: ["copilot"] },
    });

    expect(outcome.kind).toBe("error");
    if (outcome.kind !== "error") throw new Error("unreachable");
    expect(outcome.message).toContain("copilot");
    expect(invocations).toHaveLength(0);
  });

  test("invalid --name value ⇒ structured error result", async () => {
    const root = makeRoot();
    const { prompter } = scriptedPrompter({});
    const { registry, invocations } = stubCreateRegistry();

    const outcome = await runWizard({
      cwd: root,
      prompter,
      registry,
      io: silentIo,
      flags: { template: "skeleton", name: "Bad Name!", agents: ["claude-code"] },
    });

    expect(outcome.kind).toBe("error");
    expect(invocations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Resume
// ---------------------------------------------------------------------------

describe("--resume", () => {
  test("resume loads persisted state and skips completed steps", async () => {
    const root = makeRoot();

    // First run: answer template, cancel at name.
    const first = scriptedPrompter({ select: ["skeleton"], text: ["cancel"] });
    const stub1 = stubCreateRegistry();
    const firstOutcome = await runWizard({
      cwd: root,
      prompter: first.prompter,
      registry: stub1.registry,
      io: silentIo,
    });
    expect(firstOutcome.kind).toBe("cancelled");

    // Second run with resume: template step must NOT prompt again.
    const second = scriptedPrompter({ text: ["resumed"], multiselect: [["claude-code"]] });
    const stub2 = stubCreateRegistry();
    const outcome = await runWizard({
      cwd: root,
      prompter: second.prompter,
      registry: stub2.registry,
      io: silentIo,
      resume: true,
    });

    expect(outcome.kind).toBe("ran");
    if (outcome.kind !== "ran") throw new Error("unreachable");
    expect(second.calls.select).toHaveLength(0);
    expect(outcome.args).toEqual({
      name: "resumed",
      template: "skeleton",
      targets: ["claude-code"],
      yes: true,
    });
    expect(stub2.invocations).toHaveLength(1);
  });

  test("without resume, persisted state is ignored and all steps run", async () => {
    const root = makeRoot();
    const first = scriptedPrompter({ select: ["skeleton"], text: ["cancel"] });
    await runWizard({
      cwd: root,
      prompter: first.prompter,
      registry: stubCreateRegistry().registry,
      io: silentIo,
    });

    const second = scriptedPrompter({
      select: ["skeleton"],
      text: ["fresh"],
      multiselect: [["claude-code"]],
    });
    const outcome = await runWizard({
      cwd: root,
      prompter: second.prompter,
      registry: stubCreateRegistry().registry,
      io: silentIo,
    });
    expect(outcome.kind).toBe("ran");
    expect(second.calls.select).toHaveLength(1);
  });

  test("resume with corrupt wizard.json starts fresh instead of crashing", async () => {
    const root = makeRoot();
    await Bun.write(join(root, WIZARD_STATE_FILE), "{not json");
    const { prompter, calls } = scriptedPrompter({
      select: ["skeleton"],
      text: ["demo"],
      multiselect: [["claude-code"]],
    });
    const outcome = await runWizard({
      cwd: root,
      prompter,
      registry: stubCreateRegistry().registry,
      io: silentIo,
      resume: true,
    });
    expect(outcome.kind).toBe("ran");
    expect(calls.select).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Create-descriptor coupling
// ---------------------------------------------------------------------------

describe("create invocation", () => {
  test("missing `create` descriptor ⇒ error result, state preserved", async () => {
    const root = makeRoot();
    const { prompter } = scriptedPrompter({
      select: ["skeleton"],
      text: ["demo"],
      multiselect: [["claude-code"]],
    });
    const outcome = await runWizard({
      cwd: root,
      prompter,
      registry: createRegistry(),
      io: silentIo,
    });
    expect(outcome.kind).toBe("error");
    if (outcome.kind !== "error") throw new Error("unreachable");
    expect(outcome.message).toContain("create");
    // Answers survive so --resume can retry once create exists.
    const state = await loadWizardState(root);
    expect(state?.completedSteps).toEqual(["template", "name", "agents"]);
  });

  test("create conflicts result propagates and state is NOT cleared", async () => {
    const root = makeRoot();
    const { prompter } = scriptedPrompter({
      select: ["skeleton"],
      text: ["demo"],
      multiselect: [["claude-code"]],
    });
    const conflicts: CommandResult<unknown> = {
      kind: "conflicts",
      conflicts: [{ path: "CLAUDE.md", message: "hand-edited" }],
      resolvingFlag: "--accept-generated",
    };
    const { registry } = stubCreateRegistry(conflicts);
    const outcome = await runWizard({ cwd: root, prompter, registry, io: silentIo });

    expect(outcome.kind).toBe("ran");
    if (outcome.kind !== "ran") throw new Error("unreachable");
    expect(outcome.result.kind).toBe("conflicts");
    expect(await Bun.file(wizardStatePath(root)).exists()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Real create descriptor (buildRegistry) integration
// ---------------------------------------------------------------------------

describe("wizard → real create descriptor", () => {
  test("completes against the real create from buildRegistry() in an empty dir", async () => {
    const root = makeRoot();
    const { prompter } = scriptedPrompter({
      select: ["skeleton"],
      text: ["real-deal"],
      multiselect: [["claude-code"]],
    });

    // The wizard persists .patterson/wizard.json into cwd after every step;
    // the real create must not count that as a non-empty directory.
    const outcome = await runWizard({
      cwd: root,
      prompter,
      registry: buildRegistry(),
      io: silentIo,
      flags: { install: false, git: false },
    });

    expect(outcome.kind).toBe("ran");
    if (outcome.kind !== "ran") throw new Error("unreachable");
    expect(outcome.result.kind).toBe("ok");
    expect(await Bun.file(join(root, "patterson.config.ts")).exists()).toBe(true);
    expect(await Bun.file(join(root, "package.json")).exists()).toBe(true);
    // Wizard state cleared after the successful create.
    expect(await Bun.file(wizardStatePath(root)).exists()).toBe(false);
  });

  test("resume with semantically-corrupt state degrades: offending step re-runs, no throw", async () => {
    const root = makeRoot();
    await Bun.write(
      join(root, WIZARD_STATE_FILE),
      JSON.stringify({
        version: 1,
        completedSteps: ["template", "name", "agents"],
        template: "skeleton",
        name: "tampered",
        agents: ["garbage-agent"],
      }),
    );
    const { prompter, calls } = scriptedPrompter({ multiselect: [["claude-code"]] });
    const outcome = await runWizard({
      cwd: root,
      prompter,
      registry: buildRegistry(),
      io: silentIo,
      resume: true,
      flags: { install: false, git: false },
    });

    // No ZodError escapes; the agents step re-ran and create succeeded.
    expect(outcome.kind).toBe("ran");
    if (outcome.kind !== "ran") throw new Error("unreachable");
    expect(calls.multiselect).toHaveLength(1);
    expect(outcome.args.targets).toEqual(["claude-code"]);
    expect(outcome.result.kind).toBe("ok");
  });

  test("sanitizeResumedState drops invalid answers and their completed marks", async () => {
    const dirty: WizardState = {
      version: 1,
      completedSteps: ["template", "name", "agents"],
      template: "no-such-template",
      name: "UPPER CASE",
      agents: ["claude-code"],
    };
    const clean = await sanitizeResumedState(dirty, builtinTemplateSource);
    expect(clean.template).toBeUndefined();
    expect(clean.name).toBeUndefined();
    expect(clean.agents).toEqual(["claude-code"]);
    expect(clean.completedSteps).toEqual(["agents"]);
  });

  test("a throwing create descriptor becomes a structured error result, never an escape", async () => {
    const root = makeRoot();
    const { prompter } = scriptedPrompter({
      select: ["skeleton"],
      text: ["thrower"],
      multiselect: [["claude-code"]],
    });
    const registry = createRegistry();
    registry.register({
      id: "create",
      path: ["create"],
      summary: "throws",
      inputSchema: undefined,
      outputSchema: undefined,
      annotations: { readOnlyHint: false, destructiveHint: false },
      async run() {
        throw new Error("unexpected explosion");
      },
    } as unknown as AnyCommandDescriptor);

    const outcome = await runWizard({ cwd: root, prompter, registry, io: silentIo });
    expect(outcome.kind).toBe("ran");
    if (outcome.kind !== "ran") throw new Error("unreachable");
    expect(outcome.result.kind).toBe("error");
    if (outcome.result.kind !== "error") throw new Error("unreachable");
    expect(outcome.result.message).toContain("unexpected explosion");
  });
});

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

describe("assembleCreateArgs", () => {
  test("assembles the non-interactive create args from complete state", () => {
    const state: WizardState = {
      version: 1,
      completedSteps: ["template", "name", "agents"],
      template: "skeleton",
      name: "demo",
      agents: ["claude-code"],
    };
    expect(assembleCreateArgs(state)).toEqual({
      name: "demo",
      template: "skeleton",
      targets: ["claude-code"],
      yes: true,
    });
  });

  test("throws WizardInputError on incomplete state", () => {
    expect(() => assembleCreateArgs(freshWizardState())).toThrow(WizardInputError);
  });
});

describe("validateProjectName", () => {
  test("accepts lowercase package-ish names", () => {
    expect(validateProjectName("my-app")).toBeUndefined();
    expect(validateProjectName("app2")).toBeUndefined();
    expect(validateProjectName("a.b_c-d")).toBeUndefined();
  });
  test("rejects empty, spaced, uppercase, and path-y names", () => {
    expect(validateProjectName("")).toBeDefined();
    expect(validateProjectName("has space")).toBeDefined();
    expect(validateProjectName("Caps")).toBeDefined();
    expect(validateProjectName("../evil")).toBeDefined();
  });
});

describe("template source", () => {
  test("builtin source lists exactly the skeleton template for now", async () => {
    const templates = await builtinTemplateSource.list();
    expect(templates.map((t) => t.name)).toEqual(["skeleton"]);
  });
});

describe("AGENT_CHOICES", () => {
  test("claude-code is the only enabled agent surface", () => {
    const enabled = AGENT_CHOICES.filter((c) => !c.disabled).map((c) => c.value);
    expect(enabled).toEqual(["claude-code"]);
  });
});
