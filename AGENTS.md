# AGENTS.md

Guidance for coding agents working in this repository. `CLAUDE.md` is a symlink to this
file — edit `AGENTS.md`, and both names stay in sync.

**patterson** — a create-react-app-style scaffolder + AI-agent configuration manager
(agents, editors, skills, plugins, MCP, generators, CI, tutor). Bun workspaces monorepo.

## Source of truth

Read these before implementing anything:

- `.specify/memory/constitution.md` — 7 binding principles. Especially: II drift
  safety + **never-write list** (`skills-lock.json`, global `.skill-lock.json`,
  `.claude/settings.local.json` beyond first creation), IV supply-chain gate
  (socket-score every dep before install, pin everything, no `@latest`).
- `specs/001-patterson-cli-v1/` — spec.md (WHAT) → plan.md (HOW) → research.md
  (decisions D1–D12 + spikes S1–S7) → data-model.md (IR) → contracts/ → tasks.md.
  On drift between spec tree and any other doc, **the spec tree wins**.

## Runtime & commands

**Bun only.** `bun.lock` is the only lockfile — never npm/pnpm/yarn.

```sh
bun install
bun test                  # all packages
bunx tsc --noEmit         # typecheck (root tsconfig covers packages/**)
bunx oxlint .             # lint
```

Git hooks via lefthook (`bunx lefthook install` once per clone); commits follow
conventional-commit form (commitlint; sentence-case subjects allowed).

## Layout

```
packages/core         # IR schema, config loader, command registry, emit engine, checks
packages/emitters/*   # one package per target surface + cross (chain guard, coverage)
packages/design       # vendored design-system snapshot + materializer
packages/skills       # pinned skills-CLI wrapper (bunx skills@1.5.21), lockfile READER
packages/generators   # patterson new …
packages/mcp          # stdio MCP server over core registry (no prompt code in graph)
packages/cli          # citty tree + @clack wizard (step registry)
packages/create-patterson  # npm shim
templates/            # scaffold targets
```

`cli` and `mcp` are thin frontends over `core`'s command registry — commands are
defined once, surfaced twice (Constitution III). Emitters return `FileOp[]` intent;
only core's emit engine touches disk.

## Project-local skills

Installed via `bunx skills@1.5.21` (pinned devDependency): speckit-* (spec workflow),
find-skills, opentui, claude-command-converter — canonical copies in
`.agents/skills/`, symlinked into `.claude/skills/`. `gh-skill-creator` and
`readme-updater` were added manually by the user. Only the skills CLI writes
`skills-lock.json`.
