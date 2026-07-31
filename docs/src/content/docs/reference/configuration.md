---
title: Configuration
description: The patterson.config file — every PattersonProject field, SecretRef kinds, and validation rules.
sidebar:
  order: 2
---

:::note[Status]
The IR schema and config loader shipped with **P1** (core). Many fields below
are *consumed* only by later-phase emitters — e.g. `env` and `devops` by the
P6 devcontainer/Actions emitters, `marketplaces` by P4. The schema is the
stable contract; consumption arrives phase by phase.
:::

patterson holds all agent, editor, and environment configuration in **one
canonical model** — the `PattersonProject` IR. Every emitted file is a pure
function of this model: same model, same bytes, every time.

## The config file

The model lives in exactly one of two files at the project root:

- **`patterson.config.ts`** — TypeScript, full type checking
- **`patterson.config.jsonc`** — JSONC, comment-friendly

This exact filename pair is the contract; there are no other discovery
locations. Alongside it, patterson maintains a `.patterson/` sidecar directory:
`emitted.json` (provenance), `wizard.json` (resumable wizard state),
`tutor-progress.json`, and `backup/` (pre-operation lockfile backups).

## Strictness

The IR parses **strict**:

- Unknown keys at any level are **errors**, not silently stripped.
- Duplicate entries in `targets` are rejected; unknown target ids are rejected.
- `instructions`, `skills`, `agents`, `commands`, and `mcp` entries must have
  unique ids/names.
- Interpolated secret strings (`${…}` / `{env:…}` patterns) are rejected in
  machine surfaces with a pointer to `SecretRef` (see below).

## PattersonProject fields

| Field | Type | Notes |
| --- | --- | --- |
| `version` | `1` | Literal |
| `name` | `string` | Non-empty |
| `targets` | `TargetId[]` | Global opt-in set; unknown ids and duplicates rejected |
| `instructions` | `InstructionBlock[]` | Unique ids |
| `skills` | `SkillDef[]` | Unique names |
| `agents` | `AgentDef[]` | Unique names, lowercase-hyphen |
| `commands` | `CommandDef[]` | Unique names |
| `mcp` | `McpServerDef[]` | Unique names; reserved names rejected |
| `policy` | `PolicyDef` | Permissions / allow-deny-ask |
| `models` | `ModelDef` | Default, fallback, per-agent models |
| `hooks` | `{ agentHooks: AgentHookDef[]; gitHooks: GitHookDef[] }` | Two distinct concepts, never merged |
| `marketplaces` | `MarketplaceRef[]` | Claude and Copilot marketplaces, pinned |
| `extensions` | `ExtensionRec[]` | Editor extension recommendations |
| `env` | `EnvironmentDef` | devcontainer / Codespaces / copilot-setup-steps |
| `devops` | `DevopsDef` | CI workflows, lint, commit, release, dep updates |
| `emit` | `EmitPolicy` | Emission behavior, incl. `scopeFallback` |

### Targets

```ts
type TargetId =
  | "claude-code" | "copilot" | "opencode"
  | "zed" | "vscode"
  | "devcontainer" | "codespaces"
  | "github-actions";
```

`codespaces` is compiled by the devcontainer emitter — one emitter, two
targets. Tutor state is **not** part of the core IR (it is a P7-gated
extension module).

## Shared value types

### SecretRef

Secrets are never inline values — they are reference nodes, rendered to each
surface's native syntax at emit time:

| Kind | Shape | Meaning |
| --- | --- | --- |
| `env` | `{ kind: "env", name, default? }` | Read from an environment variable |
| `prompt` | `{ kind: "prompt", id, description, password? }` | Ask the user at setup time |
| `pick` | `{ kind: "pick", id, options[] }` | Choose from fixed options |
| `command` | `{ kind: "command", id, command, args? }` | Value produced by running a command |
| `helper` | `{ kind: "helper", command }` | Credential-helper style resolution |

Rules:

- Interpolated secret strings are **forbidden in machine surfaces** —
  `Exec.env` values, `Exec.argv`/`cwd`, remote-transport headers, and git-hook
  argv. The schema rejects `${` / `{env:` patterns there.
- **Prose surfaces are exempt**: instruction bodies, agent prompts, and command
  templates may legitimately discuss `${VAR}` syntax.
- When a surface cannot express a kind (e.g. `prompt` on opencode), the emitter
  raises a *reported* reachability gap in `patterson check` — never a silent drop.

