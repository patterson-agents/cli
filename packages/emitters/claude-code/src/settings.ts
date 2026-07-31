/**
 * `.claude/settings.json` emission (MERGE tier, structured key-path surgery).
 *
 * Whitelist source (Constitution V / S2): the vendored schema at
 * `packages/emitters/claude-code/schema/settings.schema.json`
 * (https://www.schemastore.org/claude-code-settings.json, draft-07). The key
 * lists below are hand-derived from that schema and locked to it by the
 * settings-schema oracle test — any divergence fails the suite.
 *
 * C8 merge semantics: arrays concatenate + dedupe (removal from below is
 * impossible — a *reported* consequence, not something we emulate); scalars
 * override whole-value. Encoded in the exported MERGE_SEMANTICS map.
 */
import {
  readValueAt,
  stableStringify,
  type AgentHookDef,
  type CoverageGap,
  type FileOp,
  type FsSnapshot,
  type KeyPathPatch,
  type PattersonProject,
} from "@patterson/core";

import { CLAUDE_TARGET, targetsClaude } from "./common.ts";

export const SETTINGS_PATH = ".claude/settings.json";

// ---------------------------------------------------------------------------
// Whitelist (schema-locked by test/settings-schema.test.ts)
// ---------------------------------------------------------------------------

/** Top-level settings keys this emitter may emit. Subset of schema `properties`. */
export const SETTINGS_TOP_LEVEL_KEYS = ["permissions", "model", "fallbackModel", "hooks"] as const;

/** Keys under `permissions` this emitter may emit. Subset of the schema's permissions properties. */
export const SETTINGS_PERMISSIONS_KEYS = [
  "allow",
  "deny",
  "ask",
  "defaultMode",
  "additionalDirectories",
] as const;

/**
 * Valid hook event names — the schema's `hooks.properties` keys
 * (`additionalProperties: false`, so an unknown event is inexpressible).
 */
export const HOOK_EVENTS = [
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "PermissionRequest",
  "Notification",
  "UserPromptSubmit",
  "Stop",
  "StopFailure",
  "SubagentStart",
  "SubagentStop",
  "PreCompact",
  "PostCompact",
  "Elicitation",
  "ElicitationResult",
  "TeammateIdle",
  "TaskCompleted",
  "Setup",
  "InstructionsLoaded",
  "CwdChanged",
  "FileChanged",
  "ConfigChange",
  "WorktreeCreate",
  "WorktreeRemove",
  "SessionStart",
  "SessionEnd",
  "PostToolBatch",
  "TaskCreated",
  "PermissionDenied",
  "UserPromptExpansion",
  "MessageDisplay",
  "DirectoryAdded",
] as const;

const TOP_LEVEL = new Set<string>(SETTINGS_TOP_LEVEL_KEYS);
const PERMISSION_KEYS = new Set<string>(SETTINGS_PERMISSIONS_KEYS);
const EVENTS = new Set<string>(HOOK_EVENTS);

/** Throws when a key path escapes the schema-derived whitelist (contract violation, not a gap). */
export function assertWhitelistedKeyPath(keyPath: readonly (string | number)[]): void {
  const [top, second] = keyPath;
  const fail = (): never => {
    throw new Error(
      `claude-code emitter: key path [${keyPath.join(", ")}] is not whitelisted against the vendored settings schema.`,
    );
  };
  if (typeof top !== "string" || !TOP_LEVEL.has(top)) fail();
  if (top === "permissions" && (typeof second !== "string" || !PERMISSION_KEYS.has(second))) fail();
  if (top === "hooks" && (typeof second !== "string" || !EVENTS.has(second))) fail();
  if ((top === "model" || top === "fallbackModel") && second !== undefined) fail();
}

// ---------------------------------------------------------------------------
// C8 merge semantics
// ---------------------------------------------------------------------------

export type MergeSemantics = "concat-dedupe" | "override";

/**
 * Per-key merge semantics for settings surgery (C8). Keys are RFC 6901-style
 * pointers; `/hooks/*` is a wildcard covering every hook event key.
 */
export const MERGE_SEMANTICS: Readonly<Record<string, MergeSemantics>> = {
  "/permissions/allow": "concat-dedupe",
  "/permissions/deny": "concat-dedupe",
  "/permissions/ask": "concat-dedupe",
  "/permissions/additionalDirectories": "concat-dedupe",
  "/permissions/defaultMode": "override",
  "/model": "override",
  "/fallbackModel": "override",
  "/hooks/*": "concat-dedupe",
};

/** Resolve semantics for a pointer: exact entry first, then a `/parent/*` wildcard, else override. */
export function semanticsFor(pointer: string): MergeSemantics {
  const exact = MERGE_SEMANTICS[pointer];
  if (exact !== undefined) return exact;
  const wildcard = MERGE_SEMANTICS[pointer.replace(/\/[^/]*$/, "/*")];
  return wildcard ?? "override";
}

