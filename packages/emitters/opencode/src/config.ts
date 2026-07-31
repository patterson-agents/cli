/**
 * `opencode.json` / `opencode.jsonc` emission (MERGE tier, structured
 * key-path surgery — jsonc comment preservation is engine territory).
 *
 * Whitelist source (Constitution V): the vendored schema at
 * `packages/emitters/opencode/schema/config.schema.json`
 * (https://opencode.ai/config.json, draft 2020-12, fetched 2026-07-31 and
 * locked by the config-schema oracle test). Load-bearing facts taken from it:
 *
 * - `mcp.<name>` is `McpLocalConfig {type:"local", command: string[], cwd?,
 *   environment?, enabled?, timeout?}` or `McpRemoteConfig {type:"remote",
 *   url, headers?, oauth?, enabled?, timeout?}` — argv maps to `command`
 *   VERBATIM (C1: never argv[0]+rest, never a shell string), `cwd` and
 *   `timeout` ARE expressible (unlike claude's .mcp.json).
 * - `command.<name>` REQUIRES `template` (schema `required: ["template"]`).
 * - `agent.<name>` is AgentConfig (prompt = body); the schema names seven
 *   built-in agents (plan, build, general, explore, title, summary,
 *   compaction) whose keys would RECONFIGURE the built-in — collisions are
 *   CoverageGaps, never silent overrides.
 * - `model` / `agent.model` are "provider/model" strings.
 * - `skills.paths` lists extra skill folders → ALWAYS emitted with
 *   ".agents/skills" (S3/D7: the canonical tree is the only skills source).
 * - `permission` is opencode's native permission object; Claude-style
 *   allow/deny/ask rule strings have no mechanical translation into it, so
 *   PolicyDef reaches opencode ONLY via the `policy.opencode` raw escape
 *   hatch (data-model.md PolicyDef) — anything else is a reported gap.
 *
 * SecretRef kind "env" renders as opencode's native `{env:NAME}` substitution
 * (C4/D8: the fourth interpolation syntax); `{env:...}` has no default form,
 * so an env-ref default is dropped with a reported gap. prompt/pick/command/
 * helper kinds are inexpressible → the server is rejected with a gap (never
 * partially emitted).
 */
import {
  readValueAt,
  stableStringify,
  type CoverageGap,
  type EnvValue,
  type FileOp,
  type FsSnapshot,
  type KeyPathPatch,
  type McpServerDef,
  type PattersonProject,
} from "@patterson/core";

import { OPENCODE_TARGET, targetsOpencode } from "./common.ts";

export const OPENCODE_JSON_PATH = "opencode.json";
export const OPENCODE_JSONC_PATH = "opencode.jsonc";

/** The $schema url emitted into the config (also the vendored schema's source). */
export const OPENCODE_SCHEMA_URL = "https://opencode.ai/config.json";

/** The canonical skills tree — ALWAYS present in `skills.paths` (S3/D7). */
export const AGENTS_SKILLS_PATH = ".agents/skills";

/**
 * The vendored schema's named `agent` properties: emitting one of these keys
 * would reconfigure an opencode BUILT-IN agent (schema-locked by test).
 */
export const BUILTIN_AGENT_NAMES = [
  "plan",
  "build",
  "general",
  "explore",
  "title",
  "summary",
  "compaction",
] as const;

const BUILTINS = new Set<string>(BUILTIN_AGENT_NAMES);

/**
 * Config path selection: patch `opencode.jsonc` only when it exists and
 * `opencode.json` does not; otherwise (both, json-only, neither) the target
 * is `opencode.json`. Deterministic given the snapshot.
 */
export function configPath(snapshot: FsSnapshot): { path: string; format: "json" | "jsonc" } {
  if (snapshot.has(OPENCODE_JSONC_PATH) && !snapshot.has(OPENCODE_JSON_PATH)) {
    return { path: OPENCODE_JSONC_PATH, format: "jsonc" };
  }
  return { path: OPENCODE_JSON_PATH, format: "json" };
}

// ---------------------------------------------------------------------------
// Merge semantics (mirrors claude-code's MERGE_SEMANTICS shape)
// ---------------------------------------------------------------------------

export type MergeSemantics = "concat-dedupe" | "override";

/**
 * Per-key merge semantics for config surgery. Keys are RFC 6901-style
 * pointers; `/mcp/*`, `/agent/*`, `/command/*` wildcards cover every server/
 * agent/command key (whole-value override — hand edits inside a generated
 * value are drift, caught by the engine's per-key baselines).
 */
