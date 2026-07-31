#!/usr/bin/env bun
/** Quick validation script for skills - minimal version. */

import { existsSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { Glob } from "bun";

// Directories whose contents are not packaged as part of the skill, so any
// SKILL.md inside them shouldn't count toward the single-SKILL.md check below.
// Mirrors package_skill.ts: __pycache__ and node_modules are excluded at any
// depth, while evals is only excluded at the skill root.
const EXCLUDED_DIR_PARTS = new Set(["__pycache__", "node_modules"]);
const ROOT_EXCLUDED_DIR_PARTS = new Set(["evals"]);

const ALLOWED_PROPERTIES = new Set([
  "name",
  "description",
  "license",
  "allowed-tools",
  "metadata",
  "compatibility",
]);

/** True if a SKILL.md at relPath (relative to the skill root) would be packaged. */
function countsAsSkillMd(relPath: string): boolean {
  const parts = relPath.split(sep);
  const dirParts = parts.slice(0, -1);
  if (dirParts.some((part) => EXCLUDED_DIR_PARTS.has(part))) return false;
  const first = dirParts[0];
  if (first !== undefined && ROOT_EXCLUDED_DIR_PARTS.has(first)) return false;
  return true;
}

export type ValidationResult = { valid: boolean; message: string };

/** Basic validation of a skill. */
export function validateSkill(skillPathInput: string): ValidationResult {
  const skillPath = resolve(skillPathInput);

  // Check SKILL.md exists
  const skillMd = join(skillPath, "SKILL.md");
  if (!existsSync(skillMd)) {
    return { valid: false, message: "SKILL.md not found" };
  }

  // A skill must contain exactly one SKILL.md, at <folder>/SKILL.md. Extra
  // (nested) SKILL.md files are rejected on upload: the Skills API and claude.ai
  // accept exactly one per skill — only Claude Code's filesystem loads nested
  // ones. package_skill produces an upload-bound .skill, so block here rather
  // than ship an artifact that's guaranteed to fail on upload.
  const glob = new Glob("**/SKILL.md");
  const skillMdFiles = [...glob.scanSync({ cwd: skillPath })].filter((p) => countsAsSkillMd(p));
  if (skillMdFiles.length > 1) {
    const extras = skillMdFiles
      .filter((p) => resolve(join(skillPath, p)) !== resolve(skillMd))
      .map((p) => relative(skillPath, join(skillPath, p)))
      .toSorted();
    return {
      valid: false,
      message:
        `Found ${skillMdFiles.length} SKILL.md files, but a skill must contain ` +
        `exactly one at <folder>/SKILL.md. The Skills API and claude.ai reject ` +
        `multiple on upload (only Claude Code's filesystem loads nested skills). ` +
        `Extra: ${extras.join(", ")}.\n` +
        "  - Separate skills: package each on its own, or build a plugin " +
        "(skills/<name>/SKILL.md).\n" +
        "  - Supporting docs: rename to non-SKILL.md files (e.g. references/<topic>.md).\n" +
        "  - Swept in by mistake: package only the one skill directory.",
    };
  }

  // Read and validate frontmatter
  const content = readFileSync(skillMd, "utf8");
  if (!content.startsWith("---")) {
    return { valid: false, message: "No YAML frontmatter found" };
  }

  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return { valid: false, message: "Invalid frontmatter format" };
  }
  const frontmatterText = match[1] ?? "";

  let frontmatter: unknown;
  try {
    frontmatter = Bun.YAML.parse(frontmatterText);
  } catch (error) {
    return { valid: false, message: `Invalid YAML in frontmatter: ${String(error)}` };
  }
  if (typeof frontmatter !== "object" || frontmatter === null || Array.isArray(frontmatter)) {
    return { valid: false, message: "Frontmatter must be a YAML dictionary" };
  }
  const fm = frontmatter as Record<string, unknown>;

  // Check for unexpected properties (excluding nested keys under metadata)
  const unexpectedKeys = Object.keys(fm).filter((k) => !ALLOWED_PROPERTIES.has(k));
  if (unexpectedKeys.length > 0) {
    return {
      valid: false,
      message:
        `Unexpected key(s) in SKILL.md frontmatter: ${unexpectedKeys.toSorted().join(", ")}. ` +
        `Allowed properties are: ${[...ALLOWED_PROPERTIES].toSorted().join(", ")}`,
    };
  }

  // Check required fields
  if (!("name" in fm)) return { valid: false, message: "Missing 'name' in frontmatter" };
  if (!("description" in fm))
    return { valid: false, message: "Missing 'description' in frontmatter" };

  // Extract name for validation
  const rawName = fm["name"];
  if (typeof rawName !== "string") {
    return { valid: false, message: `Name must be a string, got ${typeName(rawName)}` };
  }
  const name = rawName.trim();
  if (name) {
    // Check naming convention (kebab-case: lowercase with hyphens)
    if (!/^[a-z0-9-]+$/.test(name)) {
      return {
        valid: false,
        message: `Name '${name}' should be kebab-case (lowercase letters, digits, and hyphens only)`,
      };
    }
    if (name.startsWith("-") || name.endsWith("-") || name.includes("--")) {
      return {
        valid: false,
        message: `Name '${name}' cannot start/end with hyphen or contain consecutive hyphens`,
      };
    }
    // Check name length (max 64 characters per spec)
    if (name.length > 64) {
      return {
        valid: false,
        message: `Name is too long (${name.length} characters). Maximum is 64 characters.`,
      };
    }
  }

  // Extract and validate description
  const rawDescription = fm["description"];
  if (typeof rawDescription !== "string") {
    return {
      valid: false,
      message: `Description must be a string, got ${typeName(rawDescription)}`,
    };
  }
  const description = rawDescription.trim();
  if (description) {
    // Check for angle brackets
    if (description.includes("<") || description.includes(">")) {
      return { valid: false, message: "Description cannot contain angle brackets (< or >)" };
    }
    // Check description length (max 1024 characters per spec)
    if (description.length > 1024) {
      return {
        valid: false,
        message: `Description is too long (${description.length} characters). Maximum is 1024 characters.`,
      };
    }
  }

  // Validate compatibility field if present (optional)
  const compatibility = fm["compatibility"];
  if (compatibility !== undefined && compatibility !== null && compatibility !== "") {
    if (typeof compatibility !== "string") {
      return {
        valid: false,
        message: `Compatibility must be a string, got ${typeName(compatibility)}`,
      };
    }
    if (compatibility.length > 500) {
      return {
        valid: false,
        message: `Compatibility is too long (${compatibility.length} characters). Maximum is 500 characters.`,
      };
    }
  }

  return { valid: true, message: "Skill is valid!" };
}

function typeName(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const target = args[0];
  if (args.length !== 1 || target === undefined) {
    console.log("Usage: bun scripts/quick_validate.ts <skill_directory>");
    process.exit(1);
  }
  const { valid, message } = validateSkill(target);
  console.log(message);
  process.exit(valid ? 0 : 1);
}
