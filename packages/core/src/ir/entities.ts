/**
 * IR entities per specs/001-patterson-cli-v1/data-model.md.
 * Every entity is a zod v4 schema with an inferred TS type.
 *
 * All entity objects are STRICT: an unrecognized key is a validation error, not
 * silently-stripped content. For a user-authored config a field-name typo
 * (`skils`, `alowedTools`) must fail loudly — silently dropping the section
 * would violate the spirit of Constitution II (never lose user edits).
 */
import { z } from "zod";

import {
  EnvValueSchema,
  ExecSchema,
  NonEmptyInterpolationSafeStringSchema,
  RawOverridesSchema,
  ScopeSchema,
  SecretRefSchema,
  TargetsSchema,
} from "./values.ts";

// ---------------------------------------------------------------------------
// InstructionBlock
// ---------------------------------------------------------------------------

/**
 * Cross-field invariant: `scope` and `reach` must agree. A path-scoped block
 * without globs gives emitters nothing to emit (C5 needs `paths`/`applyTo`
 * values); a scope on a universal block would be silently ignored — both are
 * author mistakes surfaced at parse time.
 */
export const InstructionBlockSchema = z
  .strictObject({
    id: z.string().min(1),
    /** Markdown body. */
    body: z.string(),
    scope: ScopeSchema.optional(),
    reach: z.enum(["universal", "path-scoped"]),
    targets: TargetsSchema.optional(),
    raw: RawOverridesSchema.optional(),
  })
  .superRefine((block, ctx) => {
    if (block.reach === "path-scoped" && block.scope === undefined) {
      ctx.addIssue({
        code: "custom",
        message: 'InstructionBlock with reach "path-scoped" requires a scope ({ globs: [...] }) — C5.',
        path: ["scope"],
      });
    }
    if (block.reach === "universal" && block.scope !== undefined) {
      ctx.addIssue({
        code: "custom",
        message:
          'InstructionBlock with reach "universal" must not carry a scope — use reach "path-scoped" to apply globs.',
        path: ["scope"],
      });
    }
  });
export type InstructionBlock = z.infer<typeof InstructionBlockSchema>;

// ---------------------------------------------------------------------------
// SkillDef (C6, C9)
// ---------------------------------------------------------------------------

/** Lowercase alphanumerics with single-hyphen separators; no leading/trailing hyphen. */
export const SKILL_NAME_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

const skillNameSchema = z
  .string()
  .max(64, { error: "Skill names must be at most 64 characters." })
  .regex(SKILL_NAME_REGEX, {
    error:
      "Skill names must match ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$ (lowercase, digits, single hyphens).",
  })
  .refine((name) => !name.includes("--"), {
    error: "Skill names must not contain consecutive hyphens.",
  });

/**
 * A skill `files` entry must stay inside the skill directory: relative,
 * forward-slash, no `.`/`..` segments, no backslashes, not absolute. Emitters
 * concatenate these into snapshot and FileOp paths, so a traversal entry
 * (`../../../secret`) would read or write outside the skill tree.
 */
