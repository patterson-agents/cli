/**
 * Command registry wiring — every skeleton command registered once
 * (Constitution III: One Registry, Two Frontends). The CLI (citty) and the
 * future MCP frontend both project from this registry.
 */
import { createRegistry, type CommandRegistry } from "@patterson/core";

import { makeCheckCommand } from "./check.ts";
import { makeCreateCommand } from "./create.ts";
import { designRefreshCommand, designTemplatesCommand, designTokensCommand } from "./design.ts";
import { makeDoctorCommand } from "./doctor.ts";
import { makeInitCommand } from "./init.ts";
import { defaultDeps, type CommandDeps } from "./shared.ts";
import { makeSyncCommand } from "./sync.ts";

/** Build a registry holding all skeleton commands, wired to `deps`. */
export function buildRegistry(deps: CommandDeps = defaultDeps): CommandRegistry {
  const registry = createRegistry();
  registry.register(makeCreateCommand(deps));
  registry.register(makeInitCommand(deps));
  registry.register(makeSyncCommand(deps));
  registry.register(makeDoctorCommand(deps));
  registry.register(makeCheckCommand(deps));
  registry.register(designTemplatesCommand);
  registry.register(designTokensCommand);
  registry.register(designRefreshCommand);
  return registry;
}
