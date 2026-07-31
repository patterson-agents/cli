/**
 * Settings whitelist + C8 merge-semantics tests (T022).
 *
 * The vendored schema (schema/settings.schema.json, S2) is loaded HERE as the
 * oracle: every key the emitter may emit must exist in the schema, and every
 * compiled settings patch must validate against it via the minimal draft-07
 * checker in ./mini-schema.ts.
 */
import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { captureSnapshot, PattersonProjectSchema, type PattersonProjectInput } from "@patterson/core";

import {
  assertWhitelistedKeyPath,
  buildSettingsOp,
  HOOK_EVENTS,
  MERGE_SEMANTICS,
  mergeSettingsValue,
  semanticsFor,
  SETTINGS_PERMISSIONS_KEYS,
  SETTINGS_TOP_LEVEL_KEYS,
} from "../src/settings.ts";
import { checkAgainstSchema, materializePatch, type RootSchema } from "./mini-schema.ts";

const SCHEMA_PATH = join(import.meta.dir, "..", "schema", "settings.schema.json");
const schema = (await Bun.file(SCHEMA_PATH).json()) as RootSchema;

async function emptySnapshot() {
  return captureSnapshot("/nonexistent-root-for-snapshot", []);
}

function parse(input: PattersonProjectInput) {
  return PattersonProjectSchema.parse(input);
}

describe("settings whitelist against the vendored schema (S2 oracle)", () => {
  test("every whitelisted top-level key exists in schema.properties", () => {
    for (const key of SETTINGS_TOP_LEVEL_KEYS) {
      expect(schema.properties?.[key]).toBeDefined();
    }
  });

  test("every whitelisted permissions key exists in the schema's permissions.properties", () => {
    const permissions = schema.properties?.permissions;
    for (const key of SETTINGS_PERMISSIONS_KEYS) {
      expect(permissions?.properties?.[key]).toBeDefined();
    }
  });

  test("HOOK_EVENTS is exactly the schema's hooks.properties key set", () => {
    const events = Object.keys(schema.properties?.hooks?.properties ?? {});
    expect(([...HOOK_EVENTS] as string[]).toSorted()).toEqual(events.toSorted());
  });

  test("assertWhitelistedKeyPath rejects non-schema keys", () => {
    expect(() => assertWhitelistedKeyPath(["notARealKey"])).toThrow(/not whitelisted/);
    expect(() => assertWhitelistedKeyPath(["permissions", "allowAll"])).toThrow(/not whitelisted/);
    expect(() => assertWhitelistedKeyPath(["hooks", "OnRandomEvent"])).toThrow(/not whitelisted/);
    expect(() => assertWhitelistedKeyPath(["model", "nested"])).toThrow(/not whitelisted/);
    expect(() => assertWhitelistedKeyPath(["permissions", "allow"])).not.toThrow();
    expect(() => assertWhitelistedKeyPath(["hooks", "PostToolUse"])).not.toThrow();
  });

  test("a full compiled settings patch validates against the vendored schema", async () => {
    const ir = parse({
      version: 1,
      name: "schema-oracle",
      policy: {
        allow: ["Read", "Bash(bun test:*)"],
        deny: ["Read(./.env)"],
        ask: ["WebFetch"],
        additionalDirectories: ["../docs"],
        defaultMode: "acceptEdits",
      },
      models: { default: "opus", fallback: "sonnet" },
      hooks: {
        agentHooks: [
          {
            event: "PostToolUse",
            matcher: "Edit|Write",
            exec: { argv: ["bunx", "oxlint", "--fix"] },
          },
          { event: "SessionStart", exec: { argv: ["echo", "hi"] } },
        ],
        gitHooks: [],
      },
    });
    const { op, gaps } = buildSettingsOp(ir, await emptySnapshot());
    expect(gaps).toEqual([]);
    expect(op).not.toBeNull();
    const settings = materializePatch(op?.patch ?? []);
    expect(checkAgainstSchema(settings, schema, schema)).toEqual([]);
  });

  test("the mini checker itself catches type and additionalProperties violations", () => {
    expect(checkAgainstSchema({ model: 42 }, schema, schema)).not.toEqual([]);
    expect(checkAgainstSchema({ permissions: { allowAll: true } }, schema, schema)).not.toEqual([]);
    expect(checkAgainstSchema({ fallbackModel: "sonnet" }, schema, schema)).not.toEqual([]); // must be an array
  });
});