export const MERGE_SEMANTICS: Readonly<Record<string, MergeSemantics>> = {
  "/skills/paths": "concat-dedupe",
  "/instructions": "concat-dedupe",
  "/$schema": "override",
  "/model": "override",
  "/permission": "override",
  "/mcp/*": "override",
  "/agent/*": "override",
  "/command/*": "override",
};

/** Resolve semantics for a pointer: exact entry first, then a `/parent/*` wildcard, else override. */
export function semanticsFor(pointer: string): MergeSemantics {
  const exact = MERGE_SEMANTICS[pointer];
  if (exact !== undefined) return exact;
  const wildcard = MERGE_SEMANTICS[pointer.replace(/\/[^/]*$/, "/*")];
  return wildcard ?? "override";
}

/**
 * Merge the desired value with the current on-disk value: concat-dedupe keeps
 * every existing element (hand-added entries survive) and appends missing
 * desired elements; override replaces whole-value. Dedupe identity is the
 * stable-stringified element.
 */
export function mergeConfigValue(
  semantics: MergeSemantics,
  current: unknown,
  desired: unknown,
): unknown {
  if (semantics === "override") return desired;
  const base = Array.isArray(current) ? current : [];
  const additions = Array.isArray(desired) ? desired : [desired];
  const seen = new Set(base.map((item) => stableStringify(item)));
  const merged = [...base];
  for (const item of additions) {
    const key = stableStringify(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

// ---------------------------------------------------------------------------
// MCP rendering
// ---------------------------------------------------------------------------

type EnvRender =
  | { ok: true; rendered: string; defaultDropped: boolean }
  | { ok: false; reason: string };

/** Render an env/header value; SecretRefs other than kind "env" are inexpressible. */
function renderEnvValue(value: EnvValue): EnvRender {
  if (typeof value === "string") return { ok: true, rendered: value, defaultDropped: false };
  if (value.kind === "env") {
    // Native substitution syntax (C4/D8). `{env:...}` has no default form.
    return { ok: true, rendered: `{env:${value.name}}`, defaultDropped: value.default !== undefined };
  }
  return {
    ok: false,
    reason: `SecretRef kind "${value.kind}" is inexpressible in opencode.json (only {env:NAME} substitution is supported); use { kind: "env" } or configure the secret out of band.`,
  };
}

type RecordRender =
  | { ok: true; rendered: Record<string, string>; defaultsDropped: string[] }
  | { ok: false; reason: string };

function renderRecord(record: Readonly<Record<string, EnvValue>>): RecordRender {
  const rendered: Record<string, string> = {};
  const defaultsDropped: string[] = [];
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (value === undefined) continue;
    const result = renderEnvValue(value);
    if (!result.ok) return { ok: false, reason: `${key}: ${result.reason}` };
    rendered[key] = result.rendered;
    if (result.defaultDropped) defaultsDropped.push(key);
  }
  return { ok: true, rendered, defaultsDropped };
}

interface ServerRender {
  value: Record<string, unknown> | null;
  gaps: CoverageGap[];
}

function renderServer(server: McpServerDef): ServerRender {
  const gaps: CoverageGap[] = [];
  const entityId = `mcp.${server.name}`;
  const { transport } = server;

  if (server.scope !== "project") {
    gaps.push({
      entityId,
      targetId: OPENCODE_TARGET,
      reason: `MCP scope "${server.scope}" is not emittable: the project opencode.json is project-scope only, and patterson never writes the user-global opencode config.`,
      fallbackApplied: false,
    });
    return { value: null, gaps };
  }

  const dropDefault = (keys: string[]): void => {
    if (keys.length === 0) return;
    gaps.push({
      entityId,
      targetId: OPENCODE_TARGET,
      reason: `opencode's {env:NAME} substitution has no default form; the default(s) for [${keys.join(", ")}] were dropped — the variable(s) must be set in the environment.`,
      fallbackApplied: true,
    });
  };

  if (transport.kind === "stdio") {
    // C1: argv maps to `command` VERBATIM — never argv[0]+rest, never joined.
    const value: Record<string, unknown> = { type: "local", command: [...transport.exec.argv] };
    if (transport.exec.cwd !== undefined) value.cwd = transport.exec.cwd;
    if (transport.exec.env !== undefined) {
      const env = renderRecord(transport.exec.env);
      if (!env.ok) {
        gaps.push({ entityId, targetId: OPENCODE_TARGET, reason: env.reason, fallbackApplied: false });
        return { value: null, gaps };
      }
      value.environment = env.rendered;
      dropDefault(env.defaultsDropped);
    }
    if (server.timeoutMs !== undefined) value.timeout = server.timeoutMs;
    return { value, gaps };
  }

  if (transport.kind === "ws") {
    gaps.push({
      entityId,
      targetId: OPENCODE_TARGET,
      reason: 'MCP transport "ws" is reachable only on claude-code (data-model.md McpServerDef); opencode remote servers are HTTP(S)-url based.',
      fallbackApplied: false,
    });
    return { value: null, gaps };
  }

  // http / sse → remote (opencode negotiates the concrete remote transport from the url).
  const value: Record<string, unknown> = { type: "remote", url: transport.url };
  if (transport.headers !== undefined) {
    const headers = renderRecord(transport.headers);
    if (!headers.ok) {
      gaps.push({ entityId, targetId: OPENCODE_TARGET, reason: headers.reason, fallbackApplied: false });
      return { value: null, gaps };
    }
    value.headers = headers.rendered;
    dropDefault(headers.defaultsDropped);
  }
  if (transport.oauth !== undefined) {
    gaps.push({
      entityId: `${entityId}.oauth`,
      targetId: OPENCODE_TARGET,
      reason:
        "Explicit oauth config was not passed through (the IR oauth record is free-form; opencode's McpOAuthConfig is additionalProperties: false). opencode auto-detects OAuth for remote servers; configure oauth in opencode.json manually if the auto-detection is insufficient.",
      fallbackApplied: true,
    });
  }
  if (server.timeoutMs !== undefined) value.timeout = server.timeoutMs;
  return { value, gaps };
}

// ---------------------------------------------------------------------------
// Compile
// ---------------------------------------------------------------------------

/** opencode model refs are "provider/model" strings (vendored schema `model`). */
function isOpencodeModelRef(model: string): boolean {
  return model.includes("/");
}

export interface ConfigOutput {
  op: FileOp;
  gaps: CoverageGap[];
}

/**
 * Build the merge-tier config FileOp. ALWAYS produces an op: `$schema` and
 * `skills.paths: [".agents/skills"]` are unconditional (S3/D7 — opencode must
 * discover the canonical skills tree even before any skill exists).
 */
export function buildConfigOp(
  ir: PattersonProject,
  snapshot: FsSnapshot,
  instructionRefs: readonly string[],
): ConfigOutput {
  const gaps: CoverageGap[] = [];
  const desired: KeyPathPatch[] = [];
  const target = configPath(snapshot);
  const currentText = snapshot.read(target.path);

  desired.push({ keyPath: ["$schema"], value: OPENCODE_SCHEMA_URL });
  desired.push({ keyPath: ["skills", "paths"], value: [AGENTS_SKILLS_PATH] });
  if (instructionRefs.length > 0) {
    desired.push({ keyPath: ["instructions"], value: [...instructionRefs] });
  }

  // --- policy → permission (raw escape hatch only) -------------------------
  const { policy, models } = ir;
  if (policy.opencode !== undefined) {
    // The author's native opencode permission object, verbatim. The Claude-
    // style allow/deny/ask lists are intentionally NOT also reported as gaps:
    // providing `policy.opencode` IS the documented opencode rendering.
    desired.push({ keyPath: ["permission"], value: policy.opencode });
  } else {
    for (const listName of ["allow", "deny", "ask"] as const) {
      if (policy[listName].length === 0) continue;
      gaps.push({
        entityId: `policy.${listName}`,
        targetId: OPENCODE_TARGET,
        reason:
          "Claude-style permission rules (e.g. \"Bash(bun test:*)\") have no mechanical translation into opencode's permission object (different pattern grammar and tool vocabulary); provide the native object via policy.opencode.",
        fallbackApplied: false,
      });
    }
    if (policy.defaultMode !== undefined) {
      gaps.push({
        entityId: "policy.defaultMode",
        targetId: OPENCODE_TARGET,
        reason:
          "Claude's permissions.defaultMode has no opencode equivalent; provide the native permission object via policy.opencode.",
        fallbackApplied: false,
      });
    }
  }

  // --- models --------------------------------------------------------------
  if (models.default !== undefined) {
    if (isOpencodeModelRef(models.default)) {
      desired.push({ keyPath: ["model"], value: models.default });
    } else {
      gaps.push({
        entityId: "models.default",
        targetId: OPENCODE_TARGET,
        reason: `Model ${JSON.stringify(models.default)} is not an opencode "provider/model" reference (vendored config schema); it was not emitted.`,
        fallbackApplied: false,
      });
    }
  }
  if (models.fallback !== undefined) {
    gaps.push({
      entityId: "models.fallback",
      targetId: OPENCODE_TARGET,
      reason: "opencode has no fallback-model chain (small_model is a summarization concern, not a fallback); models.fallback was dropped for this target.",
      fallbackApplied: true,
    });
  }

  // --- mcp -----------------------------------------------------------------
  for (const server of ir.mcp) {
    if (!targetsOpencode(server)) continue;
    const rendered = renderServer(server);
    gaps.push(...rendered.gaps);
    if (rendered.value !== null) {
      desired.push({ keyPath: ["mcp", server.name], value: rendered.value });
    }
  }

  // --- agents --------------------------------------------------------------
  const perAgent = models.perAgent ?? {};
  const emittedAgents = new Set<string>();
  for (const agent of ir.agents) {
    if (!targetsOpencode(agent)) continue;
    emittedAgents.add(agent.name);
    const entityId = `agents.${agent.name}`;

    if (BUILTINS.has(agent.name)) {
      gaps.push({
        entityId,
        targetId: OPENCODE_TARGET,
        reason: `Agent name "${agent.name}" collides with an opencode BUILT-IN agent (${BUILTIN_AGENT_NAMES.join(", ")}); emitting it would reconfigure the built-in. Rename the agent or configure the built-in by hand.`,
        fallbackApplied: false,
      });
      continue;
    }

    // Claude subagents are opencode `mode: "subagent"` agents; body = prompt.
    const value: Record<string, unknown> = {
      description: agent.description,
      mode: "subagent",
    };
    const model = perAgent[agent.name] ?? agent.model;
    if (model !== undefined) {
      if (isOpencodeModelRef(model)) {
        value.model = model;
      } else {
        gaps.push({
          entityId: `${entityId}.model`,
          targetId: OPENCODE_TARGET,
          reason: `Model ${JSON.stringify(model)} is not an opencode "provider/model" reference (vendored config schema); the agent was emitted without a model override.`,
          fallbackApplied: true,
        });
      }
    }
    value.prompt = agent.prompt;
    if (agent.tools !== undefined && agent.tools.length > 0) {
      gaps.push({
        entityId: `${entityId}.tools`,
        targetId: OPENCODE_TARGET,
        reason:
          "opencode's agent tools map is deprecated (vendored schema) and enable-only — it cannot express a claude-style allowlist; tools were dropped for this target (use agent-level permission via raw opencode config).",
        fallbackApplied: true,
      });
    }
    desired.push({ keyPath: ["agent", agent.name], value });
  }
  for (const name of Object.keys(perAgent)) {
    if (emittedAgents.has(name)) continue;
    gaps.push({
      entityId: `models.perAgent.${name}`,
      targetId: OPENCODE_TARGET,
      reason: `models.perAgent names agent "${name}", but no opencode-targeted agent with that name exists.`,
      fallbackApplied: false,
    });
  }

  // --- commands (schema: command.<name>.template is REQUIRED) --------------
  for (const command of ir.commands) {
    if (!targetsOpencode(command)) continue;
    const entityId = `commands.${command.name}`;
    if (command.template === "") {
      gaps.push({
        entityId,
        targetId: OPENCODE_TARGET,
        reason: "opencode commands REQUIRE a non-empty template (vendored config schema: command.<name>.template is required); the command was not emitted.",
        fallbackApplied: false,
      });
      continue;
    }
    const value: Record<string, unknown> = { template: command.template };
    if (command.description !== undefined) value.description = command.description;
    desired.push({ keyPath: ["command", command.name], value });
  }

  // --- agent hooks (opencode plugins are NOT generated in v1) --------------
  ir.hooks.agentHooks.forEach((hook, index) => {
    if (!targetsOpencode(hook)) return;
    gaps.push({
      entityId: `hooks.agentHooks[${index}]`,
      targetId: OPENCODE_TARGET,
      reason: "opencode hooks are plugins, and plugin generation is out of scope in v1 (data-model.md AgentHookDef: raw escape only); the hook was not emitted for this target.",
      fallbackApplied: false,
    });
  });

  // --- extensions (only when explicitly aimed at opencode) -----------------
  for (const extension of ir.extensions) {
    if (extension.targets === undefined || !extension.targets.includes(OPENCODE_TARGET)) continue;
    gaps.push({
      entityId: `extensions.${extension.id}`,
      targetId: OPENCODE_TARGET,
      reason: "opencode has no extension-recommendation surface; the extension record was not emitted for this target.",
      fallbackApplied: false,
    });
  }

  // Merge desired values against the snapshot (concat-dedupe keeps hand-added
  // array entries; override replaces whole-value).
  const patch: KeyPathPatch[] = desired.map((entry) => {
    const pointer = `/${entry.keyPath.join("/")}`;
    const semantics = semanticsFor(pointer);
    const current =
      currentText === null ? undefined : readValueAt(currentText, entry.keyPath).value;
    return { keyPath: entry.keyPath, value: mergeConfigValue(semantics, current, entry.value) };
  });

  return {
    op: { path: target.path, format: target.format, mode: "merge", patch },
    gaps,
  };
}
