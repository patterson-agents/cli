/**
 * Spec 003 — site-template generators (`new starlight-site`, `new vitepress-site`).
 *
 * Three properties this suite exists to lock:
 *
 * 1. **Vendored, never fetched.** The templates ship as package assets
 *    (Constitution: "Embedded/pre-selected content installs from vendored
 *    package assets, never the network"). The provenance digest recorded in
 *    `assets/site-templates/_SOURCES.md` must equal the digest computed from
 *    the bytes on disk — the same role a golden fixture plays for an emitter.
 * 2. **Byte-faithful copy.** Everything except `package.json`'s `name` lands
 *    unchanged, so the scaffold is the install-verified template, version pins
 *    and committed `bun.lock` included.
 * 3. **Never destructive.** `bun create` replaces the contents of an existing
 *    directory without a prompt; these generators refuse a non-empty target and
 *    write nothing at all. That refusal is the headline safety difference.
 *
 * Deliberately offline: no `bun install` of a scaffolded site here. The install
 * verification belongs to the canonical templates upstream, and Astro pulls
 * platform-native optional dependencies that have no place in this gate.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  ALL_GENERATORS,
  renderPlanSpec,
  runGenerator,
  SITE_TEMPLATE_PROVENANCE,
  SITE_TEMPLATES_DIR,
  siteTemplateDigest,
  siteTemplateFiles,
  starlightSiteGenerator,
  vitepressSiteGenerator,
} from "../src/index.ts";

const dirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "patterson-site-"));
  dirs.push(dir);
  return dir;
}
afterEach(async () => {
  while (dirs.length > 0) await rm(dirs.pop() as string, { recursive: true, force: true });
});

const CASES = [
  { generator: starlightSiteGenerator, slug: "starlight", kind: "starlight-site" },
  { generator: vitepressSiteGenerator, slug: "vitepress", kind: "vitepress-site" },
] as const;

describe("vendored assets + provenance", () => {
  test("both templates are registered and vendored", () => {
    expect(Object.keys(SITE_TEMPLATE_PROVENANCE.templates).toSorted()).toEqual([
      "starlight",
      "vitepress",
    ]);
    for (const { slug } of CASES) {
      expect(siteTemplateFiles(slug).length).toBeGreaterThan(0);
    }
  });

  test("recorded digest equals the digest of the bytes on disk", () => {
    for (const { slug } of CASES) {
      const record = SITE_TEMPLATE_PROVENANCE.templates[slug];
      expect(record).toBeDefined();
      expect(siteTemplateDigest(slug)).toBe(record?.sha256 ?? "");
      expect(siteTemplateFiles(slug)).toHaveLength(record?.fileCount ?? -1);
    }
  });

  test("_SOURCES.md records the same digests, commit, and canonical paths", async () => {
    const sources = await Bun.file(join(SITE_TEMPLATES_DIR, "_SOURCES.md")).text();
    expect(sources).toContain(SITE_TEMPLATE_PROVENANCE.sourceCommit);
    expect(sources).toContain(SITE_TEMPLATE_PROVENANCE.vendoredAt);
    for (const { slug } of CASES) {
      expect(sources).toContain(SITE_TEMPLATE_PROVENANCE.templates[slug]?.sha256 ?? "");
      expect(sources).toContain(SITE_TEMPLATE_PROVENANCE.templates[slug]?.canonicalPath ?? "");
    }
  });

  test("no dependencies, build output, or caches were vendored", () => {
    for (const { slug } of CASES) {
      for (const file of siteTemplateFiles(slug)) {
        expect(file.path).not.toContain("node_modules/");
        expect(file.path).not.toContain(".vitepress/cache/");
        expect(file.path).not.toContain(".vitepress/dist/");
        expect(file.path).not.toContain(".astro/");
        expect(file.path.startsWith("dist/")).toBe(false);
      }
    }
  });

  test("the provenance note itself is never part of a scaffold", () => {
    for (const { generator } of CASES) {
      for (const file of generator.generate("my-docs").files) {
        expect(file.path).not.toContain("_SOURCES.md");
      }
    }
  });
});

describe("scaffolding is a byte-faithful copy", () => {
  test.each(CASES.map((entry) => [entry.kind, entry] as const))(
    "%s copies every vendored file unchanged except package.json",
    async (_kind, { generator, slug }) => {
      const root = await tempDir();
      const result = await runGenerator(generator, "my-docs", root);
      const vendored = siteTemplateFiles(slug);

      expect(result.blocked).toBe(false);
      expect(result.findings).toEqual([]);
      expect(result.written).toEqual(vendored.map((file) => `my-docs/${file.path}`));

      for (const file of vendored) {
        if (file.path === "package.json") continue;
        expect(await Bun.file(join(root, "my-docs", file.path)).text()).toBe(file.content);
      }
      // The committed lockfile is part of the install-verified template.
      expect(result.written).toContain("my-docs/bun.lock");
    },
  );

  test.each(CASES.map((entry) => [entry.kind, entry] as const))(
    "%s rewrites package.json name to the target directory and leaves specs intact",
    async (_kind, { generator, slug }) => {
      const root = await tempDir();
      await runGenerator(generator, "my-docs", root);

      const vendoredPkg = JSON.parse(
        siteTemplateFiles(slug).find((file) => file.path === "package.json")?.content ?? "{}",
      ) as Record<string, unknown>;
      const landed = (await Bun.file(join(root, "my-docs/package.json")).json()) as Record<
        string,
        unknown
      >;

      expect(landed["name"]).toBe("my-docs");
      expect(vendoredPkg["name"]).not.toBe("my-docs");
      // Everything but the name is carried over verbatim.
      const restored: Record<string, unknown> = { ...landed, name: vendoredPkg["name"] };
      expect(restored).toEqual(vendoredPkg);
    },
  );

  test("starlight keeps the exact astro + starlight pins", async () => {
    const root = await tempDir();
    await runGenerator(starlightSiteGenerator, "my-docs", root);
    const pkg = (await Bun.file(join(root, "my-docs/package.json")).json()) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies["astro"]).toBe("7.1.5");
    expect(pkg.dependencies["@astrojs/starlight"]).toBe("0.41.5");
  });

  test("next steps name install and the template's own dev script", () => {
    expect(starlightSiteGenerator.generate("my-docs").notes.join("\n")).toContain("bun run dev");
    expect(vitepressSiteGenerator.generate("my-docs").notes.join("\n")).toContain(
      "bun run docs:dev",
    );
    for (const { generator } of CASES) {
      expect(generator.generate("my-docs").notes.join("\n")).toContain("bun install");
    }
  });
});

describe("never destructive (the bun create difference)", () => {
  test.each(CASES.map((entry) => [entry.kind, entry] as const))(
    "%s refuses a target holding a file, and writes nothing",
    async (_kind, { generator }) => {
      const root = await tempDir();
      await Bun.write(join(root, "my-docs/keep-me.txt"), "hand-written\n");

      const result = await runGenerator(generator, "my-docs", root);
      expect(result.blocked).toBe(true);
      expect(result.written).toEqual([]);
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0]?.severity).toBe("error");
      expect(result.findings[0]?.checkId).toBe("generators.site.target-not-empty");
      expect(result.findings[0]?.path).toBe("my-docs");
      // The pre-existing file survives untouched, and no template file landed.
      expect(await Bun.file(join(root, "my-docs/keep-me.txt")).text()).toBe("hand-written\n");
      expect(await Bun.file(join(root, "my-docs/package.json")).exists()).toBe(false);
    },
  );

  test("a dotfile also makes a target non-empty", async () => {
    const root = await tempDir();
    await Bun.write(join(root, "my-docs/.env"), "TOKEN=placeholder\n");
    const result = await runGenerator(starlightSiteGenerator, "my-docs", root);
    expect(result.written).toEqual([]);
    expect(result.findings[0]?.checkId).toBe("generators.site.target-not-empty");
  });

  test("an existing but empty target is accepted", async () => {
    const root = await tempDir();
    await mkdir(join(root, "my-docs"), { recursive: true });
    const result = await runGenerator(starlightSiteGenerator, "my-docs", root);
    expect(result.findings).toEqual([]);
    expect(result.written.length).toBeGreaterThan(0);
  });
});

describe("post-validation", () => {
  test("catches a package.json whose pins were edited after the copy", async () => {
    const root = await tempDir();
    await runGenerator(starlightSiteGenerator, "my-docs", root);
    const path = join(root, "my-docs/package.json");
    await Bun.write(path, (await Bun.file(path).text()).replace('"7.1.5"', '"latest"'));

    const findings = await starlightSiteGenerator.postValidate?.(root, "my-docs");
    expect(findings?.[0]?.severity).toBe("error");
    expect(findings?.[0]?.checkId).toBe("generators.site.pins");
    expect(findings?.[0]?.message).toContain("astro");
  });

  test("catches a package.json that no longer parses", async () => {
    const root = await tempDir();
    await runGenerator(vitepressSiteGenerator, "my-docs", root);
    await Bun.write(join(root, "my-docs/package.json"), "{ not json");
    const findings = await vitepressSiteGenerator.postValidate?.(root, "my-docs");
    expect(findings?.[0]?.checkId).toBe("generators.site.manifest");
  });

  test("catches a name that drifts from the target directory", async () => {
    const root = await tempDir();
    await runGenerator(vitepressSiteGenerator, "my-docs", root);
    const path = join(root, "my-docs/package.json");
    await Bun.write(path, (await Bun.file(path).text()).replace('"my-docs"', '"other"'));
    const findings = await vitepressSiteGenerator.postValidate?.(root, "my-docs");
    expect(findings?.[0]?.checkId).toBe("generators.site.manifest");
    expect(findings?.[0]?.message).toContain("my-docs");
  });
});

describe("registry surface", () => {
  test("both kinds are part of ALL_GENERATORS", () => {
    const kinds = ALL_GENERATORS.map((generator) => generator.kind);
    expect(kinds).toContain("starlight-site");
    expect(kinds).toContain("vitepress-site");
  });

  test("--plan renders an interview spec instead of a site", () => {
    for (const { generator, kind } of CASES) {
      const spec = renderPlanSpec(generator, "my-docs");
      expect(spec).toContain(`# SPEC — ${kind} "my-docs"`);
      expect(spec).toContain("--plan");
    }
  });
});
