// S1 spike: minimal MCP stdio server on @modelcontextprotocol/sdk@1.30.0.
// Throwaway evidence-gathering code — NOT the production mcp entry point.
// Contract check (contracts/command-registry.md): stdio only, all logging on
// stderr, stdout reserved for JSON-RPC.
//
// zod note: zod@4.4.3 is only installed in packages/core; this spike resolves
// it through spike/node_modules/zod -> <repo>/node_modules/.bun/zod@4.4.3/...,
// the same physical module instance the SDK itself resolves (bun isolated
// store), so ZodType instanceof checks inside the SDK hold.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "patterson-spike",
  version: "0.0.1",
});

server.registerTool(
  "patterson_spike_add",
  {
    title: "Add two numbers",
    description: "Dummy spike tool: adds two numbers and returns the sum.",
    inputSchema: {
      a: z.number().describe("First addend"),
      b: z.number().describe("Second addend"),
    },
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }],
  }),
);

server.registerTool(
  "patterson_spike_echo",
  {
    title: "Echo a message",
    description: "Dummy spike tool: echoes a message, optionally uppercased.",
    inputSchema: {
      message: z.string().min(1).describe("Message to echo back"),
      upper: z.boolean().optional().describe("Uppercase the message"),
    },
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async ({ message, upper }) => ({
    content: [{ type: "text", text: upper ? message.toUpperCase() : message }],
  }),
);

console.error("[patterson-spike] starting stdio transport");
await server.connect(new StdioServerTransport());
console.error("[patterson-spike] connected");