### Exec

```ts
{ argv: string[]; cwd?: string; env?: Record<string, string | SecretRef> }
```

`argv` is non-empty and is **never joined into a shell string** — opencode
receives argv verbatim; other surfaces receive `argv[0]` plus the rest.

### Scope

```ts
{ globs: string[] }
```

Emitted as Claude Code `paths: [...]` and Copilot `applyTo:` (globs joined
with commas). opencode has no path-scoped instructions — see
`emit.scopeFallback` below.

## Entity notes

- **InstructionBlock** — `{ id, body, scope?, reach: "universal" | "path-scoped", targets?, raw? }`.
  Compiles to `AGENTS.md` (the widest artifact), a `CLAUDE.md` shim
  (`@AGENTS.md` reference plus tail), and a real copy in
  `.github/copilot-instructions.md` (Copilot has no import syntax).
- **SkillDef** — `{ name, description (≤1024), body, files?, allowedTools?, linkMode: "symlink" | "copy", targets?, raw? }`.
  `name` matches `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`, ≤64 chars, no `--`;
  **directory name must equal the declared name** — enforced at emit and by
  `patterson new skill`.
- **AgentDef** — `{ name, description, prompt, tools?, model?, targets?, raw? }`.
- **CommandDef** — `{ name, description?, template, args?, targets?, raw? }`.
  `template` is required on opencode.
- **McpServerDef** — `{ name, transport, tools?, timeoutMs?, scope: "project" | "user" | "local", targets?, raw? }`
  where `transport` is `{ kind: "stdio", exec }` or
  `{ kind: "http" | "sse" | "ws", url, headers?, oauth? }`. Reserved names
  (`workspace`, `claude-in-chrome`, `computer-use`, …) are rejected. `ws`
  transport is reachable only on Claude Code — reported elsewhere. `tools[]`
  is required when the Copilot coding agent is targeted (otherwise a warning
  plus a `["*"]` instruct blob).
- **PolicyDef** — `{ allow[], deny[], ask[], additionalDirectories?, defaultMode?, opencode?: raw }`.
  On Claude Code, permission arrays *concatenate* across settings scopes —
  removal from a lower scope is impossible, and patterson reports that
  consequence rather than hiding it.
- **ModelDef** — `{ default?, fallback?, perAgent?, raw? }`. Whole-value
  override semantics on Claude Code; Zed's seven model slots are reachable
  only via `raw.zed`.
- **AgentHookDef / GitHookDef** — never unified. Agent hooks
  (`{ event, matcher?, exec, targets? }`) compile to Claude Code
  `settings.hooks`; git hooks (`{ stage, argv[] }`) compile to `lefthook.yml`.
  opencode plugins are not generated in v1 (raw escape hatch only).
- **MarketplaceRef** — `{ id, kind: "claude" | "copilot", source, pin?: { sha | tag }, plugins?: string[] }`.
- **ExtensionRec** — `{ id, targets? }` → `.vscode/extensions.json`
  recommendations and devcontainer `customizations.vscode.extensions`; a Zed
  extension's user-machine install side effect is surfaced as a warning.
- **EnvironmentDef** — image/Dockerfile, features (guarded), lifecycle
  commands, ports, secrets (`SecretRef[]`, prompt-only), host requirements,
  Copilot setup steps. Lifecycle values keep their author-provided type
  (string = shell, array = exec, object = parallel) — normalization is
  forbidden. Only `updateContent` runs at prebuild.
- **DevopsDef** — `{ workflows: ("ci" | "release" | "security")[], lint: "oxlint" | "biome" (exactly one), commit?, release?: { provenance, monorepo?: "experimental" }, depUpdates?: "renovate" | "dependabot-actions-only" }`.

## EmitPolicy and `scopeFallback`

```ts
emit: {
  scopeFallback: "inline" | "drop" | "error"   // default: "inline"
}
```

`scopeFallback` decides what happens when a **path-scoped instruction** targets
a surface that cannot express path scoping (opencode):

| Value | Behavior |
| --- | --- |
| `"inline"` *(default)* | Fold the scoped instruction into the surface's global instructions, with the scope stated in prose |
| `"drop"` | Omit it from that surface |
| `"error"` | Fail emission |

Whatever the setting, the pairing is always named in the `patterson check`
coverage report — 100% of configured intents are accounted for: reached, or
named with a reason and the applied fallback.
