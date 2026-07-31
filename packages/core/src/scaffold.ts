/**
 * Scaffolding utilities for `patterson create` (T024).
 *
 * Pure-ish helpers: template collection + `{{var}}` substitution, the typed
 * `patterson.config.ts` renderer (PattersonProjectInput authoring form), and a
 * guarded writer that routes every scaffold write through the never-write
 * guard (Constitution II applies to scaffolding like any other write).
 *
 * The emitter pipeline is NOT here: scaffolded template files are one-shot
 * starter content the user owns immediately, so they are deliberately not
 * provenance-recorded — only emitter output (applied via applyFileOps) is.
 */
import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { assertInsideRoot } from "./emit/apply.ts";
import { assertWritable } from "./emit/never-write.ts";
import type { PattersonProjectInput } from "./ir/index.ts";

/** The authoring config file `create` writes and `sync`/`doctor` load. */
export const PATTERSON_CONFIG_BASENAME = "patterson.config.ts";

/** One file of a template, path root-relative POSIX, substitution applied. */
export interface ScaffoldFile {
  path: string;
  content: string;
}

/** Replace `{{key}}` placeholders; unknown keys are left untouched. */
export function substituteTemplateVars(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{([a-zA-Z0-9_-]+)\}\}/g, (match, key: string) => vars[key] ?? match);
}

function comparePaths(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Read every file under `templateDir` (dotfiles included), applying `{{var}}`
 * substitution to both paths and contents. Deterministically sorted by path.
 */
export async function collectTemplateFiles(
  templateDir: string,
  vars: Record<string, string>,
): Promise<ScaffoldFile[]> {
  const glob = new Bun.Glob("**/*");
  const files: ScaffoldFile[] = [];
  for await (const rel of glob.scan({ cwd: templateDir, dot: true, onlyFiles: true })) {
    const posix = rel.replaceAll("\\", "/");
    const content = await Bun.file(join(templateDir, rel)).text();
    files.push({
      path: substituteTemplateVars(posix, vars),
      content: substituteTemplateVars(content, vars),
    });
  }
  return files.toSorted((a, b) => comparePaths(a.path, b.path));
}

/** Entries of `dir` (names only). A missing directory is an empty directory. */
export async function directoryEntries(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir)).toSorted(comparePaths);
  } catch {
    return [];
  }
}

/**
 * Write scaffold files under `root`. Every write passes the never-write guard.
 * Returns the root-relative paths written (sorted input order preserved).
 */
export async function writeScaffoldFiles(
  root: string,
  files: readonly ScaffoldFile[],
): Promise<string[]> {
  const written: string[] = [];
  for (const file of files) {
    // A substituted template path (e.g. a {{name}} carrying "../") must never
    // resolve outside the scaffold root.
    assertInsideRoot(file.path);
    const abs = join(root, file.path);
    assertWritable(file.path, { exists: await Bun.file(abs).exists() });
    await Bun.write(abs, file.content);
    written.push(file.path);
  }
  return written;
}

/**
 * Render the typed authoring config (`patterson.config.ts`).
 *
 * Only a type-only import is emitted, so the file is runtime-importable even
 * before `bun install` (Bun erases `import type` at load time) — the config
 * loader relies on this.
 */
export function renderPattersonConfig(input: PattersonProjectInput): string {
  return [
    "/**",
    " * Patterson project configuration (authoring form).",
    " * Edit this file, then run `patterson sync` to re-emit target configs.",
    " */",
    'import type { PattersonProjectInput } from "@patterson/core";',
    "",
    `const config: PattersonProjectInput = ${JSON.stringify(input, null, 2)};`,
    "",
    "export default config;",
    "",
  ].join("\n");
}

/**
 * Deterministic fallback SETUP.md content used when an emission produced no
 * instruct-tier steps (the emit engine owns SETUP.md whenever instructs exist).
 */
export function renderDefaultSetupMd(name: string): string {
  return [
    "# SETUP — next steps",
    "",
    `Project "${name}" was scaffolded by patterson. No manual configuration steps`,
    "are pending. Suggested next steps:",
    "",
    "- `bun install` (if it was skipped with `--no-install`)",
    "- `patterson doctor` — verify emitted files match their provenance records",
    "- edit `patterson.config.ts`, then `patterson sync` to re-emit",
    "",
    "## Skills & MCP (optional, needs network)",
    "",
    "- `patterson skills add <owner>/<repo>` — install agent skills via the pinned",
    "  skills CLI (canonical home `.agents/skills/`, linked into `.claude/skills/`)",
    "- add MCP servers under `mcp:` in `patterson.config.ts`, then `patterson sync`",
    "- `patterson plugins marketplace list` — known plugin marketplaces",
    "",
  ].join("\n");
}
