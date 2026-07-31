/**
 * `.zed/settings.json` emission (MERGE tier — one key path per context server
 * under `context_servers`, whole-value override).
 *
 * S6 verdict: **file** — project-scope `.zed/settings.json` DOES carry
 * `context_servers` (research.md S6, source-verified against
 * zed-industries/zed main: local settings parse as ProjectSettingsContent,
 * which includes `context_servers` and `context_server_timeout`; the
 * ContextServerStore resolves them worktree-scoped).
 *
 * Shape (C2): Zed's per-server value has NO `type` discriminator — presence of
 * `command` selects a stdio server, presence of `url` a remote one
 * (data-model.md McpServerDef rules).
 *
 * Project-scope honesty (S6 drift consequence): Zed SILENTLY ignores unknown
 * or user-only keys in `.zed/settings.json` at load time, so this emitter is
 * the enforcement point — every emitted key path must pass
 * `assertZedProjectKeyPath` against the S6-verified project-scope whitelist.
 * Global-only keys (`theme`, `vim_mode`, ...) are contract violations here,
 * never gaps.
 *
 * Conservative renders (Constitution V — no primary source, no emission):
 * SecretRef env values, remote `headers`/`oauth`, and stdio `cwd` have no
 * verified project-scope representation in Zed, so a server carrying them is
 * rejected with a CoverageGap (never partially emitted).
 *
 * Trust gate (S6): project-defined context servers do not start until the
 * worktree is trusted — an instruct-tier note rides along whenever servers
 * are emitted so SETUP.md surfaces the one-time prompt.
 */
import type {
  CoverageGap,
  EnvValue,
  FileOp,
  KeyPathPatch,
  McpServerDef,
  PattersonProject,
} from "@patterson/core";

import { targetsZed, ZED_TARGET } from "./common.ts";

export const ZED_SETTINGS_PATH = ".zed/settings.json";

/**
 * The project-scope settings keys this emitter may emit, per S6
 * (ProjectSettingsContent: `context_servers`, `context_server_timeout`).
 * Anything else — including every global-only key like `theme` or `vim_mode` —
 * is refused by `assertZedProjectKeyPath`.
 */
export const ZED_PROJECT_SETTINGS_KEYS = ["context_servers", "context_server_timeout"] as const;

const PROJECT_KEYS = new Set<string>(ZED_PROJECT_SETTINGS_KEYS);

/** Throws when a key path escapes the S6 project-scope whitelist (contract violation, not a gap). */
export function assertZedProjectKeyPath(keyPath: readonly (string | number)[]): void {
  const [top, second] = keyPath;
  const fail = (): never => {
    throw new Error(
      `zed emitter: key path [${keyPath.join(", ")}] is not project-scope-valid for .zed/settings.json ` +
        `(S6 whitelist: ${ZED_PROJECT_SETTINGS_KEYS.join(", ")}).`,
    );
  };
  if (typeof top !== "string" || !PROJECT_KEYS.has(top)) fail();
  if (top === "context_servers" && (typeof second !== "string" || keyPath.length !== 2)) fail();
  if (top === "context_server_timeout" && second !== undefined) fail();
}

/**
 * Render an env value. Plain strings pass through; EVERY SecretRef kind is
 * inexpressible: Zed has no verified `${VAR}` expansion (or any interpolation)
 * for context-server env at project scope, so even `{ kind: "env" }` cannot be
 * rendered without inventing behavior (Constitution V).
 */
function renderEnvValue(value: EnvValue): { ok: true; rendered: string } | { ok: false; reason: string } {
  if (typeof value === "string") return { ok: true, rendered: value };
  return {
    ok: false,
    reason:
      `SecretRef kind "${value.kind}" is inexpressible in .zed/settings.json — Zed has no verified ` +
      "environment interpolation for project-scope context servers; configure the secret out of band " +
      "(shell wrapper or user-machine environment).",
  };
}

type RenderResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; reason: string };

