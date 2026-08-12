---
title: Commands
description: The full patterson command surface — every group, flag, and exit code.
sidebar:
  order: 1
---

:::note[Status]
patterson is mid-build. P0 (monorepo) and P1 (core: IR, command registry, emit
engine) have shipped. The commands below are the **specified v1 surface**: the
core loop (`create` / `init` / `sync` / `doctor` / `check`) lands end-to-end for
Claude Code in **P2a** (in flight), other agent/editor emitters follow in
**P2b**, and the remaining groups arrive in the phase noted on each section.
Nothing on this page should be read as shipped unless its phase is P0–P1.
:::

Every command is defined once, in a typed command registry, and surfaced twice:
as a CLI subcommand and as an MCP tool (`patterson mcp serve`). Interactive, CI,
and agent callers share one code path — every prompt is resolvable by a flag.

## Global conventions

| Flag | Applies to | Meaning |
| --- | --- | --- |
| `--json` | every read command | Print machine-readable output shaped by the command's output schema |
| `--dry-run` | every write command | Return the planned file operations; write nothing |
| `--yes` | every write command | Non-interactive mode; prompts resolve to defaults, conflicts fail safe |
| `--force` | destructive commands | Required opt-in for destructive operations (e.g. `create` into a non-empty directory) |
| `--accept-generated` | sync-class writes | The **only** way to overwrite hand-edited (drifted) content; without it, edits are kept and reported |

Non-interactive runs (`--yes`, `--json`, MCP) never clobber drifted files: they
keep your edits, report every conflict, and exit non-zero.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | Error |
| `2` | Conflicts preserved — drift was detected, your edits were kept and reported; re-run with `--accept-generated` to overwrite |
| `3` | Decision required (non-interactive) — a choice must be resolved by a flag; the output names the resolving options |

## Command tree

```text
patterson create [dir]         Scaffold from a design-system template (the wizard)
patterson init [--import]      Adopt an existing repo — your config becomes the model
patterson sync                 Re-emit every surface from the model
patterson doctor [--fix]       Drift + validity report
patterson check                Which intent reaches which agent (coverage table)

patterson agents    list · add · remove · sync
patterson skills    list · search · add · remove · update      (skills.sh ecosystem)
patterson plugins   list · add · remove · marketplace …
patterson mcp       list · add · remove · serve                (serve = be an MCP server)
patterson design    templates · pull · refresh · tokens
patterson editor    vscode · zed · devcontainer · codespaces
patterson ci        init · add <workflow> · sync
patterson new       skill · mcp-server · plugin · claude-plugin · marketplace · command ·
                    cli-plugin · starlight-site · vitepress-site
patterson tutor     [topic] · list · resume · status
```

## Core loop

:::note[Status]
Delivered by **P2a** (in flight) for the Claude Code target end-to-end;
**P2b** extends the same commands to Copilot, opencode, Zed, and VS Code.
:::

| Command | What it does | Key flags |
| --- | --- | --- |
| `create [dir]` | Scaffold a new project from one of the 11 bundled design-system templates via a guided wizard. Fully offline by default. Refuses non-empty directories, listing what would be touched. | `--force` (override non-empty refusal), `--dry-run`, `--yes`, template/agent selection flags, `--resume` (wizard state persists in `.patterson/wizard.json`) |
| `init [--import]` | Adopt an existing repository. Pre-existing config is treated as hand-owned; `--import` lifts recognizable config into the project model instead of overwriting it. | `--import`, `--dry-run`, `--yes` |
| `sync` | Re-emit every surface from `patterson.config.ts`. Hand edits survive; conflicts are reported and exit code `2` is returned in non-interactive mode. | `--dry-run`, `--yes`, `--accept-generated` |
| `doctor [--fix]` | Report drift and validity across all emitted surfaces. | `--fix` (P6), `--json` |
| `check` | Coverage report: which configured intent reaches which target, and *why not* where a surface can't express it — including conflicts caused by files patterson never wrote. | `--json` |

## `patterson agents`

:::note[Status]
Agent definitions compile through the same emitters as the core loop — Claude
Code in **P2a**, the rest in **P2b**.
:::

| Subcommand | What it does |
| --- | --- |
| `list` | List configured agent definitions (`--json`) |
| `add` | Add an agent definition to the model and re-emit |
| `remove` | Remove an agent definition and re-emit |
| `sync` | Re-emit agent files for all targets |

## `patterson skills`

:::note[Status]
Delivered in **P4**. patterson wraps the pinned upstream skills CLI
(`skills@1.5.21` via `bunx`) — it never reimplements install/lock logic and
never writes `skills-lock.json`.
:::

| Subcommand | What it does |
| --- | --- |
| `list` | List installed skills and per-agent visibility (`--json`) |
| `search` | Search the skills.sh ecosystem |
| `add` | Install a skill once — canonical copy in `.agents/skills/<name>`, linked into each configured agent |
| `remove` | Remove a skill and its per-agent links |
| `update` | Update installed skills via the upstream tool |

Before any operation that shells out to the upstream tool, patterson backs up
the lockfile to `.patterson/backup/` — the upstream lockfiles are self-wiping
on corruption, and a corrupted lockfile is backed up rather than lost.

## `patterson plugins`

