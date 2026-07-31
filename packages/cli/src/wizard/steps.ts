/**
 * v1 wizard steps: template, name, agents (tasks.md T026).
 *
 * Every step follows the `processArgument` pattern (contracts/
 * command-registry.md): the provided flag answers first, prompting only when
 * the answer is absent — so the same steps serve interactive, CI, and agent
 * callers. Steps only talk to the injected Prompter; no @clack here.
 */
import type { TargetId } from "@patterson/core";

import {
  WizardInputError,
  type PromptChoice,
  type TemplateSource,
  type WizardStep,
} from "./types.ts";

// ---------------------------------------------------------------------------
// Template step
// ---------------------------------------------------------------------------

/**
 * Built-in template source: the skeleton template (T024 creates
 * templates/skeleton/).
 */
export const builtinTemplateSource: TemplateSource = {
  async list() {
    return [
      {
        name: "skeleton",
        label: "Skeleton",
        description: "Minimal Bun project with patterson wired in",
      },
    ];
  },
};

/**
 * Full P3 source: skeleton first, then the 11 vendored design-system
 * templates (lazy import keeps the design snapshot out of module graphs that
 * never open the picker). Offline by construction — the design package reads
 * only vendored bytes.
 */
export const designAwareTemplateSource: TemplateSource = {
  async list() {
    const builtin = await builtinTemplateSource.list();
    const design = await import("@patterson/design");
    const templates = await design.listDesignTemplates();
    return [
      ...builtin,
      ...templates.map((template) => ({
        name: template.name,
        label: template.label,
        description: template.description,
      })),
    ];
  },
};

export const templateStep: WizardStep = {
  id: "template",
  order: 10,
  applicable: () => true,
  async run(ctx) {
    const templates = await ctx.templates.list();
    if (templates.length === 0) {
      throw new WizardInputError("The template source returned no templates.");
    }
    const names = templates.map((t) => t.name);

    const flag = ctx.flags.template;
    if (flag !== undefined) {
      if (!names.includes(flag)) {
        throw new WizardInputError(
          `Unknown template "${flag}" (--template). Available: ${names.join(", ")}.`,
        );
      }
      return { template: flag };
    }

    const choice = await ctx.prompter.select({
      message: "Which template should the project start from?",
      options: templates.map((t) => ({
        value: t.name,
        label: t.label,
        hint: t.description,
      })),
      initialValue: names[0],
    });
    if (!names.includes(choice)) {
      throw new WizardInputError(`Unknown template "${choice}".`);
    }
    return { template: choice };
  },
};

// ---------------------------------------------------------------------------
// Name step
// ---------------------------------------------------------------------------

const NAME_REGEX = /^[a-z0-9][a-z0-9._-]*$/;

/** Directory/package-safe project name; undefined when valid. */
export function validateProjectName(value: string): string | undefined {
  if (value.length === 0) return "Project name must not be empty.";
  if (!NAME_REGEX.test(value)) {
    return (
      "Project name must be lowercase letters, digits, '.', '_' or '-', " +
      "starting with a letter or digit."
    );
  }
  return undefined;
}

export const nameStep: WizardStep = {
  id: "name",
  order: 20,
  applicable: () => true,
  async run(ctx) {
    const flag = ctx.flags.name;
    if (flag !== undefined) {
      const problem = validateProjectName(flag);
      if (problem !== undefined) {
        throw new WizardInputError(`Invalid project name "${flag}" (--name): ${problem}`);
      }
      return { name: flag };
    }

    const answer = await ctx.prompter.text({
      message: "What is the project named?",
      placeholder: "my-project",
      validate: validateProjectName,
    });
    // Re-validate: scripted/alternate prompters may not run `validate`.
    const problem = validateProjectName(answer);
    if (problem !== undefined) {
      throw new WizardInputError(`Invalid project name "${answer}": ${problem}`);
    }
    return { name: answer };
  },
};

// ---------------------------------------------------------------------------
// Agents step
// ---------------------------------------------------------------------------

/**
 * Agent target surfaces offered by the wizard. All five P2 emitters are live
 * (P2b); a future surface starts `disabled: true` and flips off when its
 * emitter lands — no driver change either way.
 */
export const AGENT_CHOICES: readonly (PromptChoice & { value: TargetId })[] = [
  { value: "claude-code", label: "Claude Code" },
  { value: "copilot", label: "GitHub Copilot" },
  { value: "opencode", label: "opencode" },
  { value: "zed", label: "Zed", hint: "MCP servers with env secrets need out-of-band setup" },
  { value: "vscode", label: "VS Code" },
];

/** Validate raw agent ids (flag or prompt answers) into TargetIds. */
function validateAgents(values: string[], source: string): TargetId[] {
  if (values.length === 0) {
    throw new WizardInputError(`Select at least one agent (${source}).`);
  }
  const agents: TargetId[] = [];
  for (const value of values) {
    const choice = AGENT_CHOICES.find((c) => c.value === value);
    if (!choice) {
      const known = AGENT_CHOICES.map((c) => c.value).join(", ");
      throw new WizardInputError(`Unknown agent "${value}" (${source}). Known: ${known}.`);
    }
    if (choice.disabled) {
      throw new WizardInputError(
        `Agent "${value}" is not yet available (${source}): ${choice.hint ?? "coming later"}.`,
      );
    }
    if (!agents.includes(choice.value)) agents.push(choice.value);
  }
  return agents;
}

export const agentsStep: WizardStep = {
  id: "agents",
  order: 30,
  applicable: () => true,
  async run(ctx) {
    const flag = ctx.flags.agents;
    if (flag !== undefined) {
      return { agents: validateAgents(flag, "--agents") };
    }

    const selection = await ctx.prompter.multiselect({
      message: "Which agents should this project target?",
      options: [...AGENT_CHOICES],
      initialValues: ["claude-code"],
      required: true,
    });
    return { agents: validateAgents(selection, "agents prompt") };
  },
};

// ---------------------------------------------------------------------------
// The v1 step registry
// ---------------------------------------------------------------------------

/** Ordered v1 steps. Later phases append here — the driver never changes. */
export const WIZARD_STEPS: readonly WizardStep[] = [templateStep, nameStep, agentsStep];