/**
 * Merge the desired value with the current on-disk value per C8:
 * concat-dedupe keeps every existing element (hand-added entries survive) and
 * appends missing desired elements; override replaces whole-value.
 * Dedupe identity is the stable-stringified element.
 */
export function mergeSettingsValue(
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
// Hooks rendering (schema `hookCommand` exec form: command + args, no shell join)
// ---------------------------------------------------------------------------

interface HookMatcherEntry {
  matcher?: string;
  hooks: { type: "command"; command: string; args?: string[] }[];
}

function renderHook(hook: AgentHookDef): HookMatcherEntry {
  const [command, ...args] = hook.exec.argv;
  if (command === undefined) throw new Error("Exec.argv is non-empty by schema (C1)."); // unreachable
  const entry: HookMatcherEntry["hooks"][number] = { type: "command", command };
  if (args.length > 0) entry.args = args;
  const rendered: HookMatcherEntry = { hooks: [entry] };
  if (hook.matcher !== undefined) rendered.matcher = hook.matcher;
  return rendered;
}

// ---------------------------------------------------------------------------
// Compile
// ---------------------------------------------------------------------------

export interface SettingsOutput {
  op: FileOp | null;
  gaps: CoverageGap[];
}

/** Build the merge-tier settings FileOp from PolicyDef, ModelDef, and agent hooks. */
export function buildSettingsOp(ir: PattersonProject, snapshot: FsSnapshot): SettingsOutput {
  const gaps: CoverageGap[] = [];
  const desired: KeyPathPatch[] = [];

  const { policy, models } = ir;
  if (policy.allow.length > 0) desired.push({ keyPath: ["permissions", "allow"], value: policy.allow });
  if (policy.deny.length > 0) desired.push({ keyPath: ["permissions", "deny"], value: policy.deny });
  if (policy.ask.length > 0) desired.push({ keyPath: ["permissions", "ask"], value: policy.ask });
  if (policy.additionalDirectories !== undefined && policy.additionalDirectories.length > 0) {
    desired.push({ keyPath: ["permissions", "additionalDirectories"], value: policy.additionalDirectories });
  }
  if (policy.defaultMode !== undefined) {
    desired.push({ keyPath: ["permissions", "defaultMode"], value: policy.defaultMode });
  }

  if (models.default !== undefined) desired.push({ keyPath: ["model"], value: models.default });
  // Schema: `fallbackModel` is a fallback CHAIN (array, max 3); the IR's single
  // fallback renders as a one-element chain.
  if (models.fallback !== undefined) desired.push({ keyPath: ["fallbackModel"], value: [models.fallback] });

  // Agent hooks → hooks.<Event> arrays, grouped in first-appearance order.
  const byEvent = new Map<string, HookMatcherEntry[]>();
  ir.hooks.agentHooks.forEach((hook, index) => {
    if (!targetsClaude(hook)) return;
    const entityId = `hooks.agentHooks[${index}]`;
    if (!EVENTS.has(hook.event)) {
      gaps.push({
        entityId,
        targetId: CLAUDE_TARGET,
        reason: `Hook event "${hook.event}" is not a Claude Code hook event (vendored settings schema: hooks has additionalProperties: false).`,
        fallbackApplied: false,
      });
      return;
    }
    if (hook.exec.cwd !== undefined || hook.exec.env !== undefined) {
      gaps.push({
        entityId,
        targetId: CLAUDE_TARGET,
        reason:
          "Claude Code hookCommand entries have no cwd/env fields (vendored settings schema); express the environment inside the hook script instead.",
        fallbackApplied: false,
      });
      return;
    }
    const entries = byEvent.get(hook.event) ?? [];
    entries.push(renderHook(hook));
    byEvent.set(hook.event, entries);
  });
  for (const [event, entries] of byEvent) {
    desired.push({ keyPath: ["hooks", event], value: entries });
  }

  if (desired.length === 0) return { op: null, gaps };

  // Merge against the snapshot per C8, then whitelist every emitted key path.
  const currentText = snapshot.read(SETTINGS_PATH);
  const patch: KeyPathPatch[] = desired.map((entry) => {
    assertWhitelistedKeyPath(entry.keyPath);
    const pointer = `/${entry.keyPath.join("/")}`;
    const semantics = semanticsFor(pointer);
    const current =
      currentText === null ? undefined : readValueAt(currentText, entry.keyPath).value;
    return { keyPath: entry.keyPath, value: mergeSettingsValue(semantics, current, entry.value) };
  });

  return {
    op: { path: SETTINGS_PATH, format: "json", mode: "merge", patch },
    gaps,
  };
}
