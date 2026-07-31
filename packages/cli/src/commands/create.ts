/**
 * `patterson create` — non-interactive scaffold path (T024).
 *
 * Flow: refuse non-empty dir without --force (listing what would be touched) →
 * copy templates/<template>/ with {{name}} substitution → write the typed
 * patterson.config.ts → compile the claude-code emitter through core's
 * applyFileOps → ensure SETUP.md → bun install (--no-install skips) →
 * git init (--no-git skips).
 *
 * The wizard (T026) funnels into this same descriptor with
 * `{ name, template, targets, yes: true }` — `run` re-parses its args through
 * the input schema so both entry paths get identical defaulting.
 */
import { basename, join, resolve } from "node:path";
import { z } from "zod";

import {
  assertWritable,
  defineCommand,
  PattersonProjectSchema,
  RESOLVING_FLAG,
  TargetIdSchema,
  type CommandResult,
  type PattersonProjectInput,
  type TargetId,
} from "@patterson/core";
import {
  collectTemplateFiles,
  directoryEntries,
  PATTERSON_CONFIG_BASENAME,
  renderDefaultSetupMd,
  renderPattersonConfig,
  writeScaffoldFiles,
} from "../../../core/src/scaffold.ts";

import { validateProjectName } from "../wizard/steps.ts";

import {
  defaultDeps,
  describeGaps,
  runEmitPipeline,
  toCommandConflicts,
  type CommandDeps,
} from "./shared.ts";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const CreateInputSchema = z.strictObject({
  /** Target directory, resolved against the command cwd. */
  dir: z.string().default("."),
  /** Project name; defaults to the target directory's basename. */
  name: z.string().min(1).optional(),
  /** Non-interactive confirmation (the wizard always passes true). */
  yes: z.boolean().default(false),
  /** Proceed in a non-empty directory. */
  force: z.boolean().default(false),
  template: z.string().default("skeleton"),
  /** Agent targets; `targets` is the wizard-side alias for the same list. */
  agents: z.array(TargetIdSchema).optional(),
  targets: z.array(TargetIdSchema).optional(),
  /** Run `bun install` after scaffolding (--no-install skips; tests skip). */
  install: z.boolean().default(true),
  /** Run `git init` after scaffolding (--no-git skips). */
  git: z.boolean().default(true),
  /** Plan only: report every file the scaffold+emission would touch, write nothing. */
  dryRun: z.boolean().default(false),
});

export const CreateOutputSchema = z.strictObject({
  root: z.string(),
  /** Template + config files written directly (user-owned, not provenance-tracked). */
  scaffolded: z.array(z.string()),
  /** Files written by the emit engine (provenance-tracked). */
  emitted: z.array(z.string()),
  setupPath: z.string().nullable(),
  installed: z.boolean(),
  gitInitialized: z.boolean(),
  /** True when the run was a plan only (nothing written). */
  dryRun: z.boolean(),
});

export type CreateInput = z.infer<typeof CreateInputSchema>;
export type CreateOutput = z.infer<typeof CreateOutputSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function runProcess(argv: [string, ...string[]], cwd: string): Promise<number> {
  const proc = Bun.spawn(argv, { cwd, stdout: "ignore", stderr: "ignore", stdin: "ignore" });
  return await proc.exited;
}

const DEFAULT_TARGETS: TargetId[] = ["claude-code"];

// ---------------------------------------------------------------------------
// Descriptor
// ---------------------------------------------------------------------------

