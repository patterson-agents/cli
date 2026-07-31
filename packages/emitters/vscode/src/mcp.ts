/**
 * `.vscode/mcp.json` emission (MERGE tier — one key path per server under the
 * top-level `servers` object, whole-value override, plus a synthesized
 * `inputs` array for SecretRefs).
 *
 * Primary source (Constitution V):
 * https://code.visualstudio.com/docs/copilot/customization/mcp-servers and the
 * schema reference it links,
 * https://code.visualstudio.com/docs/agents/reference/mcp-configuration:
 *
 * - The top-level key is `servers`, NOT `mcpServers` (claude-code's spelling).
 * - stdio server: `{ type: "stdio", command, args?, cwd?, env? }` (cwd IS a
 *   documented field here, unlike claude's `.mcp.json`).
 * - remote server: `{ type: "http" | "sse", url, headers?, oauth? }`. There is
 *   no `ws` type — `ws` transports are CoverageGaps.
 * - `inputs[]` entries: `{ type: "promptString", id, description, password?,
 *   default? }` and `{ type: "pickString", id, description, options, default? }`.
 *   Values reference them as `${input:<id>}`.
 *
 * SecretRef rendering decision (documented per T033):
 * `${env:NAME}` is NOT documented as valid inside mcp.json — the MCP
 * configuration reference lists only `${input:variable-id}`,
 * `${workspaceFolder}` and `${userHome}` as usable variables, and the docs
 * steer sensitive values to input variables or `envFile`
 * (https://code.visualstudio.com/docs/agents/reference/mcp-configuration).
 * Therefore a `{ kind: "env" }` SecretRef renders as `${input:<NAME>}` backed
 * by a synthesized promptString input whose description names the environment
 * variable (password-masked — it is a SecretRef; a plain non-secret value
 * would be a string in the IR). The SecretRef `default` carries through as the
 * input's `default`.
 *
 * Other kinds: `prompt` → promptString, `pick` → pickString (VS Code requires
 * a description, which SecretRef pick lacks — one is synthesized
 * deterministically). `command` is a CoverageGap: VS Code's command-type input
 * runs a VS Code *command ID*, not a shell command, so mapping the IR's
 * shell-exec command kind onto it would execute garbage. `helper` (a
 * credential-helper process) has no mcp.json counterpart — CoverageGap.
 *
 * Scope: only `scope: "project"` lands in `.vscode/mcp.json`; user/local
 * scopes live in the user profile, which patterson never writes.
 */
import type {
  CoverageGap,
  EnvValue,
  FileOp,
  KeyPathPatch,
  McpServerDef,
  PattersonProject,
} from "@patterson/core";
import { readValueAt, stableStringify, type FsSnapshot } from "@patterson/core";

import { INPUT_ID_RE, overrideByIdentity, targetsVscode, VSCODE_TARGET } from "./common.ts";

export const MCP_JSON_PATH = ".vscode/mcp.json";

/** A synthesized `inputs[]` entry (documented shapes only). */
export type McpInput =
  | {
      type: "promptString";
      id: string;
      description: string;
      password?: boolean;
      default?: string;
    }
  | { type: "pickString"; id: string; description: string; options: string[] };

type EnvRender =
  | { ok: true; rendered: string; inputs: McpInput[] }
  | { ok: false; reason: string };

/** Render an env/header value; secret-capable kinds become `${input:<id>}` references. */
function renderEnvValue(value: EnvValue): EnvRender {
  if (typeof value === "string") return { ok: true, rendered: value, inputs: [] };

  switch (value.kind) {
    case "env": {
      if (!INPUT_ID_RE.test(value.name)) {
        return {
          ok: false,
          reason: `SecretRef env name ${JSON.stringify(value.name)} is not usable as a \${input:...} id (allowed: ${INPUT_ID_RE.source}).`,
        };
      }
      const input: McpInput = {
        type: "promptString",
        id: value.name,
        description: `Value for the ${value.name} environment variable.`,
        password: true,
      };
      if (value.default !== undefined) input.default = value.default;
      return { ok: true, rendered: `\${input:${value.name}}`, inputs: [input] };
    }
    case "prompt": {
      if (!INPUT_ID_RE.test(value.id)) {
        return {
          ok: false,
          reason: `SecretRef prompt id ${JSON.stringify(value.id)} is not usable as a \${input:...} id (allowed: ${INPUT_ID_RE.source}).`,
        };
      }
      const input: McpInput = { type: "promptString", id: value.id, description: value.description };
      if (value.password === true) input.password = true;
      return { ok: true, rendered: `\${input:${value.id}}`, inputs: [input] };
    }
    case "pick": {
      if (!INPUT_ID_RE.test(value.id)) {
        return {
          ok: false,
          reason: `SecretRef pick id ${JSON.stringify(value.id)} is not usable as a \${input:...} id (allowed: ${INPUT_ID_RE.source}).`,
        };
      }
      // VS Code requires `description` on pickString inputs; SecretRef pick
      // has none, so a deterministic one is synthesized.
      return {
        ok: true,
        rendered: `\${input:${value.id}}`,
        inputs: [
          {
            type: "pickString",
            id: value.id,
            description: `Pick a value for "${value.id}".`,
            options: [...value.options],
          },
        ],
      };
    }
    case "command":
      return {
        ok: false,
        reason:
          'SecretRef kind "command" is inexpressible in .vscode/mcp.json: VS Code command-type inputs run a VS Code command ID, not a shell command. Use { kind: "env" }, { kind: "prompt" }, or configure the secret out of band.',
      };
    case "helper":
      return {
        ok: false,
        reason:
          'SecretRef kind "helper" is inexpressible in .vscode/mcp.json (no credential-helper mechanism); use { kind: "env" } or { kind: "prompt" } instead.',
      };
  }
}

