/**
 * T025 — `check`: coverage table from emitter gaps.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";

import { exitCodeFor, type PattersonProjectInput } from "@patterson/core";
import { renderPattersonConfig } from "../../core/src/scaffold.ts";

import { CheckOutputSchema, makeCheckCommand } from "../src/commands/check.ts";
import { makeCtx, makeTempDir, removeDir, stubDeps } from "./helpers.ts";

const dirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await makeTempDir();
  dirs.push(dir);
  return dir;
}
afterEach(async () => {
  while (dirs.length > 0) await removeDir(dirs.pop() as string);
});

const check = makeCheckCommand(stubDeps());

const config: PattersonProjectInput = {
  version: 1,
  name: "check-demo",
  targets: ["claude-code"],
  instructions: [{ id: "style", body: "Be terse.", reach: "universal" }],
  agents: [{ name: "helper", description: "test agent", prompt: "Assist." }],
  mcp: [
    {
      name: "docs",
      transport: { kind: "stdio", exec: { argv: ["bunx", "docs-mcp"] } },
      scope: "project",
    },
  ],
};

describe("check (T025)", () => {
  test("covered entities for a supported target; --json shape parses", async () => {
    const root = await tempDir();
    await Bun.write(join(root, "patterson.config.ts"), renderPattersonConfig(config));
    const result = await check.run({}, makeCtx(root));
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok");
    expect(exitCodeFor(result)).toBe(0);

    const value = CheckOutputSchema.parse(result.value);
    const ids = value.rows.map((row) => row.entityId);
    expect(ids).toContain("instruction:style");
    expect(ids).toContain("agent:helper");
    expect(ids).toContain("mcp:docs");
    expect(value.rows.every((row) => row.targetId === "claude-code")).toBe(true);
    expect(value.summary.gaps).toBe(0);
    expect(value.summary.covered).toBe(value.rows.length);
  });

  test("a target with no emitter gaps every entity", async () => {
    const root = await tempDir();
    await Bun.write(
      join(root, "patterson.config.ts"),
      renderPattersonConfig({ ...config, targets: ["claude-code", "copilot"] }),
    );
    const result = await check.run({}, makeCtx(root));
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok");
    const value = CheckOutputSchema.parse(result.value);
    const copilotRows = value.rows.filter((row) => row.targetId === "copilot");
    expect(copilotRows.length).toBeGreaterThan(0);
    expect(copilotRows.every((row) => row.status === "gap")).toBe(true);
    expect(value.summary.gaps).toBe(copilotRows.length);
  });

  test("missing config is an error", async () => {
    const root = await tempDir();
    const result = await check.run({}, makeCtx(root));
    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("expected error");
    expect(result.code).toBe("CONFIG_NOT_FOUND");
  });
});
