/**
 * `patterson new <kind> <name>` — six generator descriptors over one engine
 * (E-P5, US5; FR-011 `--plan` interview mode).
 *
 * Each kind is its own descriptor (id `new.<kind>`) so the MCP projection
 * exposes six precisely-typed tools. `--plan` writes SPEC-<kind>-<name>.md
 * (interview → SPEC.md → scaffold) instead of scaffolding.
 */
import { join } from "node:path";
import { z } from "zod";

import { defineCommand, type CommandResult, type Finding } from "@patterson/core";
import {
  ALL_GENERATORS,
  renderPlanSpec,
  runGenerator,
  validateGeneratorName,
  type Generator,
} from "@patterson/generators";

export const NewInputSchema = z.strictObject({
  name: z.string().min(1),
  /** Target directory (default: cwd). */
  dir: z.string().default("."),
  /** Plan-first: write a SPEC file to fill in instead of scaffolding (FR-011). */
  plan: z.boolean().default(false),
});

const FindingSchema = z.strictObject({
  checkId: z.string(),
  severity: z.enum(["error", "warn", "info"]),
  message: z.string(),
  path: z.string().optional(),
  fix: z.string().optional(),
});

export const NewOutputSchema = z.strictObject({
  written: z.array(z.string()),
  notes: z.array(z.string()),
  findings: z.array(FindingSchema),
  planned: z.boolean(),
});

export type NewInput = z.infer<typeof NewInputSchema>;
export type NewOutput = z.infer<typeof NewOutputSchema>;

function makeNewCommand(generator: Generator) {
  return defineCommand({
    id: `new.${generator.kind}`,
    path: ["new", generator.kind],
    summary: generator.summary,
    inputSchema: NewInputSchema,
    outputSchema: NewOutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false },
    async run(args, ctx): Promise<CommandResult<NewOutput>> {
      const problem = validateGeneratorName(args.name);
      if (problem !== undefined) {
        return { kind: "error", code: "INVALID_NAME", message: `Invalid name "${args.name}": ${problem}` };
      }
      const root = join(ctx.cwd, args.dir);

      if (args.plan) {
        const specPath = `SPEC-${generator.kind}-${args.name}.md`;
        await Bun.write(join(root, specPath), renderPlanSpec(generator, args.name));
        return {
          kind: "ok",
          value: { written: [specPath], notes: [], findings: [], planned: true },
          report: {
            summary: `Plan written to ${specPath} — fill it in, then re-run without --plan.`,
          },
        };
      }

      const result = await runGenerator(generator, args.name, root);
      const errors = result.findings.filter((finding: Finding) => finding.severity === "error");
      if (errors.length > 0) {
        return {
          kind: "error",
          code: "POST_VALIDATION_FAILED",
          message: errors.map((finding) => finding.message).join("\n"),
        };
      }
      return {
        kind: "ok",
        value: { ...result, planned: false },
        report: {
          summary: `Scaffolded ${generator.kind} "${args.name}": ${result.written.length} file(s).`,
          details: [...result.written.map((path) => `wrote ${path}`), ...result.notes],
        },
      };
    },
  });
}

export const newCommands = ALL_GENERATORS.map((generator) => makeNewCommand(generator));
