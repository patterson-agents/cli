/**
 * Config facts + merge-semantics tests (T031).
 *
 * The vendored schema (schema/config.schema.json — https://opencode.ai/config.json,
 * Constitution V) is loaded HERE as the oracle: every schema fact the emitter
 * hard-codes (built-in agent names, required command template, MCP config
 * shapes, skills.paths) is locked to it, and compiled config patches must
 * validate against it via the minimal checker in ./mini-schema.ts.
 */
import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { captureSnapshot, PattersonProjectSchema, type PattersonProjectInput } from "@patterson/core";

import {
  BUILTIN_AGENT_NAMES,
  buildConfigOp,
  configPath,
  MERGE_SEMANTICS,
  mergeConfigValue,
  OPENCODE_SCHEMA_URL,
  semanticsFor,
} from "../src/config.ts";
import { checkAgainstSchema, materializePatch, type RootSchema } from "./mini-schema.ts";

const SCHEMA_PATH = join(import.meta.dir, "..", "schema", "config.schema.json");
const schema = (await Bun.file(SCHEMA_PATH).json()) as RootSchema;

interface ConfigDefs {
  $defs: {
    Config: { properties: Record<string, { properties?: Record<string, unknown> }> };
    McpLocalConfig: { properties: Record<string, unknown>; required: string[] };
    McpRemoteConfig: { properties: Record<string, unknown>; required: string[] };
  };
}
const defs = (schema as unknown as ConfigDefs).$defs;

async function emptySnapshot() {
  return captureSnapshot("/nonexistent-root-for-snapshot", []);
}

function parse(input: PattersonProjectInput) {
  return PattersonProjectSchema.parse(input);
}

describe("hard-coded schema facts are locked to the vendored schema", () => {
  test("BUILTIN_AGENT_NAMES is exactly the schema's named agent properties", () => {
    const named = Object.keys(defs.Config.properties["agent"]?.properties ?? {});
    expect(([...BUILTIN_AGENT_NAMES] as string[]).toSorted()).toEqual(named.toSorted());
  });

  test("command.<name>.template is REQUIRED by the schema", () => {
    const command = defs.Config.properties["command"] as unknown as {
      additionalProperties: { required?: string[] };
    };
    expect(command.additionalProperties.required).toEqual(["template"]);
  });

  test("McpLocalConfig carries command: string[] plus cwd/environment/timeout", () => {
    expect(defs.McpLocalConfig.required.toSorted()).toEqual(["command", "type"]);
    for (const key of ["command", "cwd", "environment", "timeout"]) {
      expect(defs.McpLocalConfig.properties[key]).toBeDefined();
    }
  });

  test("McpRemoteConfig carries url plus headers/timeout", () => {
    expect(defs.McpRemoteConfig.required.toSorted()).toEqual(["type", "url"]);
    for (const key of ["url", "headers", "timeout"]) {
      expect(defs.McpRemoteConfig.properties[key]).toBeDefined();
    }
  });

  test("the config surface keys the emitter writes all exist on Config", () => {
    for (const key of ["$schema", "skills", "instructions", "model", "permission", "mcp", "agent", "command"]) {
      expect(defs.Config.properties[key]).toBeDefined();
    }
  });
});

describe("config compilation", () => {
  test("the config op is ALWAYS emitted with $schema + skills.paths (S3/D7)", async () => {
    const ir = parse({ version: 1, name: "empty" });
    const { op, gaps } = buildConfigOp(ir, await emptySnapshot(), []);
    expect(gaps).toEqual([]);
    const config = materializePatch(op.patch ?? []);
    expect(config).toEqual({
      $schema: OPENCODE_SCHEMA_URL,
      skills: { paths: [".agents/skills"] },
    });
    expect(checkAgainstSchema(config, schema, schema)).toEqual([]);
  });

  test("configPath prefers opencode.json; falls back to an existing opencode.jsonc", async () => {
    expect(configPath(await emptySnapshot())).toEqual({ path: "opencode.json", format: "json" });

    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join: joinPath } = await import("node:path");
    const dir = await mkdtemp(joinPath(tmpdir(), "patterson-opencode-config-"));
    await Bun.write(joinPath(dir, "opencode.jsonc"), "{}\n");
    const jsoncOnly = await captureSnapshot(dir, ["opencode.json", "opencode.jsonc"]);
    expect(configPath(jsoncOnly)).toEqual({ path: "opencode.jsonc", format: "jsonc" });

    await Bun.write(joinPath(dir, "opencode.json"), "{}\n");
    const both = await captureSnapshot(dir, ["opencode.json", "opencode.jsonc"]);
    expect(configPath(both)).toEqual({ path: "opencode.json", format: "json" });
    await rm(dir, { recursive: true, force: true });
  });

  test("the mini checker itself catches type and additionalProperties violations", () => {
    expect(checkAgainstSchema({ model: 42 }, schema, schema)).not.toEqual([]);
    expect(checkAgainstSchema({ notARealKey: true }, schema, schema)).not.toEqual([]);
    expect(
      checkAgainstSchema({ mcp: { x: { type: "local" } } }, schema, schema), // missing command
    ).not.toEqual([]);
    expect(
      checkAgainstSchema({ command: { x: { description: "no template" } } }, schema, schema),
    ).not.toEqual([]);
  });
});

describe("merge semantics", () => {
  test("table: shared arrays concat+dedupe, everything else overrides whole-value", () => {
    expect(MERGE_SEMANTICS["/skills/paths"]).toBe("concat-dedupe");
    expect(MERGE_SEMANTICS["/instructions"]).toBe("concat-dedupe");
    expect(MERGE_SEMANTICS["/$schema"]).toBe("override");
    expect(MERGE_SEMANTICS["/model"]).toBe("override");
    expect(MERGE_SEMANTICS["/permission"]).toBe("override");
    expect(MERGE_SEMANTICS["/mcp/*"]).toBe("override");
    expect(MERGE_SEMANTICS["/agent/*"]).toBe("override");
    expect(MERGE_SEMANTICS["/command/*"]).toBe("override");
  });

  test("semanticsFor resolves exact keys, wildcards, and defaults to override", () => {
    expect(semanticsFor("/skills/paths")).toBe("concat-dedupe");
    expect(semanticsFor("/mcp/docs")).toBe("override");
    expect(semanticsFor("/agent/reviewer")).toBe("override");
    expect(semanticsFor("/somewhere/else")).toBe("override");
  });

  test("concat-dedupe keeps hand-added entries and appends missing desired ones, deduped", () => {
    const merged = mergeConfigValue(
      "concat-dedupe",
      ["vendor/skills", ".agents/skills"],
      [".agents/skills"],
    );
    expect(merged).toEqual(["vendor/skills", ".agents/skills"]);
  });

  test("override replaces whole-value", () => {
    expect(mergeConfigValue("override", { a: 1 }, { b: 2 })).toEqual({ b: 2 });
  });
});
