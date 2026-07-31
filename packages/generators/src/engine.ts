/**
 * Generator engine (E-P5, US5): one template+substitution+post-validation
 * pipeline shared by all six generators. Generators produce ScaffoldFiles
 * (pure data); the engine writes through core's guarded scaffold writer
 * (never-write list + path-traversal assertions) and then runs the
 * generator's post-validation against what actually landed on disk.
 */
import type { Finding, ScaffoldFile } from "@patterson/core";
import { writeScaffoldFiles } from "@patterson/core";

export type GeneratorKind =
  | "skill"
  | "mcp-server"
  | "plugin"
  | "marketplace"
  | "command"
  | "cli-plugin";

/** Name rule shared by every generator (npm/dir/frontmatter-safe). */
export const GENERATOR_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

export function validateGeneratorName(name: string): string | undefined {
  if (!GENERATOR_NAME_RE.test(name)) {
    return "Name must be lowercase letters, digits and '-', starting with a letter or digit.";
  }
  return undefined;
}

export interface GeneratedOutput {
  files: ScaffoldFile[];
  /** Follow-up steps the generator wants the user to see. */
  notes: string[];
}

export interface Generator {
  kind: GeneratorKind;
  summary: string;
  /** Pure: produce the files for `name` (paths relative to the target root). */
  generate(name: string): GeneratedOutput;
  /** Structured plan-first interview sections for `--plan` (FR-011). */
  planSections(name: string): string[];
  /** Validate what landed on disk (spec-valid frontmatter, dir==name, …). */
  postValidate?(root: string, name: string): Promise<Finding[]>;
}

export interface RunGeneratorResult {
  written: string[];
  notes: string[];
  findings: Finding[];
}

/** Write a generator's output under `root`, then post-validate. */
export async function runGenerator(
  generator: Generator,
  name: string,
  root: string,
): Promise<RunGeneratorResult> {
  const output = generator.generate(name);
  const written = await writeScaffoldFiles(root, output.files);
  const findings = (await generator.postValidate?.(root, name)) ?? [];
  return { written, notes: output.notes, findings };
}

/** Render the `--plan` SPEC.md (interview → SPEC.md → scaffold, FR-011). */
export function renderPlanSpec(generator: Generator, name: string): string {
  return [
    `# SPEC — ${generator.kind} "${name}"`,
    "",
    `> Plan-first mode (\`--plan\`): answer the sections below, then re-run`,
    `> \`patterson new ${generator.kind} ${name}\` (without \`--plan\`) to scaffold.`,
    `> An AI agent connected over \`patterson mcp serve\` can fill this in with you.`,
    "",
    ...generator.planSections(name),
    "",
  ].join("\n");
}
