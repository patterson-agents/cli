/**
 * Pinned skills-CLI invocation + installed-skill inventory (E-P4, US3).
 *
 * The skills CLI is pinned (`bunx skills@1.5.21`, also a devDependency so
 * bunx resolves locally/offline). ONLY that CLI writes skills-lock.json;
 * patterson shells out through the backup guard and then re-reads.
 */
import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { backupLockfileIfAtRisk, readLockfile, type GuardOutcome } from "./lockfile.ts";

/** The pinned skills CLI version (matches the root devDependency). */
export const SKILLS_CLI_VERSION = "1.5.21";

/** Canonical skills home (D6: `.agents/skills/`, linked into `.claude/skills`). */
export const AGENTS_SKILLS_DIR = ".agents/skills";

export interface SkillsCliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  guard: GuardOutcome;
}

export type SkillsCliRunner = (args: string[], cwd: string) => Promise<SkillsCliResult>;

/**
 * Run the pinned skills CLI. The backup guard ALWAYS runs first — a
 * corrupted lockfile is preserved before the CLI can self-wipe it (C14).
 */
export async function runSkillsCli(args: string[], cwd: string): Promise<SkillsCliResult> {
  const guard = await backupLockfileIfAtRisk(cwd);
  const proc = Bun.spawn(["bunx", `skills@${SKILLS_CLI_VERSION}`, ...args], {
    cwd,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { exitCode, stdout, stderr, guard };
}

// ---------------------------------------------------------------------------
// Inventory (offline)
// ---------------------------------------------------------------------------

/** Claude Code's skills dir (S3: the only one Claude actually scans). */
export const CLAUDE_SKILLS_DIR = ".claude/skills";

export interface InstalledSkill {
  name: string;
  /** True when the lockfile records it (skills-CLI managed). */
  managed: boolean;
  /**
   * Where the skill lives: the canonical home, only Claude's dir (invisible
   * to other agents — D6), or only the lockfile (directory missing = drift).
   */
  location: "agents" | "claude-only" | "lockfile-only";
  source?: string;
  skillPath?: string;
}

async function dirEntries(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
      .map((entry) => entry.name)
      .toSorted();
  } catch {
    return [];
  }
}

/**
 * Inventory `.agents/skills/` (canonical) + `.claude/skills/` (Claude-only
 * extras) against the lockfile: managed skills carry their source;
 * directories without a lockfile entry (hand-installed) are listed as
 * unmanaged rather than hidden — patterson never deletes them. A skill only
 * under `.claude/skills/` is flagged claude-only: no other agent sees it (D6).
 */
export async function listInstalledSkills(cwd: string): Promise<{
  skills: InstalledSkill[];
  lockfileState: "absent" | "ok" | "version-ahead" | "unparseable";
}> {
  const read = await readLockfile(cwd);
  const locked = read.state === "ok" ? read.lockfile.skills : {};

  const agentEntries = await dirEntries(join(cwd, AGENTS_SKILLS_DIR));
  const claudeEntries = await dirEntries(join(cwd, CLAUDE_SKILLS_DIR));

  const skills: InstalledSkill[] = agentEntries.map((name) => {
    const record = locked[name];
    return record
      ? { name, managed: true, location: "agents", source: record.source, skillPath: record.skillPath }
      : { name, managed: false, location: "agents" };
  });
  for (const name of claudeEntries) {
    if (!agentEntries.includes(name)) {
      skills.push({ name, managed: locked[name] !== undefined, location: "claude-only" });
    }
  }
  // Locked skills with no directory anywhere still show (as managed) so the
  // drift is visible instead of silently dropped.
  for (const [name, record] of Object.entries(locked)) {
    if (!agentEntries.includes(name) && !claudeEntries.includes(name)) {
      skills.push({
        name,
        managed: true,
        location: "lockfile-only",
        source: record.source,
        skillPath: record.skillPath,
      });
    }
  }
  skills.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  return { skills, lockfileState: read.state };
}
