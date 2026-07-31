/**
 * The patterson MCP server (E-P4, US4) — one MCP tool per command-registry
 * descriptor (Constitution III: One Registry, Two Frontends; the CLI is the
 * other projection).
 *
 * Contract (contracts/command-registry.md):
 * - stdio only; stdout is reserved for JSON-RPC, all logging goes to stderr;
 * - deterministic tool order (registry id order);
 * - global non-interactive mode: ctx.nonInteractive is always true, and a
 *   `decision-required` result comes back as a STRUCTURED isError result
 *   naming the resolving flags — the server never prompts;
 * - prompt-free module graph: `assertPromptFree()` fails startup if
 *   @clack/prompts ever slips into the loaded module set.
 *
 * SDK pin: @modelcontextprotocol/sdk@1.30.0 (S1: real Claude Code v2.1.220
 * negotiates protocol 2025-11-25, exactly this SDK's latest).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import type { AnyCommandDescriptor, CommandRegistry, CommandResult } from "@patterson/core";

// ---------------------------------------------------------------------------
// Prompt-free assertion
// ---------------------------------------------------------------------------

/**
 * Startup assertion: no code path in this process may have loaded a prompting
 * library. Scans the CommonJS/ESM module cache for @clack — if present, some
 * import chain violated the prompt-free-core contract; refuse to serve.
 */
export function assertPromptFree(): void {
  const cache = (require as unknown as { cache?: Record<string, unknown> }).cache ?? {};
  const offender = Object.keys(cache).find((path) => path.includes("@clack"));
  if (offender !== undefined) {
    throw new Error(
      `mcp serve startup assertion failed: prompting module loaded (${offender}). ` +
        "The MCP module graph must stay prompt-free (contracts/command-registry.md).",
    );
  }
}

// ---------------------------------------------------------------------------
// Result mapping
// ---------------------------------------------------------------------------

/** JSON payload returned for every tool call (stable machine shape). */
export function payloadFor(result: CommandResult<unknown>): {
  isError: boolean;
  body: Record<string, unknown>;
} {
  switch (result.kind) {
    case "ok":
      return {
        isError: false,
        body: { kind: "ok", value: result.value, ...(result.report ? { report: result.report } : {}) },
      };
    case "conflicts":
      // Non-interactive never clobbers: the conflict list is data, the
      // resolving flag tells the caller how to authorize an overwrite.
      return {
        isError: true,
        body: { kind: "conflicts", conflicts: result.conflicts, resolvingFlag: result.resolvingFlag },
      };
    case "decision-required":
      // The server never prompts; every option names the flag that resolves it.
      return {
        isError: true,
        body: {
          kind: "decision-required",
          decision: result.decision,
          message:
            `Interactive decision "${result.decision.id}" cannot be answered over MCP. ` +
            `Re-call with one of: ${result.decision.options.map((option) => option.flag).join(", ")}.`,
        },
      };
    case "error":
      return {
        isError: true,
        body: {
          kind: "error",
          code: result.code,
          message: result.message,
          ...(result.hint ? { hint: result.hint } : {}),
        },
      };
  }
}

// ---------------------------------------------------------------------------
// Server construction
// ---------------------------------------------------------------------------

/** MCP tool name for a registry id: `skills.add` → `patterson_skills_add`. */
export function toolNameFor(id: string): string {
  return `patterson_${id.replaceAll(".", "_").replaceAll("-", "_")}`;
}

export interface BuildServerOptions {
  /** Project root every command runs against. */
  cwd: string;
  version?: string;
}

/**
 * Build the MCP server from a command registry. Tools are registered in the
 * registry's (id-sorted) order — deterministic across runs by contract.
 */
export function buildPattersonMcpServer(
  registry: CommandRegistry,
  options: BuildServerOptions,
): McpServer {
  const server = new McpServer({ name: "patterson", version: options.version ?? "0.0.1" });

  for (const descriptor of registry.list() as AnyCommandDescriptor[]) {
    const schema = descriptor.inputSchema;
    const shape = schema instanceof z.ZodObject ? schema.shape : {};
    server.registerTool(
      toolNameFor(descriptor.id),
      {
        title: descriptor.summary,
        description: `${descriptor.summary} (patterson ${descriptor.path.join(" ")})`,
        inputSchema: shape,
        annotations: {
          readOnlyHint: descriptor.annotations.readOnlyHint,
          destructiveHint: descriptor.annotations.destructiveHint,
        },
      },
      async (args: Record<string, unknown>) => {
        let result: CommandResult<unknown>;
        try {
          result = await descriptor.run(args, {
            cwd: options.cwd,
            nonInteractive: true,
            io: {
              out: (text: string) => console.error(`[patterson] ${text}`),
              err: (text: string) => console.error(`[patterson] ${text}`),
            },
          });
        } catch (cause) {
          result = {
            kind: "error",
            code: "INTERNAL",
            message: cause instanceof Error ? cause.message : String(cause),
          };
        }
        const { isError, body } = payloadFor(result);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(body, null, 2) }],
          ...(isError ? { isError: true } : {}),
        };
      },
    );
  }

  return server;
}

/**
 * Serve over stdio. Logs the negotiated client on initialization (S1
 * diagnostics: version-mismatch reports need the client's protocol claim).
 */
export async function serveStdio(server: McpServer): Promise<void> {
  assertPromptFree();
  const inner = server.server;
  inner.oninitialized = () => {
    const client = inner.getClientVersion();
    console.error(
      `[patterson] MCP client connected: ${client?.name ?? "unknown"}@${client?.version ?? "?"}`,
    );
  };
  console.error("[patterson] mcp serve: stdio transport starting");
  await server.connect(new StdioServerTransport());
  console.error("[patterson] mcp serve: connected");
}
