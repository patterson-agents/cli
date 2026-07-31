#!/usr/bin/env bun
/**
 * Skill Packager - Creates a distributable .skill file of a skill folder
 *
 * Usage:
 *     bun scripts/package_skill.ts <path/to/skill-folder> [output-directory]
 *
 * Example:
 *     bun scripts/package_skill.ts skills/public/my-skill
 *     bun scripts/package_skill.ts skills/public/my-skill ./dist
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { Glob } from "bun";
import { zipSync, type Zippable } from "fflate";

import { validateSkill } from "./quick_validate.ts";

// Patterns to exclude when packaging skills.
const EXCLUDE_DIRS = new Set(["__pycache__", "node_modules"]);
const EXCLUDE_GLOBS = ["*.pyc"];
const EXCLUDE_FILES = new Set([".DS_Store", "bun.lock", "bun.lockb"]);
// Directories excluded only at the skill root (not when nested deeper).
const ROOT_EXCLUDE_DIRS = new Set(["evals"]);

/** Check if a path (relative to the skill's parent) should be excluded from packaging. */
export function shouldExclude(relPath: string): boolean {
  const parts = relPath.split(sep);
  if (parts.some((part) => EXCLUDE_DIRS.has(part))) return true;
  // relPath is relative to the skill folder's parent, so parts[0] is the skill
  // folder name and parts[1] (if present) is the first subdir.
  const firstSubdir = parts[1];
  if (parts.length > 1 && firstSubdir !== undefined && ROOT_EXCLUDE_DIRS.has(firstSubdir))
    return true;
  const name = parts[parts.length - 1] ?? "";
  if (EXCLUDE_FILES.has(name)) return true;
  return EXCLUDE_GLOBS.some((pattern) => new Glob(pattern).match(name));
}

/**
 * Package a skill folder into a .skill file.
 *
 * Returns the path to the created .skill file, or null on error.
 */
export function packageSkill(skillPathInput: string, outputDir?: string): string | null {
  const skillPath = resolve(skillPathInput);

  // Validate skill folder exists
  if (!existsSync(skillPath)) {
    console.log(`❌ Error: Skill folder not found: ${skillPath}`);
    return null;
  }
  if (!statSync(skillPath).isDirectory()) {
    console.log(`❌ Error: Path is not a directory: ${skillPath}`);
    return null;
  }

  // Validate SKILL.md exists
  const skillMd = join(skillPath, "SKILL.md");
  if (!existsSync(skillMd)) {
    console.log(`❌ Error: SKILL.md not found in ${skillPath}`);
    return null;
  }

  // Run validation before packaging
  console.log("🔍 Validating skill...");
  const { valid, message } = validateSkill(skillPath);
  if (!valid) {
    console.log(`❌ Validation failed: ${message}`);
    console.log("   Please fix the validation errors before packaging.");
    return null;
  }
  console.log(`✅ ${message}\n`);

  // Determine output location
  const skillName = basename(skillPath);
  let outputPath: string;
  if (outputDir) {
    outputPath = resolve(outputDir);
    mkdirSync(outputPath, { recursive: true });
  } else {
    outputPath = process.cwd();
  }
  const skillFilename = join(outputPath, `${skillName}.skill`);

  // Create the .skill file (zip format)
  try {
    const entries: Zippable = {};
    const glob = new Glob("**/*");
    const parent = dirname(skillPath);
    const files = [...glob.scanSync({ cwd: skillPath, dot: true, onlyFiles: true })].toSorted();

    for (const rel of files) {
      const filePath = join(skillPath, rel);
      const arcname = relative(parent, filePath);
      if (shouldExclude(arcname)) {
        console.log(`  Skipped: ${arcname}`);
        continue;
      }
      // Zip archive paths always use forward slashes.
      entries[arcname.split(sep).join("/")] = new Uint8Array(readFileSync(filePath));
      console.log(`  Added: ${arcname}`);
    }

    const zipped = zipSync(entries, { level: 6 });
    writeFileSync(skillFilename, zipped);

    console.log(`\n✅ Successfully packaged skill to: ${skillFilename}`);
    return skillFilename;
  } catch (error) {
    console.log(`❌ Error creating .skill file: ${String(error)}`);
    return null;
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const skillPath = args[0];
  if (skillPath === undefined) {
    console.log("Usage: bun scripts/package_skill.ts <path/to/skill-folder> [output-directory]");
    console.log("\nExample:");
    console.log("  bun scripts/package_skill.ts skills/public/my-skill");
    console.log("  bun scripts/package_skill.ts skills/public/my-skill ./dist");
    process.exit(1);
  }
  const outputDir = args[1];

  console.log(`📦 Packaging skill: ${skillPath}`);
  if (outputDir) console.log(`   Output directory: ${outputDir}`);
  console.log();

  const result = packageSkill(skillPath, outputDir);
  process.exit(result ? 0 : 1);
}

if (import.meta.main) {
  main();
}
