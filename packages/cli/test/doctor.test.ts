/**
 * T025 — `doctor`: drift + config-validity findings via the check registry.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";

import { exitCodeFor, type PattersonProjectInput } from "@patterson/core";
import { renderPattersonConfig } from "../../core/src/scaffold.ts";

import { DoctorOutputSchema, makeDoctorCommand } from "../src/commands/doctor.ts";
import { makeSyncCommand } from "../src/commands/sync.ts";
import { exists, makeCtx, makeTempDir, readText, removeDir, stubDeps } from "./helpers.ts";

const dirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await makeTempDir();
  dirs.push(dir);
  return dir;
}
afterEach(async () => {
  while (dirs.length > 0) await removeDir(dirs.pop() as string);
});

const deps = stubDeps();
const doctor = makeDoctorCommand(deps);
const sync = makeSyncCommand(deps);

const config: PattersonProjectInput = {
  version: 1,
  name: "doctor-demo",
  targets: ["claude-code"],
  agents: [{ name: "helper", description: "test agent", prompt: "Assist." }],
};

async function seedSynced(root: string): Promise<void> {
  await Bun.write(join(root, "patterson.config.ts"), renderPattersonConfig(config));
  const result = await sync.run({ acceptGenerated: false, dryRun: false }, makeCtx(root));
  if (result.kind !== "ok") throw new Error(`seed sync failed: ${result.kind}`);
}

describe("doctor (T025)", () => {
  test("clean project: ok (exit 0), zero drift, --json shape parses", async () => {
    const root = await tempDir();
    await seedSynced(root);
    const result = await doctor.run({}, makeCtx(root));
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok");
    expect(exitCodeFor(result)).toBe(0);

    const report = DoctorOutputSchema.parse(result.value);
    expect(report.ok).toBe(true);
    expect(report.summary.error).toBe(0);
    expect(report.findings.some((f) => f.checkId === "config.valid")).toBe(true);
    expect(report.findings.some((f) => f.checkId === "emit.drift")).toBe(false);
  });

  test("hand-edited file: conflicts (exit 2) and the edit is untouched", async () => {
    const root = await tempDir();
    await seedSynced(root);
    await Bun.write(join(root, ".claude/agents/helper.md"), "# helper\n\nEDITED BY HAND\n");

    const result = await doctor.run({}, makeCtx(root));
    expect(result.kind).toBe("conflicts");
    if (result.kind !== "conflicts") throw new Error("expected conflicts");
    expect(exitCodeFor(result)).toBe(2);
    expect(result.conflicts[0]?.path).toBe(".claude/agents/helper.md");
    expect(await readText(root, ".claude/agents/helper.md")).toContain("EDITED BY HAND");
  });

  test("invalid config (unknown key): error (exit 1)", async () => {
    const root = await tempDir();
    const source = renderPattersonConfig(config).replace('"version": 1,', '"version": 1,\n  "skils": [],');
    await Bun.write(join(root, "patterson.config.ts"), source);
    const result = await doctor.run({}, makeCtx(root));
    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("expected error");
    expect(exitCodeFor(result)).toBe(1);
    expect(result.code).toBe("CONFIG_INVALID");
  });

  test("missing config: error CONFIG_NOT_FOUND", async () => {
    const root = await tempDir();
    const result = await doctor.run({}, makeCtx(root));
    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("expected error");
    expect(result.code).toBe("CONFIG_NOT_FOUND");
  });

  test("pending emission is a warning and doctor writes NOTHING (read-only)", async () => {
    const root = await tempDir();
    await Bun.write(join(root, "patterson.config.ts"), renderPattersonConfig(config));
    const result = await doctor.run({}, makeCtx(root));
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok");
    const report = DoctorOutputSchema.parse(result.value);
    expect(report.findings.some((f) => f.checkId === "emit.pending" && f.severity === "warn")).toBe(true);
    // Read-only: the dry-run pass must not have materialized anything.
    expect(await exists(root, "CLAUDE.md")).toBe(false);
    expect(await exists(root, ".patterson/emitted.json")).toBe(false);
  });
});