describe("C8 merge semantics (MERGE_SEMANTICS)", () => {
  test("table: arrays concat+dedupe, scalars override", () => {
    expect(MERGE_SEMANTICS["/permissions/allow"]).toBe("concat-dedupe");
    expect(MERGE_SEMANTICS["/permissions/deny"]).toBe("concat-dedupe");
    expect(MERGE_SEMANTICS["/permissions/ask"]).toBe("concat-dedupe");
    expect(MERGE_SEMANTICS["/permissions/additionalDirectories"]).toBe("concat-dedupe");
    expect(MERGE_SEMANTICS["/permissions/defaultMode"]).toBe("override");
    expect(MERGE_SEMANTICS["/model"]).toBe("override");
    expect(MERGE_SEMANTICS["/fallbackModel"]).toBe("override");
    expect(MERGE_SEMANTICS["/hooks/*"]).toBe("concat-dedupe");
  });

  test("semanticsFor resolves exact keys, hook wildcards, and defaults to override", () => {
    expect(semanticsFor("/permissions/allow")).toBe("concat-dedupe");
    expect(semanticsFor("/hooks/PostToolUse")).toBe("concat-dedupe");
    expect(semanticsFor("/model")).toBe("override");
    expect(semanticsFor("/somewhere/else")).toBe("override");
  });

  test("concat-dedupe keeps hand-added entries and appends missing desired ones, deduped", () => {
    const merged = mergeSettingsValue(
      "concat-dedupe",
      ["Bash(git status)", "Read"],
      ["Read", "WebFetch"],
    );
    expect(merged).toEqual(["Bash(git status)", "Read", "WebFetch"]);
  });

  test("concat-dedupe dedupes object elements structurally (hooks)", () => {
    const entry = { hooks: [{ type: "command", command: "echo" }] };
    const merged = mergeSettingsValue("concat-dedupe", [entry], [structuredClone(entry)]);
    expect(merged).toEqual([entry]);
  });

  test("override replaces whole-value", () => {
    expect(mergeSettingsValue("override", "plan", "acceptEdits")).toBe("acceptEdits");
    expect(mergeSettingsValue("override", ["a"], ["b"])).toEqual(["b"]);
  });

  test("compile merges snapshot arrays per C8 and overrides scalars", async () => {
    const snapshotDir = await import("node:fs/promises");
    const os = await import("node:os");
    const { join: joinPath } = await import("node:path");
    const dir = await snapshotDir.mkdtemp(joinPath(os.tmpdir(), "patterson-settings-"));
    await snapshotDir.mkdir(joinPath(dir, ".claude"), { recursive: true });
    await Bun.write(
      joinPath(dir, ".claude/settings.json"),
      JSON.stringify(
        {
          permissions: { allow: ["Bash(git status)"], defaultMode: "plan" },
          cleanupPeriodDays: 7,
        },
        null,
        2,
      ),
    );
    const snapshot = await captureSnapshot(dir, [".claude/settings.json"]);
    const ir = parse({
      version: 1,
      name: "merge",
      policy: { allow: ["Read"], deny: [], ask: [], defaultMode: "acceptEdits" },
    });
    const { op } = buildSettingsOp(ir, snapshot);
    const settings = materializePatch(op?.patch ?? []);
    expect(settings.permissions).toEqual({
      allow: ["Bash(git status)", "Read"],
      defaultMode: "acceptEdits",
    });
    await snapshotDir.rm(dir, { recursive: true, force: true });
  });
});
