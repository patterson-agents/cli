/**
 * The ONE @clack/prompts-backed Prompter implementation.
 *
 * This is the only module in the workspace allowed to import @clack/prompts
 * for wizard purposes: steps and driver depend solely on the Prompter
 * interface, keeping the MCP module graph prompt-free
 * (contracts/command-registry.md startup assertion).
 */
import * as clack from "@clack/prompts";

import {
  WizardCancelledError,
  type ConfirmOptions,
  type MultiselectOptions,
  type PromptChoice,
  type Prompter,
  type SelectOptions,
  type TextOptions,
} from "./types.ts";

/** Map a clack cancel symbol to the wizard's cancellation error. */
function unwrap<T>(value: T | symbol): T {
  if (clack.isCancel(value)) throw new WizardCancelledError();
  return value as T;
}

function toClackOptions(choices: PromptChoice[]): { value: string; label: string; hint?: string }[] {
  return choices.map((choice) => ({
    value: choice.value,
    label: choice.label,
    hint: choice.hint,
  }));
}

/**
 * clack has no disabled-option concept: disabled choices are surfaced as a
 * note and removed from the selectable list.
 */
function splitDisabled(choices: PromptChoice[]): {
  enabled: PromptChoice[];
  disabled: PromptChoice[];
} {
  return {
    enabled: choices.filter((c) => !c.disabled),
    disabled: choices.filter((c) => c.disabled === true),
  };
}

function noteDisabled(disabled: PromptChoice[]): void {
  if (disabled.length === 0) return;
  const lines = disabled
    .map((c) => `${c.label}${c.hint === undefined ? "" : ` — ${c.hint}`}`)
    .join("\n");
  clack.note(lines, "Not yet available");
}

/** Create the interactive @clack/prompts Prompter. */
export function createClackPrompter(): Prompter {
  return {
    async select(options: SelectOptions): Promise<string> {
      const { enabled, disabled } = splitDisabled(options.options);
      noteDisabled(disabled);
      return unwrap(
        await clack.select({
          message: options.message,
          options: toClackOptions(enabled),
          initialValue: options.initialValue,
        }),
      );
    },

    async text(options: TextOptions): Promise<string> {
      const validate = options.validate;
      return unwrap(
        await clack.text({
          message: options.message,
          placeholder: options.placeholder,
          initialValue: options.initialValue,
          // clack passes `undefined` while the input is empty.
          validate: validate === undefined ? undefined : (value) => validate(value ?? ""),
        }),
      );
    },

    async multiselect(options: MultiselectOptions): Promise<string[]> {
      const { enabled, disabled } = splitDisabled(options.options);
      noteDisabled(disabled);
      return unwrap(
        await clack.multiselect({
          message: options.message,
          options: toClackOptions(enabled),
          initialValues: options.initialValues,
          required: options.required ?? true,
        }),
      );
    },

    async confirm(options: ConfirmOptions): Promise<boolean> {
      return unwrap(
        await clack.confirm({
          message: options.message,
          initialValue: options.initialValue ?? true,
        }),
      );
    },

    note(message: string, title?: string): void {
      clack.note(message, title);
    },
  };
}
