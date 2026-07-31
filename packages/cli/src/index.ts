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
      const [{ createCommand }, { cittyArgsFor }, { runCreateCli }] = await Promise.all([
        import("./commands/create.ts"),
        import("./commands/frontend.ts"),
        import("./commands/create-entry.ts"),
      ]);
      return defineCommand({
        meta: { name: "create", description: createCommand.summary },
        args: {
          ...cittyArgsFor(createCommand, { positionals: ["dir"], aliases: { yes: "y", force: "f" } }),
          resume: {
            type: "boolean",
            description: "Resume a saved wizard session (.patterson/wizard.json)",
          },
        },
        async run({ args }) {
          await runCreateCli(args as unknown as Record<string, unknown>);
        },
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
    tutor: async () => {
      const [{ tutorListCommand, tutorStatusCommand, tutorNextCommand }, { cittyCommandFor }] =
        await Promise.all([import("./commands/tutor.ts"), import("./commands/frontend.ts")]);
      return defineCommand({
        meta: { name: "tutor", description: "AI-fluency tutor: guided, locally-validated lessons" },
        subCommands: {
          list: cittyCommandFor(tutorListCommand),
          status: cittyCommandFor(tutorStatusCommand),
          next: cittyCommandFor(tutorNextCommand, { positionals: ["track"] }),
        },
      });
    },
    new: async () => {
      const [{ newCommands }, { cittyCommandFor }] = await Promise.all([
        import("./commands/new.ts"),
        import("./commands/frontend.ts"),
      ]);
      const subCommands: Record<string, ReturnType<typeof cittyCommandFor>> = {};
      for (const command of newCommands) {
        const kind = command.path[1] as string;
        subCommands[kind] = cittyCommandFor(command, { positionals: ["name"] });
      }
      return defineCommand({
        meta: { name: "new", description: "Generate skills, MCP servers, plugins, marketplaces, commands" },
        subCommands,
      });
    },
    skills: async () => {
      const [{ skillsListCommand, skillsAddCommand, skillsRemoveCommand }, { cittyCommandFor }] =
        await Promise.all([import("./commands/skills.ts"), import("./commands/frontend.ts")]);
      return defineCommand({
        meta: { name: "skills", description: "Install and inventory agent skills (pinned skills CLI)" },
        subCommands: {
          list: cittyCommandFor(skillsListCommand),
          add: cittyCommandFor(skillsAddCommand, { positionals: ["ref"] }),
          remove: cittyCommandFor(skillsRemoveCommand, { positionals: ["name"] }),
        },
      });
    },
    plugins: async () => {
      const [{ marketplaceListCommand }, { cittyCommandFor }] = await Promise.all([
        import("./commands/plugins.ts"),
        import("./commands/frontend.ts"),
      ]);
      return defineCommand({
        meta: { name: "plugins", description: "Plugin marketplaces" },
        subCommands: {
          marketplace: defineCommand({
            meta: { name: "marketplace", description: "Marketplace registry" },
            subCommands: { list: cittyCommandFor(marketplaceListCommand) },
          }),
        },
      });
    },
    mcp: async () => {
      return defineCommand({
        meta: { name: "mcp", description: "Model Context Protocol surface" },
        subCommands: {
          serve: defineCommand({
            meta: {
              name: "serve",
              description: "Serve the patterson command registry as a stdio MCP server",
            },
            async run() {
              // Lazy import: the MCP SDK enters the process only on this path.
              const mcp = await import("@patterson/mcp");
              const { buildRegistry } = await import("./commands/registry.ts");
              const server = mcp.buildPattersonMcpServer(buildRegistry(), {
                cwd: process.cwd(),
              });
              await mcp.serveStdio(server);
              // Serve until the client closes stdio (transport close).
              await new Promise<void>((resolve) => {
                // oxlint-disable-next-line prefer-add-event-listener -- SDK Server uses property-assignment callbacks, not EventTarget
                server.server.onclose = () => resolve();
              });
            },
          }),
        },
      });
    },
    design: async () => {
      const [{ designTemplatesCommand, designTokensCommand, designRefreshCommand }, { cittyCommandFor }] =
        await Promise.all([import("./commands/design.ts"), import("./commands/frontend.ts")]);
      return defineCommand({
        meta: { name: "design", description: "Vendored design-system templates and tokens" },
        subCommands: {
          templates: cittyCommandFor(designTemplatesCommand),
          tokens: cittyCommandFor(designTokensCommand),
          refresh: cittyCommandFor(designRefreshCommand),
        },
      });
    },
  },
});

/**
 * Run `patterson create` with the given argv (create-patterson shim entry:
 * `bunx create-patterson …` ≡ `patterson create …`, one implementation for
 * all three distribution doors — plan.md, bun-create semantics).
 */
export async function runCreateFromArgv(argv: string[] = process.argv.slice(2)): Promise<void> {
  await runMain(main, { rawArgs: ["create", ...argv] });
}

if (import.meta.main) {
  await runMain(main);
}

export default main;
