/**
 * Wizard driver — runs the step registry, persists state after every step,
 * and funnels the finished state into the registered `create` descriptor
 * (single code path with non-interactive create; Constitution III).
 *
 * The driver is prompt-library-free: it only sees the injected Prompter, so
 * headless tests and (later) MCP-adjacent code never touch @clack.
 */
import type {
  CommandCtx,
  CommandIo,
  CommandRegistry,
  CommandResult,
} from "@patterson/core";

import { clearWizardState, freshWizardState, loadWizardState, saveWizardState } from "./state.ts";
import { AGENT_CHOICES, builtinTemplateSource, validateProjectName, WIZARD_STEPS } from "./steps.ts";
import {
  WizardCancelledError,
  WizardInputError,
  type CreateArgs,
  type Prompter,
  type TemplateSource,
  type WizardFlags,
  type WizardState,
  type WizardStep,
} from "./types.ts";
// (sanitizeResumedState uses AGENT_CHOICES/validateProjectName from steps.ts.)

/** Registry id of the create descriptor the wizard invokes (T024). */
export const CREATE_COMMAND_ID = "create";

// ---------------------------------------------------------------------------
// Step ordering
// ---------------------------------------------------------------------------

/**
 * Deterministically order steps (ascending `order`, id tiebreak) and reject
 * duplicate ids — a duplicate would corrupt completedSteps bookkeeping.
 */
export function orderSteps(steps: readonly WizardStep[]): WizardStep[] {
  const seen = new Set<string>();
  for (const step of steps) {
    if (seen.has(step.id)) {
      throw new Error(`Wizard step registry: duplicate step id "${step.id}".`);
    }
    seen.add(step.id);
  }
  return [...steps].toSorted((a, b) =>
    a.order === b.order ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.order - b.order,
  );
}

// ---------------------------------------------------------------------------
// Final assembly
// ---------------------------------------------------------------------------

/**
 * State → the same non-interactive `create` args a flag-driven invocation
 * would use. Throws WizardInputError when a required answer is missing.
 * `flags` carries the non-wizard passthroughs (--no-install / --no-git).
 */
export function assembleCreateArgs(
  state: Readonly<WizardState>,
  flags: Readonly<WizardFlags> = {},
): CreateArgs {
  const missing: string[] = [];
  if (state.name === undefined) missing.push("name");
  if (state.template === undefined) missing.push("template");
  if (state.agents === undefined || state.agents.length === 0) missing.push("agents");
  if (missing.length > 0 || state.name === undefined || state.template === undefined) {
    throw new WizardInputError(
      `Wizard state is incomplete — missing: ${missing.join(", ")}. Re-run the wizard.`,
    );
  }
  return {
    name: state.name,
    template: state.template,
    targets: [...(state.agents ?? [])],
    yes: true,
    ...(flags.install !== undefined ? { install: flags.install } : {}),
    ...(flags.git !== undefined ? { git: flags.git } : {}),
  };
}

// ---------------------------------------------------------------------------
// Resume sanitization
// ---------------------------------------------------------------------------

/**
 * Semantic validation of a resumed state: a stale/tampered wizard.json must
 * degrade (re-run the offending step), never crash the create funnel with a
 * schema error. Invalid answers are dropped together with their step's
 * completed mark.
 */
export async function sanitizeResumedState(
  state: Readonly<WizardState>,
  templates: TemplateSource,
): Promise<WizardState> {
  const invalidSteps = new Set<string>();

  if (state.template !== undefined) {
    const names = (await templates.list()).map((template) => template.name);
    if (!names.includes(state.template)) invalidSteps.add("template");
  }
  if (state.name !== undefined && validateProjectName(state.name) !== undefined) {
    invalidSteps.add("name");
  }
  if (state.agents !== undefined) {
    const valid = state.agents.every((agent) =>
      AGENT_CHOICES.some((choice) => choice.value === agent && choice.disabled !== true),
    );
    if (!valid || state.agents.length === 0) invalidSteps.add("agents");
  }

  if (invalidSteps.size === 0) return { ...state };
  const next: WizardState = {
    ...state,
    completedSteps: state.completedSteps.filter((id) => !invalidSteps.has(id)),
  };
  if (invalidSteps.has("template")) delete next.template;
  if (invalidSteps.has("name")) delete next.name;
  if (invalidSteps.has("agents")) delete next.agents;
  return next;
}

