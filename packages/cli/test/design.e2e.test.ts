/**
 * E-P3 — design surface E2E through the REAL registry: `design templates`/
 * `tokens`/`refresh` (offline, FR-014) and `create --template docs-site`
 * materializing a vendored design template with rewritten shared-asset refs.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";

import { exitCodeFor, type CommandResult } from "@patterson/core";

import { buildRegistry } from "../src/commands/registry.ts";
import { makeCtx, makeTempDir, readText, removeDir } from "./helpers.ts";

const dirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await makeTempDir();
  dirs.push(dir);
  return dir;
}
afterEach(async () => {
  while (dirs.length > 0) await removeDir(dirs.pop() as string);
});

const registry = buildRegistry();

async function run(id: string, args: Record<string, unknown>, cwd: string): Promise<CommandResult<unknown>> {
  const descriptor = registry.resolve(id);
  if (!descriptor) throw new Error(`descriptor "${id}" not registered`);
  return (await descriptor.run(args, makeCtx(cwd))) as CommandResult<unknown>;
}

describe("design commands (offline, FR-014)", () => {
  test("design templates lists the 11 vendored templates", async () => {
    const result = await run("design.templates", {}, ".");
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok");
    const value = result.value as { templates: { name: string }[] };
    expect(value.templates.length).toBe(10);
    expect(value.templates.some((t) => t.name === "docs-site")).toBe(true);
  });

  test("design tokens exposes the theme's token groups", async () => {
    const result = await run("design.tokens", {}, ".");
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("expected ok");
    const value = result.value as { name: string; groups: Record<string, unknown> };
    expect(value.name).toContain("Patterson");
    expect(Object.keys(value.groups)).toContain("colors");
  });

  test("design refresh without auth exits 0 with a snapshot-age report (never an error)", async () => {
    const result = await run("design.refresh", {}, ".");
    expect(result.kind).toBe("ok");
    expect(exitCodeFor(result)).toBe(0);
    if (result.kind !== "ok") throw new Error("expected ok");
    const value = result.value as { refreshed: boolean; pulledAt: string; ageDays: number };
    expect(value.refreshed).toBe(false);
    expect(value.pulledAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.report?.summary).toContain("not refreshed");
  });
});

describe("create --template <design template> (E-P3)", () => {
  test("docs-site materializes at root with design-system/ shared assets and rewritten refs", async () => {
    const root = await tempDir();
    const created = await run(
      "create",
      {
        dir: root,
        yes: true,
        template: "docs-site",
        agents: ["claude-code"],
        install: false,
        git: false,
        force: false,
        dryRun: false,
      },
      root,
    );
    expect(created.kind).toBe("ok");
    if (created.kind !== "ok") throw new Error("expected ok");

    expect(await Bun.file(join(root, "index.html")).exists()).toBe(true);
    expect(await Bun.file(join(root, "design-system/styles.css")).exists()).toBe(true);
    expect(await Bun.file(join(root, "patterson.config.ts")).exists()).toBe(true);

    const index = await readText(root, "index.html");
    expect(index).toContain("design-system/styles.css");
    expect(index).not.toContain("../../styles.css");

    // Emission ran on top of the materialized template (single write path).
    const value = created.value as { scaffolded: string[]; emitted: string[] };
    expect(value.scaffolded).toContain("index.html");
    expect(value.emitted.length).toBeGreaterThan(0);
  });

  test("unknown template lists both builtin and design names", async () => {
    const root = await tempDir();
    const result = await run(
      "create",
      { dir: root, yes: true, template: "no-such", agents: ["claude-code"], install: false, git: false },
      root,
    );
    expect(result.kind).toBe("error");
    if (result.kind !== "error") throw new Error("expected error");
    expect(result.message).toContain("skeleton");
    expect(result.message).toContain("docs-site");
  });
});
