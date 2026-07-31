/**
 * Wizard step registry types (T026, plan.md "STEP REGISTRY").
 *
 * The wizard is a linear, resumable flow driven by ordered steps that
 * read/patch a persisted WizardState. Steps never import @clack/prompts —
 * all prompting goes through the injected `Prompter` interface (implemented
 * exactly once, in prompter.ts), so tests drive the wizard headlessly and the
 * MCP module graph never pulls a prompt-capable module into its closure
 * (contracts/command-registry.md: startup assertion, prompt-free core).
 *
 * Later phases (P3 template picker, P4 skills/MCP steps) append new steps to
 * the registry without touching the driver (Constitution VII).
 */
import type { TargetId } from "@patterson/core";

// ---------------------------------------------------------------------------
// Prompter — the only prompting surface steps may use
// ---------------------------------------------------------------------------

/** One selectable choice. `disabled` choices are shown but not selectable. */
export interface PromptChoice {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

export interface SelectOptions {
  message: string;
  options: PromptChoice[];
  initialValue?: string;
}

export interface TextOptions {
  message: string;
  placeholder?: string;
  initialValue?: string;
  /** Return an error message to reject, undefined to accept. */
  validate?(value: string): string | undefined;
}

export interface MultiselectOptions {
  message: string;
  options: PromptChoice[];
  initialValues?: string[];
  /** Require at least one selection (default true). */
  required?: boolean;
}

export interface ConfirmOptions {
  message: string;
  initialValue?: boolean;
}

/**
 * Injected prompting interface. The @clack/prompts implementation lives in
 * prompter.ts; tests supply a scripted implementation. Implementations signal
 * user cancellation by throwing {@link WizardCancelledError}.
 */
export interface Prompter {
  select(options: SelectOptions): Promise<string>;
  text(options: TextOptions): Promise<string>;
  multiselect(options: MultiselectOptions): Promise<string[]>;
  confirm(options: ConfirmOptions): Promise<boolean>;
  note(message: string, title?: string): void;
}

/** Thrown by Prompter implementations when the user cancels (Ctrl-C / Esc). */
export class WizardCancelledError extends Error {
  constructor() {
    super("Wizard cancelled by user.");
    this.name = "WizardCancelledError";
  }
}

/**
 * Thrown by steps/assembly for invalid flag values or incomplete state. The
 * driver converts it into a structured `{ kind: "error" }` outcome — it never
 * escapes `runWizard`.
 */
export class WizardInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WizardInputError";
  }
}

// ---------------------------------------------------------------------------
// WizardState — persisted to .patterson/wizard.json after every step
// ---------------------------------------------------------------------------

export interface WizardState {
  version: 1;
  /** Step ids that have run to completion (drives --resume skipping). */
  completedSteps: string[];
  template?: string;
  name?: string;
  agents?: TargetId[];
}

/**
 * Non-interactive answers provided as CLI flags. Every prompt is backed by a
 * flag (`processArgument` pattern): a step first checks its flag and skips
 * prompting when the answer is already present.
 */
export interface WizardFlags {
  template?: string;
  name?: string;
  agents?: string[];
}

// ---------------------------------------------------------------------------
// TemplateSource
// ---------------------------------------------------------------------------

export interface TemplateInfo {
  /** Template id passed to `create --template <name>`. */
  name: string;
  label: string;
  description?: string;
}

/**
 * Where the template step gets its choices. v1 hardcodes the skeleton
 * template; the P3 design package provides a richer source (vendored design
 * snapshot with thumbnails) by implementing this interface.
 */
export interface TemplateSource {
  list(): Promise<TemplateInfo[]>;
}

// ---------------------------------------------------------------------------
// WizardStep
// ---------------------------------------------------------------------------

/** Context handed to each step's `run`. */
export interface WizardStepCtx {
  prompter: Prompter;
  state: Readonly<WizardState>;
  flags: Readonly<WizardFlags>;
  templates: TemplateSource;
}

export interface WizardStep {
  /** Stable id, recorded in WizardState.completedSteps. */
  id: string;
  /** Execution order (ascending; ties broken by id for determinism). */
  order: number;
  /** Whether the step should run given the current state. */
  applicable(state: Readonly<WizardState>): boolean;
  /**
   * Ask (or read from flags) and return a state patch. Must not write files —
   * persistence is the driver's job.
   */
  run(ctx: WizardStepCtx): Promise<Partial<WizardState>>;
}

// ---------------------------------------------------------------------------
// Final assembly — the wizard funnels into the `create` descriptor
// ---------------------------------------------------------------------------

/**
 * The non-interactive `create` arguments the wizard assembles from its state.
 * Single code path: the wizard CALLS the registered `create` descriptor with
 * these args instead of scaffolding anything itself (T024/T026 contract).
 */
export interface CreateArgs {
  name: string;
  template: string;
  targets: TargetId[];
  yes: true;
}
