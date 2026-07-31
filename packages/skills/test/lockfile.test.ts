/**
 * E-P4 — lockfile reader + C14 backup guard tests (verification 9: the
 * backup guard fires on a corrupted-lockfile fixture; patterson never
 * writes the lockfile itself).
 */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  backupLockfileIfAtRisk,
  listInstalledSkills,
  LOCKFILE_BASENAME,
  readLockfile,
} from "../src/index.ts";

const dirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "patterson-skills-"));
  dirs.push(dir);
  return dir;
}
afterEach(async () => {
  while (dirs.length > 0) await rm(dirs.pop() as string, { recursive: true, force: true });
});

const VALID_LOCKFILE = JSON.stringify({
  version: 1,
  skills: {
    "find-skills": {
      source: "vercel-labs/skills",
      sourceType: "github",
      skillPath: "skills/find-skills/SKILL.md",
      computedHash: "a".repeat(64),
    },
  },
});

describe("readLockfile (v1 reader — never a writer)", () => {
  test("absent / valid / corrupted / version-ahead states", async () => {
    const root = await tempDir();
    expect((await readLockfile(root)).state).toBe("absent");

    await Bun.write(join(root, LOCKFILE_BASENAME), VALID_LOCKFILE);
    const ok = await readLockfile(root);
    expect(ok.state).toBe("ok");
    if (ok.state === "ok") expect(Object.keys(ok.lockfile.skills)).toEqual(["find-skills"]);

    await Bun.write(join(root, LOCKFILE_BASENAME), "{ corrupted!!");
    expect((await readLockfile(root)).state).toBe("unparseable");

    await Bun.write(join(root, LOCKFILE_BASENAME), JSON.stringify({ version: 3, skills: {} }));
    const ahead = await readLockfile(root);
    expect(ahead.state).toBe("version-ahead");
    if (ahead.state === "version-ahead") expect(ahead.version).toBe(3);
  });
});

describe("backup guard (C14 self-wipe protection)", () => {
  test("healthy or absent lockfile: no backup", async () => {
    const root = await tempDir();
    expect((await backupLockfileIfAtRisk(root)).backedUp).toBe(false);
    await Bun.write(join(root, LOCKFILE_BASENAME), VALID_LOCKFILE);
    expect((await backupLockfileIfAtRisk(root)).backedUp).toBe(false);
  });

  test("corrupted lockfile: byte-exact backup into .patterson/backup/, original untouched", async () => {
    const root = await tempDir();
    const corrupted = '{ "version": 1, "skills": { broken';
    await Bun.write(join(root, LOCKFILE_BASENAME), corrupted);

    const outcome = await backupLockfileIfAtRisk(root, new Date("2026-07-31T12:00:00Z"));
    expect(outcome.backedUp).toBe(true);
    expect(outcome.backupPath).toContain(".patterson/backup/");
    expect(outcome.warnings[0]).toContain("self-wipes");

    // Backup is byte-exact; the original is NOT modified (never-write).
    expect(await Bun.file(join(root, outcome.backupPath as string)).text()).toBe(corrupted);
    expect(await Bun.file(join(root, LOCKFILE_BASENAME)).text()).toBe(corrupted);
  });

  test("version-ahead lockfile: backed up before the older CLI can rewrite it", async () => {
    const root = await tempDir();
    await Bun.write(join(root, LOCKFILE_BASENAME), JSON.stringify({ version: 3, skills: {} }));
    const outcome = await backupLockfileIfAtRisk(root);
    expect(outcome.backedUp).toBe(true);
    expect(outcome.warnings[0]).toContain("newer");
  });
});

describe("listInstalledSkills (inventory)", () => {
  test("managed vs hand-installed vs missing-dir skills", async () => {
    const root = await tempDir();
    await Bun.write(join(root, LOCKFILE_BASENAME), VALID_LOCKFILE);
    // find-skills is locked but has no directory; handmade only has a directory.
    await Bun.write(join(root, ".agents/skills/handmade/SKILL.md"), "---\nname: handmade\n---\n");

    // claude-only skill: only under .claude/skills, invisible to other agents.
    await Bun.write(join(root, ".claude/skills/claude-special/SKILL.md"), "---\nname: claude-special\n---\n");

    const { skills, lockfileState } = await listInstalledSkills(root);
    expect(lockfileState).toBe("ok");
    expect(skills).toEqual([
      { name: "claude-special", managed: false, location: "claude-only" },
      {
        name: "find-skills",
        managed: true,
        location: "lockfile-only",
        source: "vercel-labs/skills",
        skillPath: "skills/find-skills/SKILL.md",
      },
      { name: "handmade", managed: false, location: "agents" },
    ]);
  });
});
