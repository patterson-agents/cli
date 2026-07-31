/** Shared utilities for skill-creator scripts. */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export interface SkillMd {
  name: string;
  description: string;
  content: string;
}

/** Parse a SKILL.md file, returning name, description, and full content. */
export function parseSkillMd(skillPath: string): SkillMd {
  const content = readFileSync(join(skillPath, "SKILL.md"), "utf8");
  const lines = content.split("\n");

  if (lines[0]?.trim() !== "---") {
    throw new Error("SKILL.md missing frontmatter (no opening ---)");
  }

  let endIdx: number | null = null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      endIdx = i;
      break;
    }
  }
  if (endIdx === null) {
    throw new Error("SKILL.md missing frontmatter (no closing ---)");
  }

  let name = "";
  let description = "";
  const frontmatterLines = lines.slice(1, endIdx);
  let i = 0;
  while (i < frontmatterLines.length) {
    const line = frontmatterLines[i] ?? "";
    if (line.startsWith("name:")) {
      name = stripQuotes(line.slice("name:".length).trim());
    } else if (line.startsWith("description:")) {
      const value = line.slice("description:".length).trim();
      // Handle YAML multiline indicators (>, |, >-, |-)
      if (value === ">" || value === "|" || value === ">-" || value === "|-") {
        const continuation: string[] = [];
        i += 1;
        while (
          i < frontmatterLines.length &&
          ((frontmatterLines[i] ?? "").startsWith("  ") ||
            (frontmatterLines[i] ?? "").startsWith("\t"))
        ) {
          continuation.push((frontmatterLines[i] ?? "").trim());
          i += 1;
        }
        description = continuation.join(" ");
        continue;
      }
      description = stripQuotes(value);
    }
    i += 1;
  }

  return { name, description, content };
}

function stripQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}

/** Escape a string for safe interpolation into HTML. */
export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;");
}

/** Read and parse a JSON file. */
export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

/** Best-effort open of a URL or file in the default browser. */
export function openBrowser(target: string): void {
  const candidates =
    process.platform === "darwin"
      ? [["open", target]]
      : process.platform === "win32"
        ? [["cmd", "/c", "start", "", target]]
        : [
            ["xdg-open", target],
            ["sensible-browser", target],
          ];
  for (const cmd of candidates) {
    try {
      Bun.spawn(cmd as string[], { stdout: "ignore", stderr: "ignore" });
      return;
    } catch {
      // try next candidate
    }
  }
}

/** Find the project root by walking up from cwd looking for .claude/.
 *
 * Mimics how Claude Code discovers its project root, so command files
 * we create end up where claude -p will look for them.
 */
export function findProjectRoot(): string {
  let current = resolve(process.cwd());
  for (;;) {
    if (existsSync(join(current, ".claude"))) return current;
    const parent = dirname(current);
    if (parent === current) return process.cwd();
    current = parent;
  }
}

/** Environment for nested `claude -p` calls.
 *
 * Removes the CLAUDECODE env var to allow nesting claude -p inside a
 * Claude Code session. The guard is for interactive terminal conflicts;
 * programmatic subprocess usage is safe.
 */
export function claudeEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (k !== "CLAUDECODE" && v !== undefined) env[k] = v;
  }
  return env;
}

/** Run up to `limit` async jobs concurrently, preserving result order. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length }) as R[];
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      const item = items[index] as T;
      results[index] = await fn(item, index);
    }
  });
  await Promise.all(workers);
  return results;
}