export function makeCreateCommand(deps: CommandDeps = defaultDeps) {
  return defineCommand({
    id: "create",
    path: ["create"],
    summary: "Scaffold a new patterson-managed project (non-interactive with --yes)",
    inputSchema: CreateInputSchema,
    outputSchema: CreateOutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: true },
    async run(rawArgs, ctx): Promise<CommandResult<CreateOutput>> {
      // Re-parse so wizard-direct invocations get identical defaulting.
      const args = CreateInputSchema.parse(rawArgs);

      if (!args.yes) {
        return {
          kind: "decision-required",
          decision: {
            id: "create.confirm",
            question:
              `Scaffold template "${args.template}" into "${args.dir}" targeting ` +
              `[${(args.agents ?? args.targets ?? DEFAULT_TARGETS).join(", ")}]?`,
            options: [{ flag: "--yes", label: "Proceed with these settings" }],
          },
        };
      }

      const templateDir = join(deps.templatesDir, args.template);
      const available = await directoryEntries(deps.templatesDir);
      if (!available.includes(args.template)) {
        return {
          kind: "error",
          code: "UNKNOWN_TEMPLATE",
          message: `Unknown template "${args.template}". Available: ${available.join(", ") || "(none)"}.`,
        };
      }

      const root = resolve(ctx.cwd, args.dir);
      // Same validation as the wizard's name step for an explicit --name: the
      // name lands in template file PATHS as well as contents, so "/", "..",
      // leading dots, etc. must be rejected (a directory basename cannot
      // contain a separator, so the derived default is traversal-safe).
      if (args.name !== undefined) {
        const nameProblem = validateProjectName(args.name);
        if (nameProblem !== undefined) {
          return {
            kind: "error",
            code: "INVALID_NAME",
            message: `Invalid project name "${args.name}" (--name): ${nameProblem}`,
          };
        }
      }
      const name = args.name ?? basename(root);
      if (name.length === 0) {
        return { kind: "error", code: "INVALID_NAME", message: "Project name must be non-empty." };
      }
      const targets = [...new Set(args.agents ?? args.targets ?? DEFAULT_TARGETS)];

      // Every requested agent target must have an emitter in this phase.
      for (const target of targets) {
        if ((await deps.resolveEmitter(target)) === null) {
          return {
            kind: "error",
            code: "EMITTER_UNAVAILABLE",
            message: `No emitter available for target "${target}" (this phase supports claude-code only).`,
            hint: "Re-run with --agents claude-code.",
          };
        }
      }

      const templateFiles = await collectTemplateFiles(templateDir, { name });
      const wouldTouch = [
        ...templateFiles.map((file) => file.path),
        PATTERSON_CONFIG_BASENAME,
        "SETUP.md",
      ];

      // `.patterson/` is patterson-owned bookkeeping (wizard state, backups);
      // its presence must not make the wizard's own state file fail create.
      const existing = (await directoryEntries(root)).filter((entry) => entry !== ".patterson");
      if (existing.length > 0 && !args.force) {
        return {
          kind: "error",
          code: "DIR_NOT_EMPTY",
          message:
            `Refusing to scaffold into non-empty directory ${root} (${existing.length} entries). ` +
            `Would touch: ${wouldTouch.join(", ")} plus emitter outputs.`,
          hint: "Re-run with --force to proceed anyway (drift protection still applies to emitter outputs).",
        };
      }

      // 1. Template copy (user-owned starter content; not provenance-tracked).
      const configInput: PattersonProjectInput = { version: 1, name, targets };
      let scaffolded: string[];
      if (args.dryRun) {
        // Plan only: report what the scaffold would write, touch nothing.
        scaffolded = [...templateFiles.map((file) => file.path), PATTERSON_CONFIG_BASENAME];
      } else {
        scaffolded = await writeScaffoldFiles(root, templateFiles);

        // 2. Typed authoring config.
        const configAbs = join(root, PATTERSON_CONFIG_BASENAME);
        assertWritable(PATTERSON_CONFIG_BASENAME, { exists: await Bun.file(configAbs).exists() });
        await Bun.write(configAbs, renderPattersonConfig(configInput));
        scaffolded.push(PATTERSON_CONFIG_BASENAME);
      }

      // 3. Emit through the engine (single write path; Constitution II).
      const ir = PattersonProjectSchema.parse(configInput);
      const outcome = await runEmitPipeline(
        ir,
        root,
        { fallbackSetupContent: renderDefaultSetupMd(name), dryRun: args.dryRun },
        deps,
      );
      if (outcome.apply.conflicts.length > 0) {
        return {
          kind: "conflicts",
          conflicts: toCommandConflicts(outcome.apply.conflicts),
          resolvingFlag: RESOLVING_FLAG,
        };
      }

      // 4. bun install + git init (both skippable; failures reported, not fatal).
      const details: string[] = [];
      let installed = false;
      if (args.dryRun) {
        details.push("Dry run: nothing was written; bun install and git init were skipped.");
      } else if (args.install) {
        const code = await runProcess(["bun", "install"], root);
        installed = code === 0;
        if (!installed) details.push(`bun install exited with code ${code}; run it manually.`);
      } else {
        details.push("Skipped bun install (--no-install).");
      }

      let gitInitialized = false;
      if (args.dryRun) {
        // Already noted above.
      } else if (args.git) {
        if (await Bun.file(join(root, ".git", "HEAD")).exists()) {
          details.push("Existing git repository detected; skipped git init.");
        } else {
          const code = await runProcess(["git", "init"], root);
          gitInitialized = code === 0;
          if (!gitInitialized) details.push(`git init exited with code ${code}; run it manually.`);
        }
      } else {
        details.push("Skipped git init (--no-git).");
      }
      for (const target of outcome.unsupported) {
        details.push(`Target "${target}" has no emitter yet; nothing was emitted for it.`);
      }
      details.push(...describeGaps(outcome.gaps));

      const setupPath = outcome.apply.setupPath ?? (outcome.ops.some((op) => op.path === "SETUP.md") ? "SETUP.md" : null);
      return {
        kind: "ok",
        value: {
          root,
          scaffolded,
          emitted: outcome.apply.written,
          setupPath,
          installed,
          gitInitialized,
          dryRun: args.dryRun,
        },
        report: {
          summary: args.dryRun
            ? `Dry run for "${name}" in ${root}: ${scaffolded.length} template file(s) and ` +
              `${outcome.apply.written.length} emitted file(s) would be written; nothing was.`
            : `Scaffolded "${name}" in ${root}: ${scaffolded.length} template file(s), ` +
              `${outcome.apply.written.length} emitted file(s).`,
          ...(details.length > 0 ? { details } : {}),
        },
      };
    },
  });
}

export const createCommand = makeCreateCommand();
