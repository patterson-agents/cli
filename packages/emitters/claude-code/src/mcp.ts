/**
 * `.mcp.json` emission (MERGE tier — one key path per server under
 * `mcpServers`, whole-value override).
 *
 * - stdio → `{ type: "stdio", command: argv[0], args: argv.slice(1), env }`
 *   (C1: argv is never joined into a shell string).
 * - http/sse/ws remote → `{ type, url, headers }`. `ws` is claude-only but
 *   expressible HERE, so it is emitted (other emitters report it).
 * - SecretRef kind "env" renders as `${NAME}` / `${NAME:-default}` (the
 *   `${CLAUDE_PROJECT_DIR:-.}` form — research.md S2 landmine note). The
 *   prompt/pick/command/helper kinds are inexpressible in `.mcp.json` env →
 *   the server is rejected with a CoverageGap (never partially emitted).
 * - Only `scope: "project"` lands in the project `.mcp.json`; user/local
 *   scopes are gaps (`.claude/settings.local.json` is on the never-write list).
 */
import type {
  CoverageGap,
  EnvValue,
  FileOp,
  KeyPathPatch,
  McpServerDef,
  PattersonProject,
} from "@patterson/core";

import { CLAUDE_TARGET, targetsClaude } from "./common.ts";

export const MCP_JSON_PATH = ".mcp.json";

/** Render an env/header value; SecretRefs other than kind "env" are inexpressible. */
function renderEnvValue(value: EnvValue): { ok: true; rendered: string } | { ok: false; reason: string } {
  if (typeof value === "string") return { ok: true, rendered: value };
  if (value.kind === "env") {
    const rendered =
      value.default === undefined ? `\${${value.name}}` : `\${${value.name}:-${value.default}}`;
    return { ok: true, rendered };
  }
  return {
    ok: false,
    reason: `SecretRef kind "${value.kind}" is inexpressible in .mcp.json (only \${NAME} env expansion is supported); use { kind: "env" } or configure the secret out of band.`,
  };
}

type RenderResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; reason: string };

function renderRecord(
  record: Readonly<Record<string, EnvValue>>,
): { ok: true; rendered: Record<string, string> } | { ok: false; reason: string } {
  const rendered: Record<string, string> = {};
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (value === undefined) continue;
    const result = renderEnvValue(value);
    if (!result.ok) return { ok: false, reason: `${key}: ${result.reason}` };
    rendered[key] = result.rendered;
  }
  return { ok: true, rendered };
}

function renderServer(server: McpServerDef): RenderResult {
  const { transport } = server;
  if (transport.kind === "stdio") {
    const [command, ...args] = transport.exec.argv;
    if (command === undefined) return { ok: false, reason: "argv is empty" }; // unreachable (C1 schema)
    const value: Record<string, unknown> = { type: "stdio", command };
    if (args.length > 0) value.args = args;
    if (transport.exec.cwd !== undefined) {
      return { ok: false, reason: ".mcp.json stdio servers have no cwd field." };
    }
    if (transport.exec.env !== undefined) {
      const env = renderRecord(transport.exec.env);
      if (!env.ok) return env;
      value.env = env.rendered;
    }
    return { ok: true, value };
  }

  const value: Record<string, unknown> = { type: transport.kind, url: transport.url };
  if (transport.headers !== undefined) {
    const headers = renderRecord(transport.headers);
    if (!headers.ok) return headers;
    value.headers = headers.rendered;
  }
  return { ok: true, value };
}

export interface McpOutput {
  op: FileOp | null;
  gaps: CoverageGap[];
}

export function buildMcpOp(ir: PattersonProject): McpOutput {
  const gaps: CoverageGap[] = [];
  const patch: KeyPathPatch[] = [];

  for (const server of ir.mcp) {
    if (!targetsClaude(server)) continue;
    const entityId = `mcp.${server.name}`;

    if (server.scope !== "project") {
      gaps.push({
        entityId,
        targetId: CLAUDE_TARGET,
        reason: `MCP scope "${server.scope}" is not emittable: the project .mcp.json is project-scope only, and .claude/settings.local.json is on the never-write list (Constitution II).`,
        fallbackApplied: false,
      });
      continue;
    }

    const rendered = renderServer(server);
    if (!rendered.ok) {
      gaps.push({ entityId, targetId: CLAUDE_TARGET, reason: rendered.reason, fallbackApplied: false });
      continue;
    }

    if (server.timeoutMs !== undefined) {
      gaps.push({
        entityId: `${entityId}.timeoutMs`,
        targetId: CLAUDE_TARGET,
        reason:
          ".mcp.json has no per-server timeout field (MCP_TIMEOUT is an environment concern); timeoutMs was dropped for this target.",
        fallbackApplied: true,
      });
    }

    patch.push({ keyPath: ["mcpServers", server.name], value: rendered.value });
  }

  if (patch.length === 0) return { op: null, gaps };
  return { op: { path: MCP_JSON_PATH, format: "json", mode: "merge", patch }, gaps };
}
