---
title: Target surfaces
description: What patterson writes for each target, and where each surface can't express the model.
sidebar:
  order: 3
---

:::note[Status]
Emitter delivery is phased: **Claude Code** lands with the P2a walking
skeleton (in flight); **Copilot, opencode, Zed, VS Code** land in P2b;
**devcontainer/Codespaces and GitHub Actions** land in P6. Zed and VS Code
carry a sanctioned contingency cut line to v1.1. Everything on this page is
the specified emitter contract, not a description of shipped behavior beyond
P2a's scope.
:::

Every surface is compiled from the one canonical model by a dedicated emitter:
`compile(ir, snapshot) → FileOp[]`. Emitters produce *intent*; the core emit
engine applies it safely — provenance, drift comparison, sentinel management,
backups, and the never-write guard all live in the engine.

## File matrix

| Target | Files patterson writes | Phase |
| --- | --- | --- |
| **Claude Code** | `.claude/settings.json` · `CLAUDE.md` (shim) · `.mcp.json` · `.claude/skills/` (links) · `.claude/agents/` · hooks (in settings) · plugins/marketplaces | P2a |
| **GitHub Copilot** | `.github/copilot-instructions.md` · `.github/instructions/*.instructions.md` · `.github/agents/*.agent.md` · `.github/prompts/*.prompt.md` · skills copies · `copilot-setup-steps.yml` | P2b |
| **opencode** | `opencode.json(c)` · `.opencode/agent/` · `.opencode/command/` · `skills.paths` wiring | P2b |
| **VS Code** | `.vscode/mcp.json` · `.vscode/settings.json` · `.vscode/extensions.json` · tasks | P2b |
| **Zed** | `.zed/settings.json` · instruction-chain conflict detection | P2b |
| **devcontainer / Codespaces** | `devcontainer.json` · prebuild-aware lifecycle · badge | P6 |
| **GitHub Actions** | least-privilege workflows · release with provenance · supply-chain scanning · lefthook/commitlint | P6 |

## Emission tiers

Each file operation declares one of three tiers, truthfully:

- **own** — patterson owns the whole file (still provenance-tracked; hand
  edits are still detected and preserved).
- **merge** — patterson owns specific sentinel blocks (markdown) or key paths
  (JSON/JSONC) inside a file it shares with you or other tools.
- **instruct** — the surface cannot be written programmatically; the step is
  rendered into `SETUP.md` and a final prompt note, never silently omitted.

### The never-write list

Some files are owned by other tools and are **never** written, in any mode:
`skills-lock.json`, the global `.skill-lock.json` (and its XDG variant), and
`.claude/settings.local.json` beyond first creation. This is enforced by a
test that runs the full suite and asserts these paths were never opened for
write.

## Claude Code

| File | Tier | Notes |
| --- | --- | --- |
| `.claude/settings.json` | merge | Key-path surgery; validated against the vendored settings schema (spike S2) |
| `CLAUDE.md` | own | A shim — `@AGENTS.md` reference plus tail; `AGENTS.md` carries the widest instruction artifact |
| `.mcp.json` | merge | Paths use the `${CLAUDE_PROJECT_DIR:-.}` form |
| `.claude/skills/<name>` | own | Symlink by default, copy fallback, per skill `linkMode` |
| `.claude/agents/<name>.md` | own | One file per agent definition |

Reachability caveats:

- **Settings merge semantics (C8)**: Claude Code permission arrays
  *concatenate* across settings scopes — a project scope cannot remove an
  entry granted by a wider scope. patterson emits per-key according to a
  verified merge-semantics table and *reports* the removal-impossible
  consequence rather than pretending otherwise.
- **Skills discovery (C9 / spike S3)**: empirically verified — Claude Code
  does **not** scan `.agents/skills/`. The `.claude/skills/<name>` link is
  therefore mandatory for every skill targeting Claude Code; installing to
  the canonical location alone is not enough.
- **`ws` MCP transport** is reachable only on Claude Code; on every other
  surface it is a reported coverage gap.

## GitHub Copilot

| File | Tier | Notes |
| --- | --- | --- |
| `.github/copilot-instructions.md` | own | A real copy of the instructions — Copilot has no import syntax |
| `.github/instructions/*.instructions.md` | own | Path-scoped instructions; `applyTo:` is the globs joined into one comma-separated string (C5) |
| `.github/agents/*.agent.md` | own | The current `.agent.md` era (`agent:` keys) — not the retired `.chatmode.md` format |
| `.github/prompts/*.prompt.md` | own | Compiled from command definitions |
| `.github/workflows/copilot-setup-steps.yml` | own | Coding-agent environment setup |

