---
title: Contributing
description: Workspace layout, quality gates, the seven-principle constitution, the spec tree, and the phase roadmap.
sidebar:
  order: 1
---

```sh
bun install
bun test        # you're in
```

patterson is a spec-driven build. Read `AGENTS.md` at the repo root
first (`CLAUDE.md` is a symlink to it — we practice what we compile),
then the spec tree below. The constitution is binding.

## Workspace layout

A Bun-workspaces monorepo. `bun.lock` is the only lockfile — never
npm/pnpm/yarn.

```text
packages/core         # IR schema, config loader, command registry, emit engine, checks
packages/emitters/*   # one package per target surface + cross (chain guard, coverage)
packages/design       # vendored design-system snapshot + materializer
packages/skills       # pinned skills-CLI wrapper (bunx skills@1.5.21), lockfile READER
packages/generators   # patterson new …
packages/tutor        # P7: engine, progress, tracks (feature-gated extension)
packages/mcp          # stdio MCP server over core registry (no prompt code in graph)
packages/cli          # citty tree + @clack wizard (step registry)
packages/create-patterson  # npm shim
templates/            # scaffold targets
```

Two structural rules to internalize before writing code:

- `cli` and `mcp` are thin frontends over `core`'s command registry —
  commands are defined once, surfaced twice (Constitution III).
- Emitters return `FileOp[]` **intent**; only core's emit engine touches
  disk. The engine owns provenance, drift comparison, and the
  never-write guard.

## Gate commands

Every phase (and every commit) must be green on:

```sh
bun test                  # all packages
bunx tsc --noEmit         # typecheck (root tsconfig covers packages/**)
bunx oxlint .             # lint
```

Git hooks run via lefthook (`bunx lefthook install` once per clone).
Commits follow conventional-commit form (commitlint; sentence-case
subjects allowed), and commit messages record socket scores for any
dependency changes.

## The constitution in brief

The [constitution](https://github.com/patterson-agents/cli/blob/main/.specify/memory/constitution.md)
(v1.0.0) has seven binding principles. Summary — the full text wins on
any nuance:

| # | Principle | In one line |
| --- | --- | --- |
| I | Canonical IR first | Every emitted file is a pure function of the `PattersonProject` model: `compile(ir, target) → FileOp[]`. Features are IR changes plus re-emission, never ad-hoc file edits. |
| II | Drift safety & the never-write list **(non-negotiable)** | Provenance recorded for every write; hand edits are kept and reported, never clobbered; non-interactive runs exit non-zero on conflicts; `--accept-generated` is the only overwrite path. The CLI never writes `skills-lock.json`, the global `.skill-lock.json`, or `.claude/settings.local.json` beyond first creation. |
| III | One registry, two frontends | Commands are defined once in a typed registry and surface as both CLI subcommands and MCP tools. Core handlers are prompt-free; interactive decisions become structured "decision required" outcomes. |
| IV | Supply-chain gate **(non-negotiable)** | Socket-score every dependency before install; surface any dimension < 90 for confirmation; pin everything; `@latest` is forbidden; the hard denylist is absolute. |
| V | Verified facts or spikes | Every claim an emitter encodes about an external surface cites a primary source or a named spike. Research summaries are not primary sources. |
| VI | Licensing boundaries | Embedded content respects its source license: MIT/CC-BY adapted with attribution; NC sources taught as concepts with link-outs; unlicensed sources link-only. Certification language is always *preparation*, never issuance. |
| VII | Walking skeleton & spike-before-dependent-work | Phased, individually shippable increments; one end-to-end path before breadth; each phase's spikes run first and gate fan-out; cut lines are explicit and cutting deletes zero earlier code. |

## The spec tree

Everything lives under `specs/001-patterson-cli-v1/`. On drift between
the spec tree and any other document, **the spec tree wins**.

| Document | Role |
| --- | --- |
| `.specify/memory/constitution.md` | The seven binding principles (above) |
| `spec.md` | WHAT and WHY — user stories, functional requirements, success criteria |
| `plan.md` | HOW — technical context, architecture, phasing contract |
| `research.md` | Load-bearing decisions D1–D12 and the spike registry S1–S7 with resolutions |
| `data-model.md` | The IR: every entity, validation rule, and emit mapping |
| `contracts/` | Command-registry contract (CLI ↔ MCP parity) and the emitter contract |
| `quickstart.md` | Dev setup and how to run the walking skeleton |
| `tasks.md` | Dependency-ordered tasks (P0–P2a detailed; later phases are epics until their boundary) |

Before implementing anything, find the decision or spike that covers it.
If your work depends on an unverified claim about an external tool's
behavior, that's a spike, not an assumption (Principle V).

## Phase roadmap

Delivery is walking-skeleton phased; a phase is complete only when
typecheck, tests, and lint are green and the phase's demo runs.

| Phase | Delivers | Status |
| --- | --- | --- |
| Stage 0 | speckit spec tree, constitution v1.0.0 | ✅ shipped |
| P0 | Bun-workspaces monorepo (15 packages) | ✅ shipped |
| P1 | core: IR · command registry · emit engine · checks (spike S1) | ✅ shipped |
| P2a | Walking skeleton: Claude Code end-to-end — create/init → emit → sync → doctor (spikes S2, S3) | 🚧 in flight |
| P2b | Copilot · opencode · Zed (S6) · VS Code emitters + cross-surface checks | planned |
| P3 | Design templates + the full create wizard (S5) | planned |
| P4 | Skills · marketplaces · `mcp serve` | planned |
| P5 | Generators (`patterson new …`) | planned |
| P6 | CI standards · `doctor --fix` (S7) | planned |
| P7 | Tutor | planned |
| P8 | Polish · compiled binaries (S4) | planned |

Explicit cut lines: the Zed and VS Code editor targets may move to v1.1
if schedule forces it, and the tutor is cleanly cuttable — in both
cases without deleting earlier code (Principle VII).

## Project-local skills

Agent skills for this repo are installed via the pinned skills CLI, with
canonical copies in `.agents/skills/` symlinked into `.claude/skills/`.
Only the skills CLI writes `skills-lock.json`.
