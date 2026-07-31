---
title: Managing skills
description: Install a skill once from the skills.sh ecosystem and make it visible to every configured agent — without ever corrupting a lockfile.
sidebar:
  order: 1
---

:::note[Status]
Skills management (`patterson skills …`) lands in **P4**. The layout and
lockfile rules described here are already fixed by the spec and by spike
S3, and the claude-code linking behavior ships with the **P2a** walking
skeleton (in flight). Until P4, install skills with the upstream
`skills` CLI directly.
:::

Skills are the primary way knowledge travels between agents: a named,
self-describing package installed **once** and made visible to every
agent you've configured. patterson integrates with the
[skills.sh](https://skills.sh) ecosystem rather than reinventing it.

## The command surface

```text
patterson skills list       Show installed skills and per-agent visibility
patterson skills search     Search the skills.sh ecosystem
patterson skills add        Install a skill (canonical copy + per-agent links)
patterson skills remove     Remove a skill and its links
patterson skills update     Update via the upstream skills CLI
```

As everywhere in patterson: reads take `--json`, writes take `--dry-run`
and `--yes`.

## How installation works

patterson **wraps** the upstream skills CLI — it never reimplements it.
The wrapper shells out to a pinned version (`skills@1.5.21`, a
devDependency invoked via `bunx`, with a documented `npx` fallback).
Search uses the ecosystem's search API where available and degrades to
parsing `skills find` output if that endpoint changes.

Installation then produces one canonical copy plus per-agent links:

| Location | Role |
| --- | --- |
| `.agents/skills/<name>` | Canonical copy — the single source installed by the upstream tool |
| `.claude/skills/<name>` | **Mandatory link** for Claude Code (symlink by default, copy fallback) |
| Copilot skill location | Copy, recorded with its `linkMode` |
| opencode | No link needed — patterson always emits `skills.paths: [".agents/skills"]` |

### Why the `.claude/skills` link is mandatory

This isn't a stylistic choice — it's an empirical finding. Spike **S3**
ran a canary test: two skills, one placed only in `.agents/skills/`, one
only in `.claude/skills/`, then a headless Claude Code listing. **Claude
Code does not scan `.agents/skills/` — only the `.claude/skills/` canary
was visible.**

Consequently, every skill that targets claude-code gets a
`.claude/skills/<name>` link, and any restore path that only repopulates
`.agents/skills/` (as the upstream install command does) is always
followed by per-agent linking. The default `linkMode` is `"symlink"`,
with `"copy"` as the fallback for filesystems where symlinks don't
survive.

### Naming rules

A skill's identity is its directory name, which must equal the name
declared in its frontmatter — enforced at emit time and by the `new
skill` generator. Names are lowercase-hyphen (`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`),
at most 64 characters, with no `--` sequences.

## Lockfile ownership and the backup guard

The skills ecosystem maintains its own lockfiles — a project-level
`skills-lock.json` and a global `.skill-lock.json` — in **two different
versioned schemas** with content hashes. These files are also known to be
self-wiping: certain upstream operations rewrite them from scratch.

patterson's constitution makes the rule absolute:

- **Only the upstream skills CLI writes these lockfiles.** They are on
  patterson's never-write list; the CLI reads them but will never write
  them, and the test suite asserts these paths are never opened for
  write (SC-007).
- **Before any shell-out to the skills CLI, patterson backs the
  lockfiles up** to `.patterson/backup/`. If a lockfile is corrupted,
  it is backed up before the upstream tool can wipe it, and you are
  warned — the file is never silently lost.

This is what makes it safe to put a wrapper in front of a tool that owns
its own state: patterson protects the state without ever touching it.

## Skills in the project model

In `patterson.config.ts`, a skill is a `SkillDef`: name, description,
body, optional files and allowed tools, its `linkMode`, and an optional
`targets` list restricting which agents see it. `patterson skills list`
shows the resulting per-agent visibility, and `patterson check` reports
any skill that can't reach a target it was configured for.
