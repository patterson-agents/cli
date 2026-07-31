/**
 * Command registry wiring — every skeleton command registered once
 * (Constitution III: One Registry, Two Frontends). The CLI (citty) and the
 * future MCP frontend both project from this registry.
 */
import { createRegistry, type CommandRegistry } from "@patterson/core";

import { makeCheckCommand } from "./check.ts";
import { makeCreateCommand } from "./create.ts";
import { designRefreshCommand, designTemplatesCommand, designTokensCommand } from "./design.ts";
import { newCommands } from "./new.ts";
import { marketplaceListCommand } from "./plugins.ts";
import { makeSkillsAddCommand, makeSkillsRemoveCommand, skillsListCommand, defaultSkillsDeps, type SkillsDeps } from "./skills.ts";
import { makeDoctorCommand } from "./doctor.ts";
import { makeInitCommand } from "./init.ts";
import { defaultDeps, type CommandDeps } from "./shared.ts";
import { makeSyncCommand } from "./sync.ts";

/** Build a registry holding all skeleton commands, wired to `deps`. */
export function buildRegistry(
  deps: CommandDeps = defaultDeps,
  skillsDeps: SkillsDeps = defaultSkillsDeps,
): CommandRegistry {
  const registry = createRegistry();
  registry.register(makeCreateCommand(deps));
  registry.register(makeInitCommand(deps));
  registry.register(makeSyncCommand(deps));
  registry.register(makeDoctorCommand(deps));
  registry.register(makeCheckCommand(deps));
  registry.register(designTemplatesCommand);
  registry.register(designTokensCommand);
  registry.register(designRefreshCommand);
  registry.register(skillsListCommand);
  registry.register(makeSkillsAddCommand(skillsDeps));
  registry.register(makeSkillsRemoveCommand(skillsDeps));
  registry.register(marketplaceListCommand);
  for (const command of newCommands) registry.register(command);
  return registry;
}
