# Data Model: Patterson CLI v1

The IR is the product. Every entity below lives in `packages/core/src/ir/` as a zod v4
schema with a derived TS type. Validation rules cited to conflicts (C-numbers) are
non-negotiable; see research.md and the constitution.

## Root

### PattersonProject
| Field | Type | Rules |
| --- | --- | --- |
| version | `1` | literal |
| name | string | non-empty |
| targets | TargetId[] | global opt-in set; unknown ids rejected |
| instructions | InstructionBlock[] | ids unique |
| skills | SkillDef[] | names unique |
| agents | AgentDef[] | names unique, lowercase-hyphen |
| commands | CommandDef[] | names unique |
| mcp | McpServerDef[] | names unique; reserved names rejected |
| policy | PolicyDef | |
| models | ModelDef | |
| hooks | { agentHooks: AgentHookDef[]; gitHooks: GitHookDef[] } | never merged into one concept |
| marketplaces | MarketplaceRef[] | |
| extensions | ExtensionRec[] | |
| env | EnvironmentDef | devcontainer/codespaces/copilot-setup-steps |
| devops | DevopsDef | |
| emit | EmitPolicy | scopeFallback: "inline"\|"drop"\|"error" (default "inline") |

`TargetId = "claude-code"|"copilot"|"opencode"|"zed"|"vscode"|"devcontainer"|"codespaces"|"github-actions"`.
`codespaces` is compiled by the devcontainer emitter (one emitter, two targets).

Tutor state is NOT part of core IR (P7-gated extension module).

## Shared value types

### SecretRef (C4)
```
{ kind:"env", name, default? } | { kind:"prompt", id, description, password? }
| { kind:"pick", id, options[] } | { kind:"command", id, command, args? }
| { kind:"helper", command }
```
Rules: interpolated secret strings forbidden anywhere in the IR; emitters render
native syntax or raise a reported reachability error (e.g. `prompt` → opencode).

### Exec (C1)
`{ argv: string[]; cwd?; env?: Record<string, string|SecretRef> }` — argv non-empty;
never joined into a shell string; opencode gets argv verbatim, others argv[0]+rest.

### Scope (C5)
`{ globs: string[] }` — emitted as Claude `paths:[...]`, Copilot `applyTo:
globs.join(",")`; opencode per `emit.scopeFallback` with mandatory coverage report.

## Entities

### InstructionBlock
`{ id, body (md), scope?, reach: "universal"|"path-scoped", targets?, raw? }`
Compile: AGENTS.md (widest) + CLAUDE.md shim + copilot-instructions copy; C7 chain
scan for zed including foreign files.

### SkillDef (C6, C9)
`{ name, description (≤1024), body, files?, allowedTools?, linkMode: "symlink"|"copy",
targets?, raw? }`
Rules: `name` matches `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`, ≤64, no `--`; **dir name ==
name** enforced at emit and by `new skill` validation.

### AgentDef
`{ name, description, prompt, tools?, model?, targets?, raw? }`
Compile: `.claude/agents/<n>.md`, `.github/agents/<n>.agent.md` (`description`
required; `agent:` era keys), `.opencode/agent/<n>.md` (body = prompt).

### CommandDef
`{ name, description?, template, args?, targets?, raw? }`
Compile: `.claude/skills/<n>/SKILL.md` (preferred form), `.github/prompts/
<n>.prompt.md`, `.opencode/command/<n>.md` (`template` required there).

### McpServerDef (C1–C3)
`{ name, transport: {kind:"stdio", exec} | {kind:"http"|"sse"|"ws", url, headers?,
oauth?}, tools?, timeoutMs?, scope: "project"|"user"|"local", targets?, raw? }`
Rules: reserved names rejected (`workspace`, `claude-in-chrome`, `computer-use`, …);
`ws` reachable only on claude-code (reported elsewhere); `tools[]` required when
`copilot`-coding-agent is targeted → else emit warning + `["*"]` instruct blob; zed
emission has no `type` field (presence discriminates); copilot coding agent is
instruct-mode always.

### PolicyDef
`{ allow[], deny[], ask[], additionalDirectories?, defaultMode?, opencode?: raw }`
Compile: Claude `permissions` (arrays concatenate across scopes — C8: removal
impossible from below is a *reported* consequence), opencode `permission` object.

### ModelDef
`{ default?, fallback?, perAgent?: Record<string,string>, raw? }` — whole-value
override semantics on Claude (`model`, `fallbackModel`); Zed's seven slots reachable
only via `raw.zed`.

### AgentHookDef / GitHookDef (never unified)
AgentHookDef: `{ event, matcher?, exec, targets? }` → Claude `settings.hooks` JSON;
opencode plugins are NOT generated in v1 (raw escape only). GitHookDef: `{ stage,
argv[] }` → lefthook.yml.

### MarketplaceRef
`{ id, kind: "claude"|"copilot", source, pin?: {sha|tag}, plugins?: string[] }` —
registered-name traps recorded in research.md watchlist.

### ExtensionRec
`{ id, targets? }` → `.vscode/extensions.json` recommendations,
`devcontainer customizations.vscode.extensions`; zed extension side effect
(user-machine install) is surfaced as a warning.

### EnvironmentDef
`{ image?|dockerfile?, features?: []-guarded, lifecycle?: {onCreate?, updateContent?,
postCreate?, postStart?}, ports?, secrets?: SecretRef[], hostRequirements?,
copilotSetupSteps? }`
Rules (C10, C15): lifecycle values keep their author-provided type (string = shell,
array = exec, object = parallel) — normalization forbidden; prebuild note: only
`updateContent` runs at prebuild; `secrets` are prompt-only (never assumed populated);
community features require explicit confirmation (prefer Dockerfile RUN).

### DevopsDef
`{ workflows: ("ci"|"release"|"security")[], lint: "oxlint"|"biome" (XOR), commit?:
{conventional, lefthook}, release?: {provenance: boolean (Node-24 step, C13),
monorepo?: "experimental"}, depUpdates?: "renovate"|"dependabot-actions-only" }`

## Emission layer

### FileOp
`{ path, format, mode: "own"|"merge"|"instruct", content|patch, sentinelId? }`
`instruct` renders into SETUP.md + final prompt note.

### EmissionRecord (`.patterson/emitted.json`)
Per file: `{ path, mode, keyPaths?: [{path, value, hash}], contentHash?, foreign?:
string[] (adoption), linkMode?, emittedAt, irHash }`
Drift algorithm: current==recorded → rewrite allowed; current!=recorded → keep +
report (+ non-zero exit in non-interactive; structured conflict over MCP);
`--accept-generated` overrides. Applies to OWN and MERGE tiers alike.

### Never-write list (Principle II)
`skills-lock.json`, `~/.agents/.skill-lock.json` (and XDG variant),
`.claude/settings.local.json` beyond first creation. Enforced by a test that runs the
full suite and asserts these paths were never opened for write.

## Tutor extension (P7 module-local, not core IR)

Track: `{ id, title, description, lessons: string[] (ordered lesson ids),
certPrep?: { credential, url }[] }`
Lesson: `{ id, title, track: TrackId, requires?: ("git"|"agent:claude-code"|…)[],
sources: {url, license, use: "adapted"|"linked"}[], steps: {narrative, action,
validate: CheckRef, flagResolvable?}[] }`
Progress: `{ lessonId, stepIndex, completedAt? }[]` in `.patterson/tutor-progress.json`.
CheckRef points into the core check registry — the tutor owns no validators.