type RecordRender =
  | { ok: true; rendered: Record<string, string>; inputs: McpInput[] }
  | { ok: false; reason: string };

function renderRecord(record: Readonly<Record<string, EnvValue>>): RecordRender {
  const rendered: Record<string, string> = {};
  const inputs: McpInput[] = [];
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (value === undefined) continue;
    const result = renderEnvValue(value);
    if (!result.ok) return { ok: false, reason: `${key}: ${result.reason}` };
    rendered[key] = result.rendered;
    inputs.push(...result.inputs);
  }
  return { ok: true, rendered, inputs };
}

type ServerRender =
  | { ok: true; value: Record<string, unknown>; inputs: McpInput[] }
  | { ok: false; reason: string };

function renderServer(server: McpServerDef): ServerRender {
  const { transport } = server;
  if (transport.kind === "stdio") {
    const [command, ...args] = transport.exec.argv;
    if (command === undefined) return { ok: false, reason: "argv is empty" }; // unreachable (C1 schema)
    const value: Record<string, unknown> = { type: "stdio", command };
    if (args.length > 0) value.args = args;
    if (transport.exec.cwd !== undefined) value.cwd = transport.exec.cwd;
    const inputs: McpInput[] = [];
    if (transport.exec.env !== undefined) {
      const env = renderRecord(transport.exec.env);
      if (!env.ok) return env;
      value.env = env.rendered;
      inputs.push(...env.inputs);
    }
    return { ok: true, value, inputs };
  }

  if (transport.kind === "ws") {
    return {
      ok: false,
      reason:
        'Transport "ws" is not supported by VS Code MCP (documented server types: stdio, http, sse — https://code.visualstudio.com/docs/agents/reference/mcp-configuration); ws is reachable only on claude-code.',
    };
  }

  const value: Record<string, unknown> = { type: transport.kind, url: transport.url };
  const inputs: McpInput[] = [];
  if (transport.headers !== undefined) {
    const headers = renderRecord(transport.headers);
    if (!headers.ok) return headers;
    value.headers = headers.rendered;
    inputs.push(...headers.inputs);
  }
  // `oauth` is a documented remote-server field (MCP configuration reference);
  // the IR's author-provided object passes through verbatim.
  if (transport.oauth !== undefined) value.oauth = transport.oauth;
  return { ok: true, value, inputs };
}

export interface McpOutput {
  op: FileOp | null;
  gaps: CoverageGap[];
}

export function buildMcpOp(ir: PattersonProject, snapshot: FsSnapshot): McpOutput {
  const gaps: CoverageGap[] = [];
  const patch: KeyPathPatch[] = [];

  /** File-global input registry: id → entry (stable-stringified for conflict checks). */
  const inputById = new Map<string, McpInput>();
  const inputOrder: McpInput[] = [];

  for (const server of ir.mcp) {
    if (!targetsVscode(server)) continue;
    const entityId = `mcp.${server.name}`;

    if (server.scope !== "project") {
      gaps.push({
        entityId,
        targetId: VSCODE_TARGET,
        reason: `MCP scope "${server.scope}" is not emittable: .vscode/mcp.json is workspace (project) scope; user/local servers live in the user profile, which patterson never writes.`,
        fallbackApplied: false,
      });
      continue;
    }

    const rendered = renderServer(server);
    if (!rendered.ok) {
      gaps.push({ entityId, targetId: VSCODE_TARGET, reason: rendered.reason, fallbackApplied: false });
      continue;
    }

    // Register this server's inputs only if none conflicts with an
    // already-registered definition — a server is never partially emitted.
    const conflicting = rendered.inputs.find((input) => {
      const existing = inputById.get(input.id);
      return existing !== undefined && stableStringify(existing) !== stableStringify(input);
    });
    if (conflicting !== undefined) {
      gaps.push({
        entityId,
        targetId: VSCODE_TARGET,
        reason: `Input id "${conflicting.id}" is already defined differently by an earlier server in .vscode/mcp.json inputs[]; rename the SecretRef id (or env name) to emit this server.`,
        fallbackApplied: false,
      });
      continue;
    }
    for (const input of rendered.inputs) {
      if (inputById.has(input.id)) continue;
      inputById.set(input.id, input);
      inputOrder.push(input);
    }

    if (server.timeoutMs !== undefined) {
      gaps.push({
        entityId: `${entityId}.timeoutMs`,
        targetId: VSCODE_TARGET,
        reason:
          ".vscode/mcp.json has no per-server timeout field; timeoutMs was dropped for this target.",
        fallbackApplied: true,
      });
    }

    patch.push({ keyPath: ["servers", server.name], value: rendered.value });
  }

  if (inputOrder.length > 0) {
    // Merge with the on-disk inputs array: foreign (hand-added) entries are
    // preserved; entries with our ids are replaced by our definitions so
    // `--accept-generated` restores generated content.
    const currentText = snapshot.read(MCP_JSON_PATH);
    const current = currentText === null ? undefined : readValueAt(currentText, ["inputs"]).value;
    const merged = overrideByIdentity(current, inputOrder, (item) => {
      if (typeof item === "object" && item !== null && "id" in item) {
        const id = (item as { id: unknown }).id;
        if (typeof id === "string") return id;
      }
      return null;
    });
    patch.push({ keyPath: ["inputs"], value: merged });
  }

  if (patch.length === 0) return { op: null, gaps };
  return { op: { path: MCP_JSON_PATH, format: "jsonc", mode: "merge", patch }, gaps };
}
