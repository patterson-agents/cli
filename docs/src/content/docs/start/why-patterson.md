---
title: Why patterson?
description: Four files, one idea, guaranteed drift — the problem patterson exists to solve, and the three design rules that make the fix trustworthy.
sidebar:
  order: 2
---

Every AI coding tool reinvents the same concepts with incompatible file
formats. The ideas are shared; the spellings are not.

## Four files, one idea

Take your *project instructions* — the guidance you want every agent to read.
Depending on which tools your team uses, that one idea lives in:

- `CLAUDE.md` (Claude Code)
- `AGENTS.md` (the emerging cross-agent convention)
- `.github/copilot-instructions.md` (GitHub Copilot)
- Zed's `.rules` (one file, chosen by a first-match search order that also
  matches files like `.cursorrules` you may have forgotten about)

Four files, one idea, **guaranteed drift**: someone updates one copy, the
other three quietly go stale, and each agent now works from a different
version of the truth.

MCP servers are worse. The same server definition is declared in `.mcp.json`,
`.vscode/mcp.json`, `opencode.json`, and Zed's `context_servers` — four
shapes, six transport enums, and four different syntaxes for referencing
secrets. A command is an `argv` array on one surface and a joined shell string
on another; a scoped instruction is `paths:` here, a comma-joined `applyTo`
there, and inexpressible somewhere else.

Editing N files per concept by hand is not a discipline problem. It is a
structural one: no amount of care keeps four hand-maintained projections of
one idea in sync.

## One model, compiled

**patterson holds one canonical model and compiles it to every surface.** Your
agents, instructions, skills, MCP servers, permissions, editor settings, and
CI choices live in a single `patterson.config.ts` (or `.jsonc`); every target
file is a deterministic projection of it. Adding an MCP server everywhere
becomes one model change plus `patterson sync` — instead of four file edits in
four dialects.

And it *keeps* compiling. patterson is a standing configuration manager, not a
one-shot generator: `sync` re-emits every surface, `doctor` reports drift, and
`check` shows which configured intent reaches which agent — and why not, when
a surface can't express it.

Three design rules make regeneration trustworthy:

1. **Pure compilation.** Every emitted file is a function of the model. Same
   model, same bytes, every time. See
   [the canonical model](/concepts/canonical-model/).
2. **Provenance everywhere.** Every write is recorded. Hand-edit an emitted
   file and patterson keeps your edit, reports the conflict, and exits
   non-zero in automation — overwriting requires an explicit
   `--accept-generated`. Files owned by other tools are never written at all.
   See [drift safety](/concepts/drift-safety/).
3. **Declared reachability.** When a concept can't round-trip to a surface
   (opencode has no path-scoped instructions; Zed reads exactly *one* rules
   file), `patterson check` names the gap and the fallback instead of silently
   dropping it. See [the canonical model](/concepts/canonical-model/#coverage-declared-reachability).

There's a fourth rule hiding in the third: the whole command surface is also
an MCP server, so the agents being configured can drive the configurator —
with the same safety guarantees. See
[agent parity](/concepts/agent-parity/).

:::note[Status]
The model, registry, and emit engine shipped in P1. The first end-to-end
compile path — the Claude Code emitter, `create`/`init` → emit → `sync` →
`doctor` — is in flight now as P2a. The remaining surfaces (Copilot, opencode,
Zed, VS Code, and later devcontainer and GitHub Actions) are planned for P2b
and beyond, so the multi-surface story on this page describes the design
target, not what runs today.
:::

## What it is not

- **Not a wrapper** around each tool's own CLI — it emits each target's native
  configuration format directly, from one model.
- **Not an editor of your files.** patterson tracks what *it* wrote. Anything
  it didn't write is hand-owned and preserved; some files (like the skills
  ecosystem's `skills-lock.json`) are on a hard never-write list.
- **Not lock-in.** The emitted files are the ordinary, native config files
  each tool already reads. Delete patterson and everything keeps working —
  you're just back to maintaining four spellings of every idea by hand.
