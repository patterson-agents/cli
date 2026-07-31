/**
 * MCP for the Copilot coding agent (C3): INSTRUCT mode always.
 *
 * The coding agent's MCP configuration lives in the GitHub web UI only
 * (repository Settings → Copilot → Coding agent → "MCP configuration") — there
 * is no repo file surface, so the emitter produces one `instruct`-tier FileOp
 * whose content the core engine renders into SETUP.md: paste-ready JSON plus
 * the COPILOT_MCP_* secret setup steps.
 *
 * Rendering rules (GitHub docs "Extending Copilot coding agent with MCP"):
 * - stdio → `{ "type": "local", "command", "args", "env", "tools" }`;
 *   http/sse → `{ "type": "http"|"sse", "url", "headers", "tools" }`;
 *   `ws` is claude-code-only → CoverageGap.
 * - every server carries `tools[]`. IR `tools` is REQUIRED for this target
 *   (data-model.md §McpServerDef); when absent the blob falls back to `["*"]`
 *   (all tools enabled) with a warning gap — never a silent default.
 * - secrets: the coding agent only reads Copilot-environment secrets named
 *   `COPILOT_MCP_*`. SecretRef kind "env" renders as `COPILOT_MCP_<NAME>`
 *   (env values; headers get `$COPILOT_MCP_<NAME>` interpolation) plus a
 *   rename/creation instruction. prompt/pick/command/helper kinds are
 *   inexpressible → the server is rejected with a gap (never partially).
 */
import type { CoverageGap, EnvValue, FileOp, McpServerDef, PattersonProject } from "@patterson/core";

import { COPILOT_TARGET, targetsCopilot } from "./common.ts";

/**
 * Pseudo-path for the instruct op: never written to disk (instruct tier), it
 * names the SETUP.md section for the web-UI-only coding-agent MCP settings.
 */
export const CODING_AGENT_MCP_PATH = "copilot-coding-agent/mcp-configuration";

interface SecretUse {
  /** Copilot-environment secret name (COPILOT_MCP_*). */
  secretName: string;
  /** The source env var name the value comes from. */
  sourceName: string;
}

interface RenderedServer {
  value: Record<string, unknown>;
  secrets: SecretUse[];
}

type RenderResult = { ok: true; server: RenderedServer } | { ok: false; reason: string };

function copilotSecretName(envName: string): string {
  return `COPILOT_MCP_${envName}`;
}

function renderValues(
  record: Readonly<Record<string, EnvValue>>,
  renderSecret: (secretName: string) => string,
  secrets: SecretUse[],
): { ok: true; rendered: Record<string, string> } | { ok: false; reason: string } {
  const rendered: Record<string, string> = {};
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (value === undefined) continue;
    if (typeof value === "string") {
      rendered[key] = value;
      continue;
    }
    if (value.kind === "env") {
      const secretName = copilotSecretName(value.name);
      secrets.push({ secretName, sourceName: value.name });
      rendered[key] = renderSecret(secretName);
      continue;
    }
    return {
      ok: false,
      reason:
        `${key}: SecretRef kind "${value.kind}" is inexpressible in the Copilot coding agent MCP configuration ` +
        "(only COPILOT_MCP_* environment secrets are supported); use { kind: \"env\" } or configure the secret out of band.",
    };
  }
  return { ok: true, rendered };
}