export function isSafeRelativeFilePath(value: string): boolean {
  if (value.length === 0 || value.startsWith("/") || value.includes("\\")) return false;
  return value.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

const skillFileSchema = z
  .string()
  .min(1)
  .refine(isSafeRelativeFilePath, {
    error:
      'Skill file entries must be relative paths inside the skill directory (no leading "/", no "\\\\", no "." or ".." segments).',
  });

/**
 * Note: the `dir name == name` rule (C6) is not representable in the schema —
 * it needs filesystem context, so it is enforced at emit time and by
 * `new skill` validation.
 */
export const SkillDefSchema = z.strictObject({
  name: skillNameSchema,
  description: z
    .string()
    .min(1)
    .max(1024, { error: "Skill descriptions must be at most 1024 characters." }),
  body: z.string(),
  files: z.array(skillFileSchema).optional(),
  allowedTools: z.array(z.string().min(1)).optional(),
  linkMode: z.enum(["symlink", "copy"]),
  targets: TargetsSchema.optional(),
  raw: RawOverridesSchema.optional(),
});
export type SkillDef = z.infer<typeof SkillDefSchema>;

// ---------------------------------------------------------------------------
// AgentDef
// ---------------------------------------------------------------------------

/** Root rule: agent names are unique, lowercase-hyphen. */
export const AGENT_NAME_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export const AgentDefSchema = z.strictObject({
  name: z.string().min(1).regex(AGENT_NAME_REGEX, {
    error: "Agent names must be lowercase-hyphen (e.g. \"code-reviewer\").",
  }),
  description: z.string().min(1),
  prompt: z.string(),
  tools: z.array(z.string().min(1)).optional(),
  model: z.string().min(1).optional(),
  targets: TargetsSchema.optional(),
  raw: RawOverridesSchema.optional(),
});
export type AgentDef = z.infer<typeof AgentDefSchema>;

// ---------------------------------------------------------------------------
// CommandDef
// ---------------------------------------------------------------------------

export const CommandDefSchema = z.strictObject({
  name: z.string().min(1),
  description: z.string().optional(),
  /** Required everywhere in the IR; opencode additionally requires it on disk. */
  template: z.string(),
  /** Named arguments referenced by the template. */
  args: z.array(z.string().min(1)).optional(),
  targets: TargetsSchema.optional(),
  raw: RawOverridesSchema.optional(),
});
export type CommandDef = z.infer<typeof CommandDefSchema>;

// ---------------------------------------------------------------------------
// McpServerDef (C1–C3)
// ---------------------------------------------------------------------------

/**
 * Names that collide with built-in/system MCP servers on at least one target.
 * Compared case-insensitively.
 */
export const RESERVED_MCP_SERVER_NAMES = [
  "workspace",
  "claude-in-chrome",
  "computer-use",
  "Claude Preview",
  "Claude Browser",
] as const;

const reservedLower = new Set(RESERVED_MCP_SERVER_NAMES.map((n) => n.toLowerCase()));

const remoteTransport = <K extends "http" | "sse" | "ws">(kind: K) =>
  z.strictObject({
    kind: z.literal(kind),
    url: z.url(),
    /** Header values may not contain interpolated secrets (C4). */
    headers: z.record(z.string(), EnvValueSchema).optional(),
    oauth: z.record(z.string(), z.unknown()).optional(),
  });

export const McpTransportSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("stdio"), exec: ExecSchema }),
  remoteTransport("http"),
  remoteTransport("sse"),
  // `ws` is reachable only on claude-code — reported elsewhere (emitter concern).
  remoteTransport("ws"),
]);
export type McpTransport = z.infer<typeof McpTransportSchema>;

export const McpServerDefSchema = z.strictObject({
  name: z
    .string()
    .min(1)
    .refine((name) => !reservedLower.has(name.toLowerCase()), {
      error: `MCP server name is reserved. Reserved names: ${RESERVED_MCP_SERVER_NAMES.join(", ")}.`,
    }),
  transport: McpTransportSchema,
  /** Required when the copilot coding agent is targeted — checked at emit (C3). */
  tools: z.array(z.string().min(1)).optional(),
  timeoutMs: z.number().int().positive().optional(),
  scope: z.enum(["project", "user", "local"]),
  targets: TargetsSchema.optional(),
  raw: RawOverridesSchema.optional(),
});
export type McpServerDef = z.infer<typeof McpServerDefSchema>;

// ---------------------------------------------------------------------------
// PolicyDef
// ---------------------------------------------------------------------------

export const PolicyDefSchema = z.strictObject({
  allow: z.array(z.string()).default([]),
  deny: z.array(z.string()).default([]),
  ask: z.array(z.string()).default([]),
  additionalDirectories: z.array(z.string().min(1)).optional(),
  defaultMode: z.string().min(1).optional(),
  /** opencode-native raw permission object escape hatch. */
  opencode: z.record(z.string(), z.unknown()).optional(),
});
export type PolicyDef = z.infer<typeof PolicyDefSchema>;

// ---------------------------------------------------------------------------
// ModelDef
// ---------------------------------------------------------------------------

/**
 * Whole-value override semantics on Claude (`model`, `fallbackModel`);
 * Zed's seven slots are reachable only via `raw.zed`.
 */
export const ModelDefSchema = z.strictObject({
  default: z.string().min(1).optional(),
  fallback: z.string().min(1).optional(),
  perAgent: z.record(z.string(), z.string().min(1)).optional(),
  raw: RawOverridesSchema.optional(),
});
export type ModelDef = z.infer<typeof ModelDefSchema>;

// ---------------------------------------------------------------------------
// AgentHookDef / GitHookDef — never unified into one concept
// ---------------------------------------------------------------------------

export const AgentHookDefSchema = z.strictObject({
  event: z.string().min(1),
  matcher: z.string().optional(),
  exec: ExecSchema,
  targets: TargetsSchema.optional(),
});
export type AgentHookDef = z.infer<typeof AgentHookDefSchema>;

