/**
 * Shared IR value types: TargetId, SecretRef (C4), Exec (C1), Scope (C5).
 *
 * Source of truth: specs/001-patterson-cli-v1/data-model.md.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// TargetId
// ---------------------------------------------------------------------------

/**
 * The global target vocabulary. Unknown ids are rejected wherever a TargetId is
 * expected (root `targets` and every entity-level `targets` filter).
 *
 * `codespaces` is compiled by the devcontainer emitter (one emitter, two targets).
 */
export const TargetIdSchema = z.enum([
  "claude-code",
  "copilot",
  "opencode",
  "zed",
  "vscode",
  "devcontainer",
  "codespaces",
  "github-actions",
]);
export type TargetId = z.infer<typeof TargetIdSchema>;

/** Optional per-entity target filter. */
export const TargetsSchema = z.array(TargetIdSchema);

/**
 * Per-target raw escape hatch (e.g. `raw.zed` for Zed's seven model slots).
 * Keys are restricted to known TargetIds; values are emitter-defined.
 */
export const RawOverridesSchema = z.partialRecord(TargetIdSchema, z.unknown());
export type RawOverrides = z.infer<typeof RawOverridesSchema>;

// ---------------------------------------------------------------------------
// SecretRef (C4)
// ---------------------------------------------------------------------------

export const SecretRefSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("env"),
    name: z.string().min(1),
    default: z.string().optional(),
  }),
  z.strictObject({
    kind: z.literal("prompt"),
    id: z.string().min(1),
    description: z.string().min(1),
    password: z.boolean().optional(),
  }),
  z.strictObject({
    kind: z.literal("pick"),
    id: z.string().min(1),
    options: z.array(z.string().min(1)).min(1),
  }),
  z.strictObject({
    kind: z.literal("command"),
    id: z.string().min(1),
    command: z.string().min(1),
    args: z.array(z.string()).optional(),
  }),
  z.strictObject({
    kind: z.literal("helper"),
    command: z.string().min(1),
  }),
]);
export type SecretRef = z.infer<typeof SecretRefSchema>;

/**
 * C4: interpolated secret strings are forbidden anywhere in the IR.
 * A plain string value may not smuggle an interpolation — `${...}` (which also
 * covers `${input:...}` and `${env:...}`) or `{env:...}`. Secrets must be
 * expressed as SecretRef nodes so each emitter can render its native syntax or
 * raise a reported reachability error.
 *
 * The ban applies to every string that can reach a secret-capable config slot:
 * Exec argv/cwd/env values, remote-transport headers, and git-hook argv. Prose
 * surfaces (InstructionBlock.body, SkillDef.body, AgentDef.prompt,
 * CommandDef.template) are content, not config values, and are exempt.
 */
const FORBIDDEN_INTERPOLATION_PATTERNS = ["${", "{env:"] as const;

const INTERPOLATION_ERROR =
  'Interpolated secret strings ("${...}", "${input:...}", "{env:...}") are forbidden in the IR. ' +
  'Use a SecretRef node instead, e.g. { "kind": "env", "name": "MY_SECRET" }.';

export const InterpolationSafeStringSchema = z.string().refine(
  (s) => !FORBIDDEN_INTERPOLATION_PATTERNS.some((p) => s.includes(p)),
  { error: INTERPOLATION_ERROR },
);

/** Non-empty variant for argv elements / cwd (C1 + C4). */
export const NonEmptyInterpolationSafeStringSchema = InterpolationSafeStringSchema.min(1);

/** A value that is either a plain (interpolation-free) string or a SecretRef. */
export const EnvValueSchema = z.union([InterpolationSafeStringSchema, SecretRefSchema]);
export type EnvValue = z.infer<typeof EnvValueSchema>;

// ---------------------------------------------------------------------------
// Exec (C1)
// ---------------------------------------------------------------------------

/**
 * An executable invocation. argv is never joined into a shell string:
 * opencode gets argv verbatim, other targets get argv[0] + rest.
 *
 * argv elements and cwd are interpolation-safe (C4): a secret smuggled as
 * `${TOKEN}` inside argv would reach every emitter verbatim, bypassing the
 * SecretRef reachability-error mechanism.
 */
export const ExecSchema = z.strictObject({
  argv: z
    .array(NonEmptyInterpolationSafeStringSchema)
    .min(1, { error: "argv must be a non-empty array (C1: never a shell string)." }),
  cwd: NonEmptyInterpolationSafeStringSchema.optional(),
  env: z.record(z.string(), EnvValueSchema).optional(),
});
export type Exec = z.infer<typeof ExecSchema>;

// ---------------------------------------------------------------------------
// Scope (C5)
// ---------------------------------------------------------------------------

/**
 * Path scoping. Emitted as Claude `paths: [...]`, Copilot
 * `applyTo: globs.join(",")`; opencode per `emit.scopeFallback` with a
 * mandatory coverage report.
 */
export const ScopeSchema = z.strictObject({
  globs: z.array(z.string().min(1)).min(1, { error: "scope.globs must list at least one glob." }),
});
export type Scope = z.infer<typeof ScopeSchema>;
