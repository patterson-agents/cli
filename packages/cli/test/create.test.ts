/**
 * T024 — `create` skeleton command (non-interactive path only).
 */
import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";

import { exitCodeFor, PattersonProjectSchema } from "@patterson/core";

import { makeCreateCommand } from "../src/commands/create.ts";
import {
  exists,
  makeCtx,
  makeTempDir,
  readEmittedRecords,
  readText,
  removeDir,
  stubDeps,
} from "./helpers.ts";

const dirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await makeTempDir();
  dirs.push(dir);
  return dir;
}
afterEach(async () => {
  while (dirs.length > 0) await removeDir(dirs.pop() as string);
});

const create = makeCreateCommand(stubDeps());
const base = {
  yes: true,
  force: false,
  install: false,
  git: false,
  template: "skeleton",
  dryRun: false,
};

describe("create (T024)", () => {
  test("scaffolds a project non-interactively with {{name}} substitution", async () => {
    const root = await tempDir();
    const result = await create.run(
      { ...base, dir: root, name: "demo-app" },
      makeCtx(root),
    );
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok");
    expect(exitCodeFor(result)).toBe(0);

    // Template copied with substitution; `patterson` script present (T024).
    const pkg = JSON.parse(await readText(root, "package.json")) as {
      name: string;
      scripts: Record<string, string>;
    };
    expect(pkg.name).toBe("demo-app");
    expect(pkg.scripts["patterson"]).toBe("patterson");
    expect(await readText(root, "README.md")).toContain("# demo-app");
    expect(await readText(root, "src/index.ts")).toContain("demo-app");

    // Typed authoring config, runtime-importable and IR-valid.
    const configSource = await readText(root, "patterson.config.ts");
    expect(configSource).toContain('import type { PattersonProjectInput } from "@patterson/core"');
    const configModule = (await import(join(root, "patterson.config.ts"))) as { default: unknown };
    const ir = PattersonProjectSchema.parse(configModule.default);
    expect(ir.name).toBe("demo-app");
    expect(ir.targets).toEqual(["claude-code"]);

    // Emitter output applied through the engine, with provenance.
    expect(await readText(root, "CLAUDE.md")).toContain("Managed by patterson.");
    const records = await readEmittedRecords(root);
    expect(records.has("CLAUDE.md")).toBe(true);

    // SETUP.md rendered (instruct tier via the stub emitter).
    expect(await exists(root, "SETUP.md")).toBe(true);
    expect(result.value.setupPath).toBe("SETUP.md");
    expect(result.value.scaffolded).toContain("patterson.config.ts");
    expect(result.value.installed).toBe(false);
    expect(result.value.gitInitialized).toBe(false);
  });

  test("returns decision-required without --yes (exit 3 non-interactive)", async () => {
    const root = await tempDir();
    const result = await create.run(
      { ...base, yes: false, dir: root },
      makeCtx(root),
    );
    expect(result.kind).toBe("decision-required");
    if (result.kind !== "decision-required") throw new Error("expected decision-required");
    expect(exitCodeFor(result)).toBe(3);
    expect(result.decision.options.map((o) => o.flag)).toContain("--yes");
    expect(await exists(root, "package.json")).toBe(false);
  });

  test("refuses a non-empty directory without --force, listing what would be touched", async () => {
    const root = await tempDir();
    await Bun.write(join(root, "existing.txt"), "hello");
    const result = await create.run({ ...base, dir: root }, makeCtx(root));
    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("expected error");
    expect(exitCodeFor(result)).toBe(1);
    expect(result.code).toBe("DIR_NOT_EMPTY");
    expect(result.message).toContain("package.json");
    expect(result.message).toContain("patterson.config.ts");
    expect(result.hint).toContain("--force");
    expect(await exists(root, "package.json")).toBe(false);
  });

  test("--force proceeds in a non-empty directory and preserves pre-existing prose", async () => {
    const root = await tempDir();
    await Bun.write(join(root, "CLAUDE.md"), "# My own rules\n\nKeep these.\n");
    const result = await create.run(
      { ...base, dir: root, name: "forced", force: true },
      makeCtx(root),
    );
    expect(result.kind).toBe("ok");
    const claudeMd = await readText(root, "CLAUDE.md");
    // Merge tier: sentinel appended, hand-written prose untouched.
    expect(claudeMd).toContain("# My own rules");
    expect(claudeMd).toContain("Managed by patterson.");
  });

  test("rejects an unknown template", async () => {
    const root = await tempDir();
    const result = await create.run(
      { ...base, dir: root, template: "docs-site" },
      makeCtx(root),
    );
    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("expected error");
    expect(result.code).toBe("UNKNOWN_TEMPLATE");
    expect(result.message).toContain("skeleton");
  });

  test("rejects agent targets with no emitter in this phase", async () => {
    const root = await tempDir();
    const result = await create.run(
      { ...base, dir: root, agents: ["copilot"] },
      makeCtx(root),
    );
    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("expected error");
    expect(result.code).toBe("EMITTER_UNAVAILABLE");
    expect(result.message).toContain("copilot");
  });

  test("accepts wizard-shaped args (targets alias, no dir)", async () => {
    const root = await tempDir();
    const result = await create.run(
      {
        name: "wizard-made",
        template: "skeleton",
        targets: ["claude-code"],
        yes: true,
        install: false,
        git: false,
      } as Parameters<typeof create.run>[0],
      makeCtx(root),
    );
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok");
    expect(result.value.root).toBe(root);
    const pkg = JSON.parse(await readText(root, "package.json")) as { name: string };
    expect(pkg.name).toBe("wizard-made");
  });

  test("git init runs unless --no-git", async () => {
    const root = await tempDir();
    const result = await create.run(
      { ...base, dir: root, git: true },
      makeCtx(root),
    );
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok");
    expect(result.value.gitInitialized).toBe(true);
    expect(await exists(root, ".git/HEAD")).toBe(true);
  });
});
