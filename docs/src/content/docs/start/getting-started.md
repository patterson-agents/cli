---
title: Getting started
description: Three doors into patterson — bunx, bun create, or the GitHub template — and the first five commands you will run.
sidebar:
  order: 1
---

:::note[Status]
patterson is mid-build. The monorepo (P0) and the core — IR, command registry,
emit engine (P1) — have shipped. The Claude Code walking skeleton (P2a:
`create`/`init` → emit → `sync` → `doctor`, end to end) is in flight right now.
The install doors below are the designed distribution paths; the packages are
not yet published to a registry, so today the only way in is
[from source](#run-from-source). Design-system templates and the full create
wizard land in P3.
:::

## Install

patterson ships through three doors. All three run the **same wizard** with the
same persisted state (`.patterson/wizard.json`), so an interrupted run can
always continue with `--resume`.

### Door 1 — bunx (canonical)

```sh
bunx create-patterson my-project
```

The `create-patterson` npm package is the canonical distribution. It works from
any machine with Bun installed.

### Door 2 — bun create

```sh
bun create patterson my-project
```

Bun's create-template flow resolves to the same package and the same wizard.

### Door 3 — GitHub template

Use the repository as a GitHub template (or clone it), then finish setup inside
the new checkout:

```sh
bunx create-patterson --resume
```

GitHub's template path can't reliably run hooks for you, so the wizard is the
documented fallback: run it once inside the fresh repo and it picks up where
the template left off.

## What `create` gives you

- A project scaffolded from one of the bundled Patterson design-system
  templates — selected interactively or entirely by flags.
- Working configuration for every agent (Claude Code, GitHub Copilot,
  opencode) and editor/environment (VS Code, Zed, devcontainer/Codespaces) you
  selected.
- A setup guide (`SETUP.md`) listing anything that cannot be automated.
- **Zero reported drift immediately after creation** — the emitted files match
  the model exactly.

Two guarantees worth knowing up front:

- **Fully offline defaults.** Templates come from a bundled snapshot; no
  network access and no claude.ai session are required.
- **Non-empty directories are refused**, with a list of what would be touched.
  Overriding requires an explicit `--force`.

## First commands

```text
patterson create [dir]    Scaffold from a design-system template (the wizard)
patterson init [--import] Adopt an existing repo — your config becomes the model
patterson sync            Re-emit every surface from the model
patterson doctor [--fix]  Drift + validity report
patterson check           Which intent reaches which agent (coverage table)
```

`create` starts fresh; `init` adopts a repo you already have. On adoption,
pre-existing agent config is treated as **hand-owned** and never overwritten —
`--import` lifts recognizable config into the project model instead.

## Flags that always work

Interactive, CI, and agent callers share one code path, so the escape hatches
are uniform:

| Flag | Applies to | Effect |
| --- | --- | --- |
| `--json` | every read command | machine-readable output |
| `--dry-run` | every write command | show planned file operations, write nothing |
| `--yes` | every write command | non-interactive mode — never clobbers, exits non-zero on conflict |
| `--accept-generated` | sync/doctor writes | the *only* way to overwrite a hand-edited emitted file |

Every interactive prompt is resolvable by a flag, so anything you can do in
the wizard you can script.

## Run from source

Until the packages are published, work from the repo:

```sh
bun install
bun test        # you're in
```

Bun is the only runtime (`bun.lock` is the only lockfile). See the
contributing guide for the phase plan and workspace layout.

## Where next

- [Why patterson?](/start/why-patterson/) — the drift problem this tool exists
  to solve.
- [The canonical model](/concepts/canonical-model/) — how one config file
  compiles to every surface.
- [Drift safety](/concepts/drift-safety/) — why regeneration never eats your
  hand edits.
