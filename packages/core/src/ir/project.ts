/**
 * PattersonProject — the canonical IR root (Constitution I: the IR is the product).
 */
import { z } from "zod";

import {
  AgentDefSchema,
  CommandDefSchema,
  DevopsDefSchema,
  EmitPolicySchema,
  EnvironmentDefSchema,
  ExtensionRecSchema,
  HooksSchema,
  InstructionBlockSchema,
  MarketplaceRefSchema,
  McpServerDefSchema,
  ModelDefSchema,
  PolicyDefSchema,
  SkillDefSchema,
} from "./entities.ts";
import { TargetIdSchema } from "./values.ts";

export { TargetIdSchema } from "./values.ts";
export type { TargetId } from "./values.ts";

/** Adds a "duplicate <label>" issue for every repeated key in `items`. */
function checkUnique<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  arrayField: string,
  label: string,
  ctx: z.core.$RefinementCtx,
): void {
  const seen = new Map<string, number>();
  items.forEach((item, index) => {
    const key = keyOf(item);
    const firstIndex = seen.get(key);
    if (firstIndex === undefined) {
      seen.set(key, index);
      return;
    }
    ctx.addIssue({
      code: "custom",
      message: `Duplicate ${label} "${key}" (first defined at ${arrayField}[${firstIndex}]).`,
      path: [arrayField, index],
    });
  });
}

export const PattersonProjectSchema = z
  // Strict: an unrecognized top-level key (e.g. the typo "skils") is a parse
  // error, never silently-stripped author content.
  .strictObject({
    version: z.literal(1),
    name: z.string().min(1, { error: "Project name must be non-empty." }),
    /** Global opt-in target set; unknown ids are rejected by the enum. */
    targets: z.array(TargetIdSchema).default([]),
    instructions: z.array(InstructionBlockSchema).default([]),
    skills: z.array(SkillDefSchema).default([]),
    agents: z.array(AgentDefSchema).default([]),
    commands: z.array(CommandDefSchema).default([]),
    mcp: z.array(McpServerDefSchema).default([]),
    policy: PolicyDefSchema.default({ allow: [], deny: [], ask: [] }),
    models: ModelDefSchema.default({}),
    /** Agent hooks and git hooks are never merged into one concept. */
    hooks: HooksSchema.default({ agentHooks: [], gitHooks: [] }),
    marketplaces: z.array(MarketplaceRefSchema).default([]),
    extensions: z.array(ExtensionRecSchema).default([]),
    /** devcontainer / codespaces / copilot-setup-steps. */
    env: EnvironmentDefSchema.default({}),
    devops: DevopsDefSchema.optional(),
    emit: EmitPolicySchema.default({ scopeFallback: "inline" }),
  })
  .superRefine((project, ctx) => {
    // `targets` is a set (data-model.md Root: "global opt-in set").
    checkUnique(project.targets, (t) => t, "targets", "target id", ctx);
    checkUnique(project.instructions, (i) => i.id, "instructions", "instruction id", ctx);
    checkUnique(project.skills, (s) => s.name, "skills", "skill name", ctx);
    checkUnique(project.agents, (a) => a.name, "agents", "agent name", ctx);
    checkUnique(project.commands, (c) => c.name, "commands", "command name", ctx);
    checkUnique(project.mcp, (m) => m.name, "mcp", "MCP server name", ctx);
    checkUnique(project.marketplaces, (m) => m.id, "marketplaces", "marketplace id", ctx);
  });

export type PattersonProject = z.infer<typeof PattersonProjectSchema>;
/** The pre-parse (authoring) shape: defaults may be omitted. */
export type PattersonProjectInput = z.input<typeof PattersonProjectSchema>;
