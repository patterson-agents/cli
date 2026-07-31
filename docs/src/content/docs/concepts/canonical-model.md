---
title: The canonical model
description: One PattersonProject IR, a pure compile step, one emitter per surface, and a coverage report for everything that can't round-trip.
sidebar:
  order: 1
---

patterson's core claim — regeneration you can trust — rests on a single
architectural rule: **every emitted file is a pure function of one canonical
model**. This page walks the pipeline: the IR, the compile step, the emitters,
and the coverage report.

:::note[Status]
The IR schema, config loader, and emit engine shipped in P1. The first
emitter (Claude Code) is in flight as the P2a walking skeleton; Copilot,
opencode, Zed, and VS Code emitters are planned for P2b, with
devcontainer/Codespaces and GitHub Actions in P6. Coverage examples below that
involve those later surfaces describe the specified design.
:::

## The IR: `PattersonProject`

The intermediate representation lives in your project as
`patterson.config.ts` or `patterson.config.jsonc` (exactly that filename
pair). It is a zod-validated schema describing everything about the project's
AI-assisted setup:

| Field | What it holds |
| --- | --- |
| `targets` | which surfaces are opted in (`claude-code`, `copilot`, `opencode`, `zed`, `vscode`, `devcontainer`, `codespaces`, `github-actions`) |
| `instructions` | instruction blocks — guidance for agents, optionally path-scoped |
| `skills` | skill definitions with a per-agent link mode (symlink or copy) |
| `agents` / `commands` | custom subagents and reusable commands/prompts |
| `mcp` | MCP server definitions — stdio or remote transports, secrets as references |
| `policy` | allow/deny/ask permission rules |
| `models` | default, fallback, and per-agent model choices |
| `hooks` | agent hooks and git hooks — deliberately never merged into one concept |
| `marketplaces` / `extensions` | plugin marketplaces and editor extension recommendations |
| `env` | devcontainer/Codespaces environment and Copilot setup steps |
| `devops` | CI workflows, lint, commit conventions, release automation |
| `emit` | emission policy, e.g. what to do when a scope can't be expressed |

The schema is **strict**: unknown keys at any level are errors, not silently
stripped. If the config parses, everything in it is meaningful.

### Values that refuse to be strings

Three value types exist because strings cannot round-trip across surfaces:

- **`SecretRef`** — secrets are structured references (`env`, `prompt`,
  `pick`, `command`, `helper`), never interpolated strings. Each surface has
  its own secret-interpolation syntax; a node can be rendered into any of
  them, a string cannot. The schema actively rejects `${…}`-style
  interpolation in machine surfaces.
- **`Exec`** — commands are `argv: string[]`, never a shell string. Some
  surfaces take an argv array, others take command + args; splitting and
  joining strings is lossy in both directions.
- **`Scope`** — path scoping is a list of globs, rendered as Claude's
  `paths:`, Copilot's comma-joined `applyTo`, or reported as unreachable where
  a surface has no scoping at all.

## Compile: pure functions from model to files

Every emitter implements one function:

```ts
compile(ir: PattersonProject, snapshot: FsSnapshot): FileOp[]
```

- `snapshot` is a read-only view of the current target files, used only to
  compute merges. Emitters may read nothing else — not the network, not the
  environment, not the clock.
- The output is a list of **file operations** — *intent*, not writes. Each
  `FileOp` declares its path, format, and a mode:

| Mode | Meaning |
| --- | --- |
| `own` | patterson owns the whole file and may rewrite it (still drift-guarded) |
| `merge` | patterson owns specific regions/key-paths inside a shared file |
| `instruct` | the surface can't be written programmatically — rendered as a step in `SETUP.md` instead of silently omitted |

- Compilation is **deterministic**: same IR + same snapshot ⇒ byte-identical
  output. Sorted keys, stable ordering, no timestamps in content. This is what
  makes drift detection sound — if emission weren't reproducible, "differs
  from what we emitted" would be meaningless.

Only the core emit engine touches disk. It owns provenance recording, drift
comparison, sentinel management, key-path surgery, and the never-write guard —
see [drift safety](/concepts/drift-safety/).

## Emitters: one package per surface

Each target surface has an isolated emitter package with its own fixture
tests (model in → files out, golden-compared):

| Emitter | Writes (native format) |
| --- | --- |
| `claude-code` | `.claude/settings.json`, `CLAUDE.md` shim, `.mcp.json`, skills/agents/commands dirs |
| `copilot` | `.github/copilot-instructions.md`, `*.instructions.md`, `*.agent.md`, `*.prompt.md`, setup steps |
| `opencode` | `opencode.json(c)`, `.opencode/*`, `skills.paths` wiring |
| `vscode` | `.vscode/mcp.json` (servers + inputs), settings, extensions, tasks |
| `zed` | `.zed/settings.json`, instruction-chain conflict detection |
| `devcontainer` | `devcontainer.json` — one emitter compiles both the `devcontainer` and `codespaces` targets |
| `github-actions` | least-privilege workflows, release automation, supply-chain scanning |
| `cross` | cross-surface checks: the Zed instruction-chain guard, the coverage reporter |

Instructions illustrate why the compile rule matters: the widest artifact is
`AGENTS.md`; `CLAUDE.md` is emitted as a shim that imports it; Copilot — which
has no import syntax — gets a real copy. One idea in the model, three correct
spellings on disk, and none of them can drift from each other because none of
them is hand-maintained.

## Coverage: declared reachability

Not every concept can reach every surface, and patterson refuses to pretend
otherwise. An emitter that receives an entity it cannot express must return a
**coverage gap** — entity, target, reason, and the fallback applied — rather
than silently dropping it. `patterson check` aggregates these into a table:
every configured intent is either *reached* or *named with a reason and
fallback*.

Real examples from the specification:

- opencode has no path-scoped instructions — a scoped block falls back per
  your configured `emit.scopeFallback` (`inline`, `drop`, or `error`), and the
  report says so.
- WebSocket MCP transports are reachable only on Claude Code; elsewhere the
  gap is reported.
- Zed reads exactly one rules file by first-match search order — `check`
  scans the whole chain (including files patterson never wrote, like a
  leftover `.cursorrules`), names the file that actually wins, and offers
  fixes.

The coverage report also covers conflicts caused by files patterson did *not*
write — because "your instruction is configured but a foreign file shadows it"
is exactly the kind of silent failure this tool exists to eliminate.
