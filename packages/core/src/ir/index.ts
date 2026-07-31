/**
 * Barrel for the canonical IR (specs/001-patterson-cli-v1/data-model.md).
 */
export {
  EnvValueSchema,
  ExecSchema,
  InterpolationSafeStringSchema,
  NonEmptyInterpolationSafeStringSchema,
  RawOverridesSchema,
  ScopeSchema,
  SecretRefSchema,
  TargetIdSchema,
  TargetsSchema,
} from "./values.ts";
export type { EnvValue, Exec, RawOverrides, Scope, SecretRef, TargetId } from "./values.ts";

export {
  AGENT_NAME_REGEX,
  AgentDefSchema,
  AgentHookDefSchema,
  CommandDefSchema,
  DevopsDefSchema,
  EmitPolicySchema,
  EnvironmentDefSchema,
  ExtensionRecSchema,
  GitHookDefSchema,
  HooksSchema,
  InstructionBlockSchema,
  LifecycleValueSchema,
  MarketplacePinSchema,
  MarketplaceRefSchema,
  McpServerDefSchema,
  McpTransportSchema,
  ModelDefSchema,
  PolicyDefSchema,
  RESERVED_MCP_SERVER_NAMES,
  SKILL_NAME_REGEX,
  SkillDefSchema,
} from "./entities.ts";
export type {
  AgentDef,
  AgentHookDef,
  CommandDef,
  DevopsDef,
  EmitPolicy,
  EnvironmentDef,
  ExtensionRec,
  GitHookDef,
  Hooks,
  InstructionBlock,
  LifecycleValue,
  MarketplacePin,
  MarketplaceRef,
  McpServerDef,
  McpTransport,
  ModelDef,
  PolicyDef,
  SkillDef,
} from "./entities.ts";

export { PattersonProjectSchema } from "./project.ts";
export type { PattersonProject, PattersonProjectInput } from "./project.ts";