function renderServer(server: McpServerDef, tools: readonly string[]): RenderResult {
  const secrets: SecretUse[] = [];
  const { transport } = server;

  if (transport.kind === "ws") {
    return { ok: false, reason: 'MCP transport "ws" is reachable only on claude-code; the Copilot coding agent supports local (stdio), http, and sse servers.' };
  }

  if (transport.kind === "stdio") {
    const [command, ...args] = transport.exec.argv;
    if (command === undefined) return { ok: false, reason: "argv is empty" }; // unreachable (C1 schema)
    if (transport.exec.cwd !== undefined) {
      return { ok: false, reason: "Copilot coding agent local MCP servers have no cwd field." };
    }
    const value: Record<string, unknown> = { type: "local", command };
    if (args.length > 0) value.args = args;
    if (transport.exec.env !== undefined) {
      // env values reference secrets by bare name: "KEY": "COPILOT_MCP_KEY".
      const env = renderValues(transport.exec.env, (name) => name, secrets);
      if (!env.ok) return env;
      value.env = env.rendered;
    }
    value.tools = [...tools];
    return { ok: true, server: { value, secrets } };
  }

  const value: Record<string, unknown> = { type: transport.kind, url: transport.url };
  if (transport.headers !== undefined) {
    // header values interpolate secrets: "Authorization": "$COPILOT_MCP_TOKEN".
    const headers = renderValues(transport.headers, (name) => `$${name}`, secrets);
    if (!headers.ok) return headers;
    value.headers = headers.rendered;
  }
  value.tools = [...tools];
  return { ok: true, server: { value, secrets } };
}

export interface McpOutput {
  op: FileOp | null;
  gaps: CoverageGap[];
}

export function buildCodingAgentMcpOp(ir: PattersonProject): McpOutput {
  const gaps: CoverageGap[] = [];
  const servers: Record<string, unknown> = {};
  const secrets: SecretUse[] = [];

  for (const server of ir.mcp) {
    if (!targetsCopilot(server)) continue;
    const entityId = `mcp.${server.name}`;

    if (server.scope !== "project") {
      gaps.push({
        entityId,
        targetId: COPILOT_TARGET,
        reason: `MCP scope "${server.scope}" is not emittable: the Copilot coding agent MCP configuration is repository-scoped only.`,
        fallbackApplied: false,
      });
      continue;
    }

    let tools = server.tools;
    if (tools === undefined || tools.length === 0) {
      // C3: tools[] is required when the coding agent is targeted.
      gaps.push({
        entityId: `${entityId}.tools`,
        targetId: COPILOT_TARGET,
        reason:
          "The Copilot coding agent requires an explicit per-server tools[] allowlist; none was declared, " +
          'so the configuration falls back to ["*"] (ALL tools enabled) — review before pasting.',
        fallbackApplied: true,
      });
      tools = ["*"];
    }

    const rendered = renderServer(server, tools);
    if (!rendered.ok) {
      gaps.push({ entityId, targetId: COPILOT_TARGET, reason: rendered.reason, fallbackApplied: false });
      continue;
    }

    if (server.timeoutMs !== undefined) {
      gaps.push({
        entityId: `${entityId}.timeoutMs`,
        targetId: COPILOT_TARGET,
        reason: "The Copilot coding agent MCP configuration has no per-server timeout field; timeoutMs was dropped for this target.",
        fallbackApplied: true,
      });
    }

    servers[server.name] = rendered.server.value;
    secrets.push(...rendered.server.secrets);
  }

  if (Object.keys(servers).length === 0) return { op: null, gaps };

  const blob = JSON.stringify({ mcpServers: servers }, null, 2);
  const lines = [
    "The Copilot coding agent reads its MCP configuration from the GitHub web UI",
    "only — patterson cannot write it as a file. Apply it by hand:",
    "",
    "1. Open the repository on github.com → **Settings** → **Copilot** →",
    "   **Coding agent**.",
    "2. Paste the JSON below into the **MCP configuration** box and save:",
    "",
    "```json",
    blob,
    "```",
  ];

  if (secrets.length > 0) {
    const unique = new Map<string, SecretUse>();
    for (const use of secrets) unique.set(use.secretName, use);
    lines.push(
      "",
      "3. The configuration references Copilot environment secrets. In",
      "   **Settings** → **Environments** → **copilot**, add each secret (the",
      "   coding agent only exposes secrets whose names start with",
      "   `COPILOT_MCP_`):",
      "",
      ...[...unique.values()]
        .toSorted((a, b) => a.secretName.localeCompare(b.secretName))
        .map((use) => `   - \`${use.secretName}\` ← value of \`${use.sourceName}\``),
    );
  }
  lines.push("");

  return {
    op: { path: CODING_AGENT_MCP_PATH, format: "markdown", mode: "instruct", content: lines.join("\n") },
    gaps,
  };
}
