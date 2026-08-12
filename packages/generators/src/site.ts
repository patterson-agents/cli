/**
 * Site-template generators (spec 003): `patterson new starlight-site <dir>`
 * and `patterson new vitepress-site <dir>`.
 *
 * These two differ from the other generators in where their content comes
 * from. The rest render inline templates; these copy a *vendored* runnable
 * site — `assets/site-templates/{starlight,vitepress}/` — byte for byte,
 * committed `bun.lock` and exact version pins included. Nothing is fetched
 * (Constitution: embedded content installs from vendored package assets,
 * never the network), and the canonical home of those bytes is recorded in
 * `assets/site-templates/_SOURCES.md`.
 *
 * The one deliberate behavioral difference from `bun create`, which these
 * generators supersede: **a non-empty target is refused**. `bun create`
 * replaces an existing directory's contents without a prompt; `preflight`
 * here fails before a single byte is written.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { directoryEntries, type Finding, type ScaffoldFile } from "@patterson/core";

import type { Generator, GeneratorKind } from "./engine.ts";

/** Absolute path of the vendored site-template assets. */
export const SITE_TEMPLATES_DIR = join(import.meta.dir, "..", "assets", "site-templates");

// ---------------------------------------------------------------------------
// Provenance (the record `_SOURCES.md` renders in prose)
// ---------------------------------------------------------------------------

export interface SiteTemplateRecord {
  /** Path inside the canonical repository this copy was taken from. */
  canonicalPath: string;
  fileCount: number;
  /** Digest of the vendored bytes; see `siteTemplateDigest`. */
  sha256: string;
}

export interface SiteTemplateProvenance {
  /** Canonical home — the copy in this package is downstream of it. */
  sourceRepo: string;
  /** Commit of `sourceRepo` these bytes were taken from. */
  sourceCommit: string;
  /** Date the copy was taken (ISO date). */
  vendoredAt: string;
  /** One-way: canonical → vendored. Never edit the copy in place. */
  syncDirection: string;
  templates: Record<string, SiteTemplateRecord>;
}

/**
 * Recorded provenance for the vendored bytes. `siteTemplateDigest` recomputes
 * the digests from disk and the test suite asserts they still match, so an
 * accidental edit to a vendored file fails the gate the way a stale golden
 * fixture does. Update this record and `_SOURCES.md` together.
 */
export const SITE_TEMPLATE_PROVENANCE: SiteTemplateProvenance = {
  sourceRepo: "github.com/patterson-agents/design-plugins",
  sourceCommit: "dd0b84b22d4cee3076456c07e60cbb9f2274e4da",
  vendoredAt: "2026-08-12",
  syncDirection: "design-plugins (canonical) → cli (vendored copy); never the reverse",
  templates: {
    starlight: {
      canonicalPath: "plugins/patterson-starlight/ds/templates/starlight",
      fileCount: 18,
      sha256: "7892c997356ad0fcd23cd2d7adabe33bdd527d6bfde16019464782c0cb06ec67",
    },
    vitepress: {
      canonicalPath: "plugins/patterson-vitepress/ds/templates/vitepress",
      fileCount: 15,
      sha256: "741166381d009876909eb72d29d33ab5174a99bcf809b566c53443eb9597c675",
    },
  },
};

// ---------------------------------------------------------------------------
// Reading the vendored bytes
// ---------------------------------------------------------------------------

function comparePaths(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Every file under `dir`, recursively, as root-relative POSIX paths. */
function walk(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walk(join(dir, entry.name), rel));
    else out.push(rel);
  }
  return out;
}

const fileCache = new Map<string, ScaffoldFile[]>();

/**
 * The vendored files of one template, path-sorted. Read synchronously so
 * `Generator.generate` stays a pure synchronous function of `name`
 * (Constitution I: re-running it produces identical output).
 */
export function siteTemplateFiles(slug: string): ScaffoldFile[] {
  const cached = fileCache.get(slug);
  if (cached !== undefined) return cached;
  const dir = join(SITE_TEMPLATES_DIR, slug);
  const files = walk(dir)
    .toSorted(comparePaths)
    .map((path) => ({ path, content: readFileSync(join(dir, path), "utf8") }));
  fileCache.set(slug, files);
  return files;
}

function sha256Hex(data: string): string {
  return new Bun.CryptoHasher("sha256").update(data, "utf8").digest("hex");
}

/**
 * Content digest of a vendored template: sha256 over the manifest line
 * `<sha256 of file>  <path>\n` for every file, path-sorted. Independent of
 * filesystem enumeration order and stable across checkouts.
 */
export function siteTemplateDigest(slug: string): string {
  const manifest = siteTemplateFiles(slug)
    .map((file) => `${sha256Hex(file.content)}  ${file.path}\n`)
    .join("");
  return sha256Hex(manifest);
}

/** Reset the vendored-file cache (tests only). */
export function resetSiteTemplateCache(): void {
  fileCache.clear();
}

// ---------------------------------------------------------------------------
// The generators
// ---------------------------------------------------------------------------

interface SiteTemplateSpec {
  kind: GeneratorKind;
  /** Vendored asset folder, and the key in SITE_TEMPLATE_PROVENANCE.templates. */
  slug: string;
  /** Framework name as it appears in the generated next-steps note. */
  framework: string;
  summary: string;
  /** The template's own dev script — starlight uses `dev`, vitepress `docs:dev`. */
  devScript: string;
}

const PACKAGE_JSON = "package.json";

