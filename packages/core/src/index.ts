export * from "./ir/index.ts";
export * from "./emit/index.ts";
export * from "./checks/index.ts";
export * from "./plugin.ts";

// Command registry (Constitution III: the CLI and MCP frontends consume this
// surface from the package barrel — no deep relative imports across packages).
//
// Selective re-export, NOT `export *`: `RESOLVING_FLAG` (same literal value)
// and the `DriftConflict` type also exist in ./emit — an ambiguous star export
// would silently drop both names from the barrel. The emit engine's
// `DriftConflict` stays the canonical export; the registry's command-result
// variant is exposed as `CommandDriftConflict`.
export {
  COMMAND_ID_REGEX,
  createRegistry,
  defineCommand,
  EXIT_CODES,
  exitCodeFor,
} from "./registry/index.ts";
export type {
  AnyCommandDescriptor,
  CommandAnnotations,
  CommandCtx,
  CommandDescriptor,
  CommandIo,
  CommandRegistry,
  CommandResult,
  Decision,
  DecisionOption,
  ExitCode,
  Report,
} from "./registry/index.ts";
export type { DriftConflict as CommandDriftConflict } from "./registry/index.ts";
