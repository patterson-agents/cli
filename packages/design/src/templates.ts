/**
 * Design-template listing + materializer (E-P3).
 *
 * A design template is one flat folder under `assets/snapshot/templates/`
 * (verified: no template has subdirectories). Materialization copies the
 * template's files to the project root and every snapshot-shared asset the
 * template references (`../../styles.css`, `../../assets/brand/…`) into a
 * `design-system/` subfolder, rewriting the relative references to match.
 *
 * Offline-safe by construction: only vendored bytes are read. Referenced
 * assets missing from the snapshot (the CORS-restricted brand binaries the
 * pull could not fetch — see assets/brand/README.md) produce WARNINGS, never
 * failures; `design refresh` is the story for completing them.
 */
import { join } from "node:path";

import { SNAPSHOT_DIR, loadDsManifest, type DsTemplateEntry } from "./snapshot.ts";

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

export interface DesignTemplateInfo {
  /** Stable slug used as `--template <name>` (the snapshot folder basename). */
  name: string;
  /** Human display name from the design system's manifest. */
  label: string;
  description: string;
  /** Snapshot-relative folder, e.g. `templates/docs-site`. */
  folder: string;
  entryPath: string;
}

function slugOf(entry: DsTemplateEntry): string {
  const parts = entry.folder.split("/");
  return parts[parts.length - 1] ?? entry.folder;
}

/** All design templates from the vendored manifest, slug-sorted. */
export async function listDesignTemplates(): Promise<DesignTemplateInfo[]> {
  const manifest = await loadDsManifest();
  return manifest.templates
    .map((entry) => ({
      name: slugOf(entry),
      label: entry.name,
      description: entry.description,
      folder: entry.folder,
      entryPath: entry.entryPath,
    }))
    .toSorted((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** Look up one design template by slug; null when unknown. */
export async function getDesignTemplate(name: string): Promise<DesignTemplateInfo | null> {
  const all = await listDesignTemplates();
  return all.find((template) => template.name === name) ?? null;
}

// ---------------------------------------------------------------------------
// Materialization
// ---------------------------------------------------------------------------

/** Where shared snapshot assets land inside a materialized project. */
export const SHARED_ASSETS_DIR = "design-system";

/**
 * Extensions we treat as text (safe to read as UTF-8 and rewrite). Anything
 * else is copied verbatim… except the snapshot holds no binaries today, so a
 * non-text reference degrades to a warning instead (see materialize).
 */
const TEXT_EXTENSIONS = new Set([
  "css", "html", "htm", "js", "jsx", "json", "jsonc", "md", "mjs", "svg", "ts", "tsx", "txt",
]);

function isTextPath(path: string): boolean {
  const dot = path.lastIndexOf(".");
  if (dot === -1) return false;
  return TEXT_EXTENSIONS.has(path.slice(dot + 1).toLowerCase());
}

/**
 * Snapshot-root references inside template files. Templates are flat, so a
 * `../../<path>` always resolves to `<path>` relative to the snapshot root.
 */
const SHARED_REF_RE = /\.\.\/\.\.\/([A-Za-z0-9._/-]+)/g;

export interface MaterializedTemplate {
  /** Root-relative files (template files at root, shared under design-system/). */
  files: { path: string; content: string }[];
  /** Referenced snapshot assets that are absent or non-text (never fatal). */
  warnings: string[];
}

/**
 * Materialize a design template for a new project. Throws on an unknown slug
 * (callers list first); never throws for missing shared assets.
 */
export async function materializeDesignTemplate(name: string): Promise<MaterializedTemplate> {
  const template = await getDesignTemplate(name);
  if (template === null) {
    const known = (await listDesignTemplates()).map((t) => t.name).join(", ");
    throw new Error(`Unknown design template "${name}". Available: ${known}.`);
  }

  const templateDir = join(SNAPSHOT_DIR, template.folder);
  const glob = new Bun.Glob("*");
  const files: { path: string; content: string }[] = [];
  const warnings: string[] = [];
  const sharedRefs = new Set<string>();

  for await (const rel of glob.scan({ cwd: templateDir, dot: true, onlyFiles: true })) {
    if (rel === ".thumbnail") continue; // preview image, not project content
    if (!isTextPath(rel) && rel !== "README.md") {
      warnings.push(`Template file "${rel}" is not a known text format; skipped.`);
      continue;
    }
    let content = await Bun.file(join(templateDir, rel)).text();
    content = content.replace(SHARED_REF_RE, (_match, ref: string) => {
      sharedRefs.add(ref);
      return `${SHARED_ASSETS_DIR}/${ref}`;
    });
    files.push({ path: rel, content });
  }

  for (const ref of [...sharedRefs].toSorted()) {
    const abs = join(SNAPSHOT_DIR, ref);
    if (!(await Bun.file(abs).exists())) {
      warnings.push(
        `Shared asset "${ref}" is referenced but missing from the vendored snapshot ` +
          `(see design-system/assets README notes); run \`patterson design refresh\` when authenticated.`,
      );
      continue;
    }
    if (!isTextPath(ref)) {
      warnings.push(`Shared asset "${ref}" is not a known text format; skipped.`);
      continue;
    }
    files.push({
      path: `${SHARED_ASSETS_DIR}/${ref}`,
      content: await Bun.file(abs).text(),
    });
  }

  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { files, warnings };
}
