/**
 * `patterson create` CLI entry: routes between the interactive wizard (T026)
 * and the non-interactive create descriptor (T024).
 *
 * The wizard runs when the session is interactive (stdin AND stdout are TTYs,
 * not CI) and the caller did not pass `--yes`/`--dry-run`; `--resume` loads
 * `.patterson/wizard.json` and skips completed steps. Everything else falls
 * through to the plain descriptor path (single code path — the wizard funnels
 * into the same registered create descriptor, Constitution III).
 *
 * The @clack prompter is imported lazily and ONLY on the wizard path, so
 * non-interactive invocations (and any MCP-adjacent module graph) stay
 * prompt-library-free.
 */
import { resolve } from "node:path";

import {
  exitCodeFor,
  type CommandIo,
  type CommandRegistry,
  type CommandResult,
} from "@patterson/core";

import { runWizard, type WizardRunResult } from "../wizard/driver.ts";
import { designAwareTemplateSource } from "../wizard/steps.ts";
import type { Prompter, TemplateSource, WizardFlags } from "../wizard/types.ts";

import { createCommand } from "./create.ts";
import { renderResult, runDescriptor } from "./frontend.ts";
import { buildRegistry } from "./registry.ts";

// ---------------------------------------------------------------------------
// Interactivity routing
// ---------------------------------------------------------------------------

/** Prompting requires BOTH stdin and stdout to be TTYs, and not CI. */
export function isInteractiveSession(
  env: Record<string, string | undefined> = process.env,
  stdinTty: boolean = Boolean(process.stdin.isTTY),
  stdoutTty: boolean = Boolean(process.stdout.isTTY),
): boolean {
  return stdinTty && stdoutTty && env["CI"] !== "true";
}

/**
 * The wizard runs for interactive `patterson create` invocations that did not
 * opt out via `--yes` (fully non-interactive) or `--dry-run` (plan only).
 */
export function shouldRunWizard(
  parsedArgs: Record<string, unknown>,
  interactive: boolean,
): boolean {
  if (!interactive) return false;
  if (parsedArgs["yes"] === true) return false;
  if (parsedArgs["dry-run"] === true || parsedArgs["dryRun"] === true) return false;
  return true;
}

/** Collect the wizard flag answers from citty-parsed create args. */
export function wizardFlagsFrom(parsedArgs: Record<string, unknown>): WizardFlags {
  const flags: WizardFlags = {};
  if (typeof parsedArgs["template"] === "string") flags.template = parsedArgs["template"];
  if (typeof parsedArgs["name"] === "string") flags.name = parsedArgs["name"];
  const agents = parsedArgs["agents"];
  if (Array.isArray(agents)) {
    flags.agents = agents.map(String);
  } else if (typeof agents === "string") {
    flags.agents = agents
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }
  if (typeof parsedArgs["install"] === "boolean") flags.install = parsedArgs["install"];
  if (typeof parsedArgs["git"] === "boolean") flags.git = parsedArgs["git"];
  return flags;
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

export interface CreateEntryOptions {
  /** Override interactivity detection (tests). */
  interactive?: boolean;
  /** Prompter override (tests); default lazily imports the @clack prompter. */
  prompter?: Prompter;
  /** Registry override (tests); default buildRegistry(). */
  registry?: CommandRegistry;
  /** Template source override (tests); default skeleton + design snapshot. */
  templates?: TemplateSource;
  io?: CommandIo;
  cwd?: string;
}

const consoleIo: CommandIo = {
  out(text) {
    console.log(text);
  },
  err(text) {
    console.error(text);
  },
};

/**
 * Run `patterson create` from citty-parsed args: wizard when interactive,
 * plain descriptor otherwise. Sets process.exitCode per the contract
 * (0 ok / 1 error / 2 conflicts / 3 decision-required).
 */
export async function runCreateCli(
  parsedArgs: Record<string, unknown>,
  options: CreateEntryOptions = {},
): Promise<CommandResult<unknown> | WizardRunResult> {
  const interactive = options.interactive ?? isInteractiveSession();
  if (!shouldRunWizard(parsedArgs, interactive)) {
    return runDescriptor(createCommand, parsedArgs, options.io);
  }

  const io = options.io ?? consoleIo;
  const prompter =
    options.prompter ?? (await import("../wizard/prompter.ts")).createClackPrompter();
  const registry = options.registry ?? buildRegistry();
  const dir = typeof parsedArgs["dir"] === "string" ? parsedArgs["dir"] : ".";
  const cwd = resolve(options.cwd ?? process.cwd(), dir);

  const outcome = await runWizard({
    cwd,
    prompter,
    registry,
    templates: options.templates ?? designAwareTemplateSource,
    flags: wizardFlagsFrom(parsedArgs),
    resume: parsedArgs["resume"] === true,
    io,
  });

  switch (outcome.kind) {
    case "ran": {
      renderResult(outcome.result, io, false);
      process.exitCode = exitCodeFor(outcome.result);
      break;
    }
    case "cancelled": {
      io.err("Wizard cancelled — progress saved; re-run `patterson create --resume` to continue.");
      process.exitCode = 1;
      break;
    }
    case "error": {
      io.err(`error[WIZARD]: ${outcome.message}`);
      process.exitCode = 1;
      break;
    }
  }
  return outcome;
}
