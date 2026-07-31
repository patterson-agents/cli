#!/usr/bin/env bun
/**
 * @patterson/mcp — stdio MCP server over the patterson command registry
 * (Constitution III; contracts/command-registry.md, MCP projection).
 *
 * Run directly (`bun run packages/mcp/src/index.ts`) or via
 * `patterson mcp serve`. The project root is the process cwd.
 */
export {
  assertPromptFree,
  buildPattersonMcpServer,
  payloadFor,
  serveStdio,
  toolNameFor,
} from "./server.ts";

if (import.meta.main) {
  const { buildRegistry } = await import("@patterson/cli");
  const { buildPattersonMcpServer, serveStdio } = await import("./server.ts");
  const server = buildPattersonMcpServer(buildRegistry(), { cwd: process.cwd() });
  await serveStdio(server);
}
