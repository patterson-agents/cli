/**
 * E-P5 — generator engine + six generators (verification 8):
 * - `new skill` is spec-valid (dir == frontmatter name, C6);
 * - `new mcp-server <name>` scaffolds a project whose server passes the
 *   SHARED handshake validator (initialize/tools-list/tools-call);
 * - plan mode renders an interview SPEC instead of scaffolding.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  ALL_GENERATORS,
  frontmatterName,
  marketplaceGenerator,
  mcpServerGenerator,
  renderPlanSpec,
  runGenerator,
  skillGenerator,
  validateMcpHandshake,
} from "../src/index.ts";

const dirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "patterson-gen-"));
  dirs.push(dir);
  return dir;
}
afterEach(async () => {
  while (dirs.length > 0) await rm(dirs.pop() as string, { recursive: true, force: true });
});

describe("engine + skill generator (C6)", () => {
  test("skill scaffold is spec-valid: dir name == frontmatter name", async () => {
    const root = await tempDir();
    const result = await runGenerator(skillGenerator, "review-helper", root);
    expect(result.written).toEqual([".agents/skills/review-helper/SKILL.md"]);
    expect(result.findings).toEqual([]);

    const content = await Bun.file(join(root, ".agents/skills/review-helper/SKILL.md")).text();
    expect(frontmatterName(content)).toBe("review-helper");
  });

  test("post-validation catches a name mismatch", async () => {
    const root = await tempDir();
    await runGenerator(skillGenerator, "good-name", root);
    // Sabotage the frontmatter, then re-validate.
    const path = join(root, ".agents/skills/good-name/SKILL.md");
    await Bun.write(path, (await Bun.file(path).text()).replace("name: good-name", "name: wrong"));
    const findings = await skillGenerator.postValidate?.(root, "good-name");
    expect(findings?.[0]?.severity).toBe("error");
    expect(findings?.[0]?.message).toContain("C6");
  });
});

describe("every generator", () => {
  test("produces deterministic files and a plan spec", async () => {
    for (const generator of ALL_GENERATORS) {
      const first = generator.generate("demo-thing");
      const second = generator.generate("demo-thing");
      expect(first).toEqual(second);
      expect(first.files.length).toBeGreaterThan(0);
      const spec = renderPlanSpec(generator, "demo-thing");
      expect(spec).toContain(`# SPEC — ${generator.kind} "demo-thing"`);
      expect(spec).toContain("--plan");
    }
  });

  test("marketplace generator emits valid JSON at the in-repo path", async () => {
    const root = await tempDir();
    const result = await runGenerator(marketplaceGenerator, "dental-tools", root);
    expect(result.written).toEqual([
      ".claude-plugin/marketplace.json",
      ".github/plugin/marketplace.json",
    ]);
    const parsed = JSON.parse(await Bun.file(join(root, ".github/plugin/marketplace.json")).text());
    expect(parsed.name).toBe("dental-tools");
    expect(Array.isArray(parsed.plugins)).toBe(true);
    // Claude resolves plugin sources relative to the marketplace root and
    // requires the "./" prefix — a bare "plugins/x" is not accepted.
    expect(parsed.plugins[0].source.startsWith("./")).toBe(true);
  });

  test("marketplace generator emits BOTH manifests byte-identically", async () => {
    const root = await tempDir();
    await runGenerator(marketplaceGenerator, "dental-tools", root);
    // Primary source for the dual-path convention: githubnext/ado-aw ships both
    // files with identical bytes (sha256 f7010cf3…, verified against the
    // vendored copy) — cross-vendor support is a COPY, not a transform.
    const claude = await Bun.file(join(root, ".claude-plugin/marketplace.json")).arrayBuffer();
    const github = await Bun.file(join(root, ".github/plugin/marketplace.json")).arrayBuffer();
    expect(new Uint8Array(claude)).toEqual(new Uint8Array(github));
  });

  test("marketplace generator output is byte-identical across the two paths in memory", () => {
    const output = marketplaceGenerator.generate("dental-tools");
    const paths = output.files.map((file) => file.path).toSorted();
    expect(paths).toEqual([".claude-plugin/marketplace.json", ".github/plugin/marketplace.json"]);
    const contents = new Set(output.files.map((file) => file.content));
    expect(contents.size).toBe(1);
  });
});

describe("mcp-server generator + shared handshake validator (verification 8)", () => {
  test("scaffolded server installs and passes the full handshake", async () => {
    const root = await tempDir();
    await runGenerator(mcpServerGenerator, "demo-server", root);
    const project = join(root, "demo-server");

    const install = Bun.spawn(["bun", "install"], { cwd: project, stdout: "ignore", stderr: "pipe" });
    expect(await install.exited).toBe(0);

    const report = await validateMcpHandshake(["bun", "src/index.ts"], {
      cwd: project,
      call: { tool: "add", args: { a: 2, b: 3 } },
    });
    expect(report.steps).toEqual([
      { step: "spawn", ok: true },
      { step: "initialize", ok: true, detail: "protocol 2025-11-25" },
      { step: "tools/list", ok: true, detail: "2 tool(s)" },
      { step: "tools/call", ok: true, detail: "add" },
    ]);
    expect(report.ok).toBe(true);
    expect(report.tools.toSorted()).toEqual(["add", "echo"]);
    expect(report.serverName).toBe("demo-server");

    // The generated project's own self-test passes too.
    const selfTest = Bun.spawn(["bun", "test"], { cwd: project, stdout: "ignore", stderr: "pipe" });
    expect(await selfTest.exited).toBe(0);
  }, 60_000);

  test("validator reports a broken server structurally instead of throwing", async () => {
    const root = await tempDir();
    await Bun.write(join(root, "broken.ts"), "console.log('not json-rpc'); await Bun.sleep(30_000);");
    const report = await validateMcpHandshake(["bun", "broken.ts"], { cwd: root, timeoutMs: 1_500 });
    expect(report.ok).toBe(false);
    expect(report.steps.find((step) => step.step === "initialize")?.ok).toBe(false);
  });
});