:::note[Status]
Delivered in **P4**. Covers Claude Code plugins/marketplaces (official
Anthropic marketplaces) and the awesome-copilot catalog at a pinned revision.
:::

| Subcommand | What it does |
| --- | --- |
| `list` | List registered plugins and marketplaces (`--json`) |
| `add` | Install a plugin |
| `remove` | Remove a plugin |
| `marketplace …` | Register / manage marketplaces (pinned SHAs or tags — `@latest` is forbidden) |

## `patterson mcp`

:::note[Status]
MCP server *definitions* are emitted by the core loop (**P2a/P2b**);
`mcp serve` — the CLI exposing itself as an MCP server — lands in **P4**.
The stdio handshake was already spike-verified against real Claude Code (S1).
:::

| Subcommand | What it does |
| --- | --- |
| `list` | List configured MCP server definitions (`--json`) |
| `add` | Add an MCP server definition to the model and emit it to every configured surface |
| `remove` | Remove a definition and re-emit |
| `serve` | Run patterson itself as a stdio MCP server: every registry command becomes a tool (`patterson_<id>`), prompts become structured "decision required" results, and drift returns a structured conflict list instead of a clobbered file |

Over MCP, read and write operations are separate tools with
`readOnlyHint`/`destructiveHint` annotations. stdout is JSON-RPC exclusively;
all logging goes to stderr.

## `patterson design`

:::note[Status]
Delivered in **P3** with the full create wizard. Templates always work from
the bundled offline snapshot; live refresh needs an authenticated session.
:::

| Subcommand | What it does |
| --- | --- |
| `templates` | List the 11 bundled design-system templates (`--json`) |
| `pull` | Pull design-system assets into the project |
| `refresh` | Refresh the bundled snapshot when an authenticated session exists; without one, exits `0` with a snapshot-age message |
| `tokens` | Work with design tokens |

## `patterson editor`

:::note[Status]
VS Code and Zed emitters land in **P2b**; devcontainer and Codespaces in
**P6**. VS Code and Zed carry a sanctioned contingency cut line to v1.1.
:::

| Subcommand | What it does |
| --- | --- |
| `vscode` | Emit/manage `.vscode/` configuration (MCP servers, settings, extensions, tasks) |
| `zed` | Emit/manage Zed settings, including instruction-chain conflict detection |
| `devcontainer` | Emit/manage `devcontainer.json` (prebuild-aware lifecycle) |
| `codespaces` | Codespaces-specific additions (badge, prebuild notes) — compiled by the devcontainer emitter |

## `patterson ci`

:::note[Status]
Delivered in **P6**. Release scaffolds for Bun monorepos are gated on spike
S7 and marked experimental until it resolves.
:::

| Subcommand | What it does |
| --- | --- |
| `init` | Generate CI/devops standards for a Bun project: least-privilege workflows, commit conventions, git hooks (lefthook), release automation with provenance, supply-chain scanning |
| `add <workflow>` | Add a specific workflow (`ci`, `release`, `security`) |
| `sync` | Re-emit CI artifacts from the model |

## `patterson new`

:::note[Status]
Delivered in **P5**. Every generated artifact passes its own validation
immediately — a generated MCP server answers a real JSON-RPC handshake; a
generated skill passes upstream ecosystem validation.
:::

| Subcommand | What it generates |
| --- | --- |
| `skill` | A skill (directory name enforced equal to declared name) |
| `mcp-server` | An MCP server with a passing protocol self-test |
| `plugin` | A patterson plugin package |
| `claude-plugin` | A Claude plugin (`.claude-plugin/plugin.json` + a provenance-complete skill) |
| `marketplace` | A plugin marketplace |
| `command` | A new patterson subcommand (appears in help after restart) |
| `cli-plugin` | A distributable patterson CLI plugin |
| `starlight-site` | A Patterson-branded Starlight docs site, from the vendored template |
| `vitepress-site` | A Patterson-branded VitePress docs site, from the vendored template |

Generators optionally run an AI-assisted plan-first interview (`--plan`).

### Site generators

`starlight-site` and `vitepress-site` copy a vendored, install-verified template —
version pins and committed `bun.lock` included — into `<name>/`, rewriting only
`package.json`'s `name` to the target directory. Nothing is fetched; the bytes ship as
package assets, and their canonical home and content digests are recorded in
`packages/generators/assets/site-templates/_SOURCES.md`.

They **refuse a non-empty target** and write nothing at all, exiting with
`TARGET_REFUSED`. There is deliberately no `--force`: the whole target is template
content, so overwriting could only destroy existing work. This is the intended
difference from `bun create`, which replaces an existing directory's contents without
a prompt.

## `patterson tutor`

:::note[Status]
Delivered in **P7** (last, by design — it consumes every other subsystem, and
is cuttable without touching earlier phases).
:::

| Subcommand | What it does |
| --- | --- |
| `[topic]` | Start or continue a track: AI-fluency foundations, Claude Code, Copilot, MCP |
| `list` | List tracks and lessons |
| `resume` | Resume from persisted progress (`.patterson/tutor-progress.json`) |
| `status` | Show progress per track |

Lesson steps validate real changes in your real project — a learner who did
not perform the action cannot pass the step. Certification tracks *prepare*
you for official credentials (Anthropic Academy, GitHub Skills, MS Learn) with
attribution and link-outs; they never issue credentials.