Reachability caveats:

- **Coding agent is instruct-mode always**: its MCP configuration cannot be
  written as a file — patterson renders it into `SETUP.md`, requires `tools[]`
  on targeted MCP servers (warning plus `["*"]` blob otherwise), and secrets
  travel as a `COPILOT_MCP_*` instruction blob.
- Because instructions are a real copy (not a reference), Copilot's copy can
  drift independently — which is exactly what provenance tracking catches.

## opencode

| File | Tier | Notes |
| --- | --- | --- |
| `opencode.json(c)` | merge | MCP servers get `command: string[]` — argv verbatim, never a joined shell string (C1); `skills.paths: [".agents/skills"]` is always emitted |
| `.opencode/agent/<name>.md` | merge | Body is the agent prompt |
| `.opencode/command/<name>.md` | merge | `template` is required here |

Reachability caveats:

- **Hostile co-writer**: opencode itself writes into `.opencode/` — patterson
  never claims own-tier there.
- **No path-scoped instructions**: scoped instruction blocks fall back per
  `emit.scopeFallback` (`inline` by default), with the pairing always named
  in the coverage report.
- **`prompt`-kind SecretRefs** cannot be expressed and surface as reported
  reachability gaps.

## VS Code

| File | Tier | Notes |
| --- | --- | --- |
| `.vscode/mcp.json` | merge | Top-level `servers` plus synthesized `inputs[]` for prompted secrets |
| `.vscode/settings.json` | merge | JSONC comments preserved via key-path surgery |
| `.vscode/extensions.json` | merge | Recommendations from `extensions` in the model |
| `.vscode/tasks.json` | merge | Tasks |

## Zed

| File | Tier | Notes |
| --- | --- | --- |
| `.zed/settings.json` | merge | Context servers have **no** `type` discriminator — field presence discriminates transport |

Reachability caveats:

- **One rules file, first match wins (C7)**: Zed reads exactly *one*
  instructions file by a first-match search order — including files patterson
  never wrote, like a leftover `.cursorrules`. The cross-emitter chain guard
  scans the full chain on disk, names the actual winning file, and offers
  folds/renames as decisions instead of silently losing your instructions.
- **Project-scope context servers (spike S6, open)**: whether
  `.zed/settings.json` can carry `context_servers` at project scope is
  spike-gated; the answer decides file-mode versus instruct-mode emission.
- **Model slots**: Zed's seven model slots are reachable only via the
  `raw.zed` escape hatch.
- **Extensions**: a Zed extension recommendation implies a user-machine
  install side effect, surfaced as a warning.

## devcontainer / Codespaces

One emitter compiles both targets.

| File | Tier | Notes |
| --- | --- | --- |
| `.devcontainer/devcontainer.json` | merge | Image/Dockerfile, features, lifecycle, ports, host requirements |
| README badge | merge | Codespaces badge |

Reachability caveats:

- **Lifecycle value types are preserved (C10)**: string = shell, array =
  exec, object = parallel — patterson never normalizes between them, because
  the forms have different execution semantics.
- **Prebuilds**: only `updateContent` runs at prebuild; patterson emits a
  note so lifecycle expectations match reality.
- **Secrets are prompt-only (C15)**: devcontainer secrets are never assumed
  populated; they are rendered as prompts.
- **Community features** require explicit confirmation (a Dockerfile `RUN` is
  preferred where possible).

## GitHub Actions

| File | Tier | Notes |
| --- | --- | --- |
| `.github/workflows/*.yml` | own | `ci`, `release`, `security` workflows |
| `lefthook.yml` | own | Git hooks from `hooks.gitHooks` |
| commitlint config | own | Conventional commits |
| dependabot / renovate config | own | Per `devops.depUpdates` |

Reachability caveats:

- Workflows start from `permissions: {}` at the workflow level and set
  `persist-credentials: false` — least privilege by default.
- **Release with provenance (C13)** requires a documented Node-24
  `npm publish --provenance` step — the one sanctioned exception to the
  Bun-only rule.
- **Monorepo release (spike S7, open)**: changesets × Bun workspaces
  `workspace:*` behavior is unverified; monorepo release scaffolds ship as
  `experimental` until S7 resolves.

## Coverage, always

Whenever any surface above cannot express a configured intent, the emitter
returns a structured coverage gap — entity, target, reason, and the fallback
applied — and `patterson check` aggregates them into one table. Silent drops
are a contract violation caught by fixture tests.
