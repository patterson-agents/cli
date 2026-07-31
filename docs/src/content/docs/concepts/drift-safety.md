---
title: Drift safety
description: Provenance for every write, sentinels and key-path records, a hard never-write list, and --accept-generated as the only clobber path.
sidebar:
  order: 2
---

A config manager that loses user edits or corrupts foreign lockfiles is worse
than no tool at all. Drift safety is therefore **non-negotiable** in
patterson's constitution: hand-edited content is never silently overwritten,
in any mode — interactive, flag-driven, or agent-driven.

:::note[Status]
The emit engine, provenance records, and drift comparison shipped in P1. The
first end-to-end drift loop (emit → hand-edit → `sync` reports and preserves)
is being exercised now in the P2a Claude Code walking skeleton. `doctor
--fix` is planned for P6.
:::

## Provenance: patterson remembers what it wrote

Every write is recorded, in two forms:

- **Sentinel blocks** in markdown files — patterson-owned regions are fenced
  with sentinel markers carrying content hashes, so patterson-owned and
  hand-written parts of the same file are distinguishable.
- **`.patterson/emitted.json`** — a structured sidecar recording, per file:
  the mode, key-path + value + hash records for structured files (JSON/JSONC),
  a content hash, and the IR hash it was emitted from.

Crucially, provenance covers **own-tier files too**, not just merged ones. A
file patterson "owns" is still never rewritten wholesale over your edits —
ownership means patterson intends to manage the whole file, not that your
changes to it are disposable.

## The drift algorithm

On every re-emission, per file (or per owned key-path):

1. Current content **equals** the recorded emission → rewriting is allowed;
   the file is patterson's to update.
2. Current content **differs** from the recorded emission → the file was
   hand-edited: **keep the edit, report the conflict**.
3. Recorded content is **missing** → deletion is drift too. patterson keeps
   the file absent and reports it (such conflicts carry an `"absent"` marker
   instead of a content hash); `--accept-generated` recreates it.

In non-interactive contexts the rules harden:

- CLI runs with `--yes` or `--json` keep, report, and **exit non-zero**
  (exit code 2 = conflicts preserved).
- Agent callers over MCP receive a **structured conflict list** — never a
  clobbered file. See [agent parity](/concepts/agent-parity/).

There is exactly one way to overwrite a hand-edited emitted file:

```sh
patterson sync --accept-generated
```

No other flag, mode, or caller can clobber drifted content.

## The never-write list

Some files belong to other tools, and patterson will **never** write them,
under any flag:

| Path | Owner |
| --- | --- |
| `skills-lock.json` | the upstream skills.sh CLI |
| `~/.agents/.skill-lock.json` (and its XDG variant) | the upstream skills.sh CLI (global) |
| `.claude/settings.local.json` beyond first creation | Claude Code / the user's machine |

This is enforced mechanically: a test runs the full suite and asserts these
paths were never opened for write. The success criterion is absolute — the
CLI never writes a never-write file, across the entire test suite.

The skills lockfiles get extra protection: the upstream tool is known to
rewrite (and, when a lockfile is corrupted, wipe) them, so patterson backs the
lockfile up to `.patterson/backup/` before every shell-out to the skills CLI
and warns you if corruption was detected.

## Adoption: your existing config is hand-owned

`patterson init` on a repo that already has agent config does not take that
config over. Everything pre-existing is marked **foreign** — hand-owned,
preserved, never overwritten. The explicit `--import` option lifts
recognizable config *into* the project model, so it becomes managed because
you asked, not because patterson assumed.

## Why this design

The alternative failure modes are all real and all bad:

- A generator that rewrites owned files wholesale silently loses the tweak
  you made last Tuesday.
- A `--yes` flag that means "overwrite whatever you find" turns every CI run
  and every agent call into a potential data-loss event.
- A tool that "helpfully" repairs another tool's lockfile corrupts it on the
  next upstream schema change.

patterson's answer is uniform: **provenance decides**. If the bytes on disk
are the bytes patterson wrote, they're patterson's to update. If they're not,
they're yours — and only `--accept-generated` says otherwise.
