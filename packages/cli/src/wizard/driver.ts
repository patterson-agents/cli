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
import { builtinTemplateSource, WIZARD_STEPS } from "./steps.ts";
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
 */
export function assembleCreateArgs(state: Readonly<WizardState>): CreateArgs {
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
  };
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

    const args = assembleCreateArgs(state);
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
    const result = (await create.run(args, ctx)) as CommandResult<unknown>;
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
