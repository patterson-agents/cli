/**
 * @patterson/skills — pinned skills-CLI wrapper + lockfile READER (E-P4).
 * Constitution II: this package never writes skills-lock.json or the global
 * .skill-lock.json; the pinned skills CLI is the only writer, and the backup
 * guard protects against its self-wipe-on-parse-failure behavior (C14).
 */
export {
  AGENTS_SKILLS_DIR,
  CLAUDE_SKILLS_DIR,
  listInstalledSkills,
  runSkillsCli,
  SKILLS_CLI_VERSION,
} from "./cli.ts";
export type { InstalledSkill, SkillsCliResult, SkillsCliRunner } from "./cli.ts";
export {
  backupLockfileIfAtRisk,
  LOCKFILE_BASENAME,
  LockfileSchema,
  readLockfile,
} from "./lockfile.ts";
export type { GuardOutcome, Lockfile, LockfileReadResult } from "./lockfile.ts";