function renderServer(server: McpServerDef): RenderResult {
  const { transport } = server;

  if (transport.kind === "stdio") {
    const [command, ...args] = transport.exec.argv;
    if (command === undefined) return { ok: false, reason: "argv is empty" }; // unreachable (C1 schema)
    if (transport.exec.cwd !== undefined) {
      return {
        ok: false,
        reason: "Zed context servers have no verified cwd field at project scope.",
      };
    }
    // C2: no `type` discriminator — `command` presence selects stdio.
    const value: Record<string, unknown> = { command };
    if (args.length > 0) value.args = args;
    if (transport.exec.env !== undefined) {
      const env: Record<string, string> = {};
      for (const key of Object.keys(transport.exec.env)) {
        const raw = transport.exec.env[key];
        if (raw === undefined) continue;
        const rendered = renderEnvValue(raw);
        if (!rendered.ok) return { ok: false, reason: `${key}: ${rendered.reason}` };
        env[key] = rendered.rendered;
      }
      value.env = env;
    }
    return { ok: true, value };
  }

  if (transport.kind === "ws") {
    return {
      ok: false,
      reason: 'MCP transport "ws" is reachable only on claude-code (data-model.md McpServerDef rules).',
    };
  }

  if (transport.headers !== undefined || transport.oauth !== undefined) {
    return {
      ok: false,
      reason:
        "Remote context-server headers/oauth have no verified representation in project-scope " +
        ".zed/settings.json; configure authentication out of band.",
    };
  }

  // C2: no `type` discriminator — `url` presence selects a remote server.
  return { ok: true, value: { url: transport.url } };
}

/** The instruct-tier worktree-trust note (S6 trust gate), emitted alongside any servers. */
export const TRUST_NOTE_CONTENT = [
  "Zed does not start project-defined context servers until the worktree is",
  "trusted (S6). Open this project in Zed and accept the one-time worktree",
  "trust prompt; MCP servers from `.zed/settings.json` start after that.",
  "(A user may instead set `session.trust_all_worktrees` in their Zed USER",
  "settings — a user-machine decision patterson never writes.)",
].join("\n");

export interface SettingsOutput {
  ops: FileOp[];
  gaps: CoverageGap[];
}

export function buildContextServersOp(ir: PattersonProject): SettingsOutput {
  const gaps: CoverageGap[] = [];
  const patch: KeyPathPatch[] = [];

  for (const server of ir.mcp) {
    if (!targetsZed(server)) continue;
    const entityId = `mcp.${server.name}`;

    if (server.scope !== "project") {
      gaps.push({
        entityId,
        targetId: ZED_TARGET,
        reason:
          `MCP scope "${server.scope}" is not emittable: .zed/settings.json is the project-scope ` +
          "surface, and Zed user settings live on the user machine (never written by patterson).",
        fallbackApplied: false,
      });
      continue;
    }

    const rendered = renderServer(server);
    if (!rendered.ok) {
      gaps.push({ entityId, targetId: ZED_TARGET, reason: rendered.reason, fallbackApplied: false });
      continue;
    }

    if (server.timeoutMs !== undefined) {
      gaps.push({
        entityId: `${entityId}.timeoutMs`,
        targetId: ZED_TARGET,
        reason:
          "Zed has no per-server timeout: project scope only carries the global " +
          "`context_server_timeout` (S6), which patterson does not map from a per-server value; " +
          "timeoutMs was dropped for this target.",
        fallbackApplied: true,
      });
    }

    if (server.tools !== undefined) {
      gaps.push({
        entityId: `${entityId}.tools`,
        targetId: ZED_TARGET,
        reason:
          "Zed has no verified per-server tool allowlist in project-scope settings; tools[] was " +
          "dropped for this target (the server is emitted with all its tools reachable).",
        fallbackApplied: true,
      });
    }

    const keyPath = ["context_servers", server.name];
    assertZedProjectKeyPath(keyPath);
    patch.push({ keyPath, value: rendered.value });
  }

  if (patch.length === 0) return { ops: [], gaps };

  return {
    ops: [
      // Zed settings files are JSONC — comments and unknown (hand-authored)
      // keys survive the engine's key-path surgery.
      { path: ZED_SETTINGS_PATH, format: "jsonc", mode: "merge", patch },
      {
        path: ZED_SETTINGS_PATH,
        format: "markdown",
        mode: "instruct",
        sentinelId: "zed:worktree-trust",
        content: TRUST_NOTE_CONTENT,
      },
    ],
    gaps,
  };
}
