/**
 * Wizard step registry (T026) — barrel.
 *
 * NOTE: `createClackPrompter` (the only @clack/prompts consumer) is
 * deliberately NOT re-exported here. Import it from "./prompter.ts" at the
 * CLI entry point only, so any module graph that pulls this barrel (tests,
 * future MCP-adjacent code) stays prompt-library-free.
 */
export {
  assembleCreateArgs,
  CREATE_COMMAND_ID,
  orderSteps,
  runWizard,
  sanitizeResumedState,
  type WizardOptions,
  type WizardRunResult,
} from "./driver.ts";
export {
  clearWizardState,
  freshWizardState,
  loadWizardState,
  saveWizardState,
  WIZARD_STATE_FILE,
  wizardStatePath,
} from "./state.ts";
export {
  AGENT_CHOICES,
  agentsStep,
  builtinTemplateSource,
  nameStep,
  templateStep,
  validateProjectName,
  WIZARD_STEPS,
} from "./steps.ts";
export {
  WizardCancelledError,
  WizardInputError,
  type ConfirmOptions,
  type CreateArgs,
  type MultiselectOptions,
  type PromptChoice,
  type Prompter,
  type SelectOptions,
  type TemplateInfo,
  type TemplateSource,
  type TextOptions,
  type WizardFlags,
  type WizardState,
  type WizardStep,
  type WizardStepCtx,
} from "./types.ts";