export const GitHookDefSchema = z.strictObject({
  stage: z.string().min(1),
  /** Interpolation-safe like Exec.argv (C4). */
  argv: z
    .array(NonEmptyInterpolationSafeStringSchema)
    .min(1, { error: "argv must be a non-empty array (C1: never a shell string)." }),
});
export type GitHookDef = z.infer<typeof GitHookDefSchema>;

export const HooksSchema = z.strictObject({
  agentHooks: z.array(AgentHookDefSchema).default([]),
  gitHooks: z.array(GitHookDefSchema).default([]),
});
export type Hooks = z.infer<typeof HooksSchema>;

// ---------------------------------------------------------------------------
// MarketplaceRef
// ---------------------------------------------------------------------------

export const MarketplacePinSchema = z.union([
  z.strictObject({ sha: z.string().min(1) }),
  z.strictObject({ tag: z.string().min(1) }),
]);
export type MarketplacePin = z.infer<typeof MarketplacePinSchema>;

export const MarketplaceRefSchema = z.strictObject({
  id: z.string().min(1),
  kind: z.enum(["claude", "copilot"]),
  source: z.string().min(1),
  pin: MarketplacePinSchema.optional(),
  plugins: z.array(z.string().min(1)).optional(),
});
export type MarketplaceRef = z.infer<typeof MarketplaceRefSchema>;

// ---------------------------------------------------------------------------
// ExtensionRec
// ---------------------------------------------------------------------------

export const ExtensionRecSchema = z.strictObject({
  id: z.string().min(1),
  targets: TargetsSchema.optional(),
});
export type ExtensionRec = z.infer<typeof ExtensionRecSchema>;

// ---------------------------------------------------------------------------
// EnvironmentDef (C10, C15)
// ---------------------------------------------------------------------------

/**
 * C10: lifecycle values keep their author-provided type — string = shell,
 * array = exec, object = parallel. Normalization is forbidden.
 */
export const LifecycleValueSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.record(z.string(), z.union([z.string(), z.array(z.string())])),
]);
export type LifecycleValue = z.infer<typeof LifecycleValueSchema>;

export const EnvironmentDefSchema = z
  .strictObject({
    image: z.string().min(1).optional(),
    dockerfile: z.string().min(1).optional(),
    /** Community features require explicit confirmation (prefer Dockerfile RUN). */
    features: z
      .array(
        z.strictObject({
          id: z.string().min(1),
          options: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .optional(),
    lifecycle: z
      .strictObject({
        onCreate: LifecycleValueSchema.optional(),
        /** Prebuild note: only `updateContent` runs at prebuild. */
        updateContent: LifecycleValueSchema.optional(),
        postCreate: LifecycleValueSchema.optional(),
        postStart: LifecycleValueSchema.optional(),
      })
      .optional(),
    ports: z.array(z.number().int().min(1).max(65535)).optional(),
    /** C15: secrets are prompt-only SecretRefs — never assumed populated. */
    secrets: z.array(SecretRefSchema).optional(),
    hostRequirements: z.record(z.string(), z.unknown()).optional(),
    copilotSetupSteps: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((env) => !(env.image !== undefined && env.dockerfile !== undefined), {
    error: "EnvironmentDef: `image` and `dockerfile` are mutually exclusive — set only one.",
  });
export type EnvironmentDef = z.infer<typeof EnvironmentDefSchema>;

// ---------------------------------------------------------------------------
// DevopsDef
// ---------------------------------------------------------------------------

export const DevopsDefSchema = z.strictObject({
  workflows: z.array(z.enum(["ci", "release", "security"])).default([]),
  /** XOR by construction: exactly one linter. */
  lint: z.enum(["oxlint", "biome"]),
  commit: z
    .strictObject({
      conventional: z.boolean(),
      lefthook: z.boolean(),
    })
    .optional(),
  release: z
    .strictObject({
      /** C13: provenance requires the Node-24 `npm publish --provenance` step. */
      provenance: z.boolean(),
      monorepo: z.literal("experimental").optional(),
    })
    .optional(),
  depUpdates: z.enum(["renovate", "dependabot-actions-only"]).optional(),
});
export type DevopsDef = z.infer<typeof DevopsDefSchema>;

// ---------------------------------------------------------------------------
// EmitPolicy
// ---------------------------------------------------------------------------

export const EmitPolicySchema = z.strictObject({
  /** How opencode handles path-scoped content it cannot express (C5). */
  scopeFallback: z.enum(["inline", "drop", "error"]).default("inline"),
});
export type EmitPolicy = z.infer<typeof EmitPolicySchema>;
