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
- `specs/001-patterson-cli-v1/contracts/` — `command-registry.md` and `emitter.md`
  define the two extension points; conform to them rather than inventing shapes.

## Runtime & commands

**Bun only.** `bun.lock` is the only lockfile — never npm/pnpm/yarn.

```sh
bun install
bun run typecheck         # tsc --noEmit (root tsconfig covers packages/**)
bun test                  # all packages
bun run lint              # oxlint .
bun run gate              # all three, in order
```

**`gate` uses `;`, not `&&`** — a failing typecheck or test does not stop the run and
does not change the exit code (only `lint`'s does). Never treat `gate` exiting 0 as
proof it passed; read all three sections of the output.

Focused runs: `bun test packages/core` (also `test:cli`, `test:emitters`, `test:mcp`),
`bun test packages/emitters/zed`, `bun run test:e2e`, or `bun test <path> -t "<name>"`.

Run the CLI from source: `bun run cli -- <args>`, or `bun run demo` for an end-to-end
scaffold into `/tmp/patterson-demo`.

Git hooks via lefthook (`bunx lefthook install` once per clone) run lint + typecheck on
commit, commitlint on the message. Conventional commits; sentence-case subjects are
allowed (`subject-case` is disabled for phase-gate commits like `P0: workspace reset`).

## Layout

```
packages/core         # IR schema, config loader, command registry, emit engine, checks
packages/emitters/*   # one package per target surface + cross (chain guard, coverage)
packages/design       # vendored design-system snapshot + materializer
packages/skills       # pinned skills-CLI wrapper (bunx skills@1.5.21), lockfile READER
packages/generators   # patterson new … (6 generators) + shared MCP handshake validator
packages/tutor        # AI-fluency tutor: lesson engine, 5 tracks, local validation
packages/mcp          # stdio MCP server over core registry (no prompt code in graph)
packages/cli          # citty tree + @clack wizard (step registry)
packages/create-patterson  # npm shim (the only non-private package)
templates/skeleton    # the scaffold skeleton — NOT the design templates
docs/                 # Astro/Starlight site, separate workspace (see below)
```

`cli` and `mcp` are thin frontends over `core`'s command registry — commands are
defined once, surfaced twice (Constitution III). Emitters return `FileOp[]` intent;
only core's emit engine touches disk.

**No build step.** Every package sets `module`/`exports`/`bin` to `src/*.ts`, and
workspace deps resolve to source. Consequences:

- Relative imports carry the **explicit `.ts` extension**
  (`import { … } from "./errors.ts"`) — `allowImportingTsExtensions` is on.
- `verbatimModuleSyntax` is on: type-only imports must say `import type`.
- `noUncheckedIndexedAccess` is on: indexing an array/record yields `T | undefined`.
- `core` uses package subpath imports internally (`#ir`, `#emit`, `#registry`,
  `#checks`); cross-package consumers import from `@patterson/core`.
- `bun run build:binary` compiles a single-file `dist/patterson` — build artifacts
  are never an input to anything else.

## Where things live that you would guess wrong

- **Design templates** are the 11 dirs under `packages/design/assets/snapshot/templates/`
  (vendored, offline). Root `templates/` holds only the scaffold `skeleton`.
- **`docs/` is not a root workspace** — root workspaces are `packages/*` and
  `packages/emitters/*` only. `docs/` has its own `bun.lock`; use
  `bun run docs:dev|docs:build|docs:preview` (they shell out with `--cwd docs`).
  Root `bun install` does not install its deps.
- **`.github/workflows/*.lock.yml` are generated** by GitHub Agentic Workflows from
  the sibling `.md` file (`gate-doctor.md`, `code-simplifier.md`) and are marked
  `linguist-generated`. Edit the `.md`, never the lock.
- **Supply-chain scores** are recorded in `docs/dep-scores.md`;
  `bun run deps:score` is the `socket package shallow npm` entry point. Commit
  messages record scores for any dependency change (Constitution IV).

## Working in core

- **Every write goes through the emit engine's single path** (`packages/core/src/emit/`).
  The never-write guard is `emit/never-write.ts` and runs both pre-flight over a batch
  and inside `applyFileOps`; `packages/core/test/never-write-suite.test.ts` locks it.
  Do not add a second write path.
- **Command handlers in core must be prompt-free.** An interactive decision is returned
  as a structured `decision-required` result naming the resolving flag; the CLI frontend
  prompts, the MCP frontend hands it to the agent.
- **Result kind → exit code** is contractual: `ok` 0, `error` 1, `conflicts` 2,
  `decision-required` 3 (`registry/registry.ts`). `registry.list()` is sorted by id —
  the MCP projection depends on that ordering.
- `registry.register` throws on a duplicate id *or* CLI path; every operation is
  defined exactly once.

## Working on emitters

Golden-fixture contract per `contracts/emitter.md`:

```
packages/emitters/<target>/test/fixtures/<case>/
  ir.json            # input IR
  before/            # optional pre-existing filesystem state
  expected/ops.json  # golden FileOp[]
  expected-gaps.json # golden CoverageGap[]
```

Fixture suites assert an explicit `EXPECTED_CASES` list, so **adding a case means
adding its name to the test file too**. Regenerate goldens with
`bun run packages/emitters/<target>/tools/gen-goldens.ts` and review the diff — the
goldens exist to catch unintentional output changes, so a large diff is a signal, not
a chore.

Target-specific invariants are asserted in the fixture suites themselves (e.g. Zed:
never write to the first-match instructions chain, project-scope-only settings keys,
no `type` discriminator on context servers). Read the header comment of the target's
`fixtures.test.ts` before changing its compiler.

## Project-local skills

Installed via `bunx skills@1.5.21` (pinned devDependency): speckit-* (spec workflow),
find-skills, opentui, claude-command-converter — canonical copies in
`.agents/skills/`, symlinked into `.claude/skills/`. `gh-skill-creator` and
`readme-updater` were added manually by the user. Only the skills CLI writes
`skills-lock.json`; `packages/skills` reads it and never writes it.