function vendoredPackageJson(slug: string): Record<string, unknown> {
  const raw = siteTemplateFiles(slug).find((file) => file.path === PACKAGE_JSON)?.content;
  if (raw === undefined) {
    throw new Error(`Vendored site template "${slug}" has no ${PACKAGE_JSON}.`);
  }
  return JSON.parse(raw) as Record<string, unknown>;
}

/**
 * The template's `package.json` with `name` rewritten to the target directory.
 * `name` already exists in the object, so assignment keeps its position and the
 * re-serialized file differs from the vendored one on exactly that one line.
 */
function renamedPackageJson(slug: string, name: string): string {
  return `${JSON.stringify({ ...vendoredPackageJson(slug), name }, null, 2)}\n`;
}

function dependencySpecs(pkg: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of ["dependencies", "devDependencies"]) {
    const block = pkg[key];
    if (block === null || typeof block !== "object") continue;
    for (const [dep, spec] of Object.entries(block as Record<string, unknown>)) {
      out[dep] = String(spec);
    }
  }
  return out;
}

function makeSiteGenerator(spec: SiteTemplateSpec): Generator {
  const record = SITE_TEMPLATE_PROVENANCE.templates[spec.slug];
  return {
    kind: spec.kind,
    summary: spec.summary,
    generate(name) {
      const files = siteTemplateFiles(spec.slug).map((file) => ({
        path: `${name}/${file.path}`,
        content: file.path === PACKAGE_JSON ? renamedPackageJson(spec.slug, name) : file.content,
      }));
      return {
        files,
        notes: [
          "Next steps:",
          `  cd ${name}`,
          "  bun install        # resolves from the committed bun.lock — the install-verified tree",
          `  bun run ${spec.devScript}`,
          `The ${spec.framework} template is vendored, not fetched: a byte copy of`,
          `${SITE_TEMPLATE_PROVENANCE.sourceRepo}/${record?.canonicalPath ?? spec.slug}`,
          `at ${SITE_TEMPLATE_PROVENANCE.sourceCommit.slice(0, 12)} — version pins and lockfile included.`,
          'Everything but package.json\'s "name" is verbatim, so upstream fixes apply cleanly.',
        ],
      };
    },
    planSections(name) {
      return [
        "## Audience",
        `- Who reads the ${name} site, and what do they need to accomplish?`,
        "",
        "## Information architecture",
        "- Which top-level sections (guides, reference, …), and what goes in each?",
        "",
        "## Branding",
        "- Site title, tagline, and deployed origin — anything beyond the Patterson defaults?",
        "",
        "## Publishing",
        "- Where does the built site deploy, and who owns the pipeline?",
      ];
    },
    /**
     * NON-DESTRUCTIVE by construction. `bun create` replaces the contents of
     * an existing directory without asking; this refuses. There is deliberately
     * no `--force` escape: the whole target is template content, so overwriting
     * could only ever destroy someone's work.
     */
    async preflight(root, name) {
      const existing = await directoryEntries(join(root, name));
      if (existing.length === 0) return [];
      const shown = existing.slice(0, 5).join(", ");
      return [
        {
          checkId: "generators.site.target-not-empty",
          severity: "error",
          message:
            `Target "${name}" is not empty (${existing.length} entr${existing.length === 1 ? "y" : "ies"}: ` +
            `${shown}${existing.length > 5 ? ", …" : ""}). Site generators never overwrite an ` +
            "existing directory — unlike `bun create`, which replaces its contents without a " +
            "prompt. Nothing was written.",
          path: name,
          fix: `Choose a directory that does not exist yet, or empty "${name}" first.`,
        },
      ];
    },
    async postValidate(root, name) {
      const findings: Finding[] = [];
      const manifestPath = `${name}/${PACKAGE_JSON}`;
      const raw = await Bun.file(join(root, manifestPath)).text();
      let landed: Record<string, unknown>;
      try {
        landed = JSON.parse(raw) as Record<string, unknown>;
      } catch (cause) {
        findings.push({
          checkId: "generators.site.manifest",
          severity: "error",
          message: `${PACKAGE_JSON} is not valid JSON: ${cause instanceof Error ? cause.message : String(cause)}`,
          path: manifestPath,
        });
        return findings;
      }

      if (landed["name"] !== name) {
        findings.push({
          checkId: "generators.site.manifest",
          severity: "error",
          message: `${PACKAGE_JSON} name "${String(landed["name"] ?? "(missing)")}" must equal the target directory name "${name}".`,
          path: manifestPath,
        });
      }

      // Pins are the point of a vendored, install-verified template: a copy
      // that silently loosened a version would not be the tree that was tested.
      const expected = dependencySpecs(vendoredPackageJson(spec.slug));
      const actual = dependencySpecs(landed);
      for (const [dep, want] of Object.entries(expected)) {
        const got = actual[dep];
        if (got === want) continue;
        findings.push({
          checkId: "generators.site.pins",
          severity: "error",
          message: `Dependency "${dep}" must keep the vendored spec "${want}" (found "${got ?? "(missing)"}").`,
          path: manifestPath,
        });
      }
      return findings;
    },
  };
}

export const starlightSiteGenerator: Generator = makeSiteGenerator({
  kind: "starlight-site",
  slug: "starlight",
  framework: "Starlight",
  summary:
    "Scaffold a Patterson-branded Starlight docs site from the vendored template (refuses a non-empty target)",
  devScript: "dev",
});

export const vitepressSiteGenerator: Generator = makeSiteGenerator({
  kind: "vitepress-site",
  slug: "vitepress",
  framework: "VitePress",
  summary:
    "Scaffold a Patterson-branded VitePress docs site from the vendored template (refuses a non-empty target)",
  devScript: "docs:dev",
});
