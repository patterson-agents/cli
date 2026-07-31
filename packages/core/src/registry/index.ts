/**
 * Barrel for the command registry (contracts/command-registry.md).
 */
export {
  COMMAND_ID_REGEX,
  createRegistry,
  defineCommand,
  EXIT_CODES,
  exitCodeFor,
} from "./registry.ts";
export type { CommandRegistry, ExitCode } from "./registry.ts";

export { RESOLVING_FLAG } from "./types.ts";
export type {
  AnyCommandDescriptor,
  CommandAnnotations,
  CommandCtx,
  CommandDescriptor,
  CommandIo,
  CommandResult,
  Decision,
  DecisionOption,
  DriftConflict,
  Report,
} from "./types.ts";