// ---------------------------------------------------------------------------
// runWizard
// ---------------------------------------------------------------------------

export interface WizardOptions {
  /** Directory the wizard (and create) operates in. */
  cwd: string;
  prompter: Prompter;
  /** Command registry holding the `create` descriptor (Constitution III). */
  registry: CommandRegistry;
  /** Answers provided as flags — skip prompting where present. */
  flags?: WizardFlags;
  /** Load `.patterson/wizard.json` and skip completed steps. */
  resume?: boolean;
  templates?: TemplateSource;
  /** Step registry override (tests / later phases). Default: WIZARD_STEPS. */
  steps?: readonly WizardStep[];
  /** Output sinks passed through to the create descriptor's CommandCtx. */
  io?: CommandIo;
}

export type WizardRunResult =
  /** All steps completed and the create descriptor ran; see `result`. */
  | { kind: "ran"; args: CreateArgs; result: CommandResult<unknown>; state: WizardState }
  /** User cancelled mid-flow; completed steps are persisted for --resume. */
  | { kind: "cancelled"; state: WizardState }
  /** Invalid input (bad flag value) or missing create descriptor. */
  | { kind: "error"; message: string; state: WizardState };

const consoleIo: CommandIo = {
  out(text) {
    console.log(text);
  },
  err(text) {
    console.error(text);
  },
};

/**
 * Run the wizard: execute applicable, not-yet-completed steps in order,
 * persisting state after each; then assemble create args and invoke the
 * `create` descriptor non-interactively. State is cleared only when create
 * returns ok — conflicts/errors keep it so `--resume` can retry.
 */
export async function runWizard(options: WizardOptions): Promise<WizardRunResult> {
  const steps = orderSteps(options.steps ?? WIZARD_STEPS);
  const flags: WizardFlags = options.flags ?? {};
  const templates = options.templates ?? builtinTemplateSource;

  let state: WizardState =
    (options.resume ? await loadWizardState(options.cwd) : undefined) ?? freshWizardState();
  if (options.resume) {
    // A corrupt/stale resume file degrades to re-running the offending steps.
    state = await sanitizeResumedState(state, templates);
  }

  try {
    for (const step of steps) {
      if (state.completedSteps.includes(step.id)) continue;
      if (!step.applicable(state)) continue;
      const patch = await step.run({ prompter: options.prompter, state, flags, templates });
      state = {
        ...state,
        ...patch,
        completedSteps: [...state.completedSteps, step.id],
      };
      await saveWizardState(options.cwd, state);
    }

    const args = assembleCreateArgs(state, flags);
    const create = options.registry.resolve(CREATE_COMMAND_ID);
    if (!create) {
      return {
        kind: "error",
        message:
          `No "${CREATE_COMMAND_ID}" command is registered — the wizard delegates ` +
          "scaffolding to the create descriptor and cannot proceed without it.",
        state,
      };
    }

    const ctx: CommandCtx = {
      cwd: options.cwd,
      // The wizard has already resolved every decision; create must not prompt.
      nonInteractive: true,
      io: options.io ?? consoleIo,
    };
    // The descriptor contract returns structured errors; anything thrown here
    // (e.g. an input-schema rejection) must still not escape runWizard.
    let result: CommandResult<unknown>;
    try {
      result = (await create.run(args, ctx)) as CommandResult<unknown>;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      result = { kind: "error", code: "INTERNAL", message };
    }
    if (result.kind === "ok") await clearWizardState(options.cwd);
    return { kind: "ran", args, result, state };
  } catch (error) {
    if (error instanceof WizardCancelledError) {
      return { kind: "cancelled", state };
    }
    if (error instanceof WizardInputError) {
      return { kind: "error", message: error.message, state };
    }
    throw error;
  }
}
