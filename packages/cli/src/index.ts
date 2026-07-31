#!/usr/bin/env bun
/**
 * patterson CLI entry point — citty tree lazily mapping command-registry
 * entries (contracts/command-registry.md, CLI projection; Constitution III).
 *
 * Each subcommand module registers its descriptor once (via commands/registry)
 * and is projected into citty by the shared frontend. Lazy `subCommands`
 * thunks keep startup cost proportional to the invoked command.
 */
import { defineCommand, runMain } from "citty";

export { buildRegistry } from "./commands/registry.ts";

const main = defineCommand({
  meta: {
    name: "patterson",
    version: "0.0.1",
    description: "Manage agent/editor configuration from one canonical project IR",
  },
  subCommands: {
    create: async () => {
      const [{ createCommand }, { cittyCommandFor }] = await Promise.all([
        import("./commands/create.ts"),
        import("./commands/frontend.ts"),
      ]);
      return cittyCommandFor(createCommand, {
        positionals: ["dir"],
        aliases: { yes: "y", force: "f" },
      });
    },
    init: async () => {
      const [{ initCommand }, { cittyCommandFor }] = await Promise.all([
        import("./commands/init.ts"),
        import("./commands/frontend.ts"),
      ]);
      return cittyCommandFor(initCommand);
    },
    sync: async () => {
      const [{ syncCommand }, { cittyCommandFor }] = await Promise.all([
        import("./commands/sync.ts"),
        import("./commands/frontend.ts"),
      ]);
      return cittyCommandFor(syncCommand);
    },
    doctor: async () => {
      const [{ doctorCommand }, { cittyCommandFor }] = await Promise.all([
        import("./commands/doctor.ts"),
        import("./commands/frontend.ts"),
      ]);
      return cittyCommandFor(doctorCommand);
    },
    check: async () => {
      const [{ checkCommand }, { cittyCommandFor }] = await Promise.all([
        import("./commands/check.ts"),
        import("./commands/frontend.ts"),
      ]);
      return cittyCommandFor(checkCommand);
    },
  },
});

if (import.meta.main) {
  await runMain(main);
}

export default main;
