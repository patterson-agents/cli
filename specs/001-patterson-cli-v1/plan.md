# Implementation Plan: Patterson CLI v1

**Branch**: `001-patterson-cli-v1` | **Date**: 2026-07-31 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-patterson-cli-v1/spec.md`

**Source architecture**: the approved session plan
(`~/.claude/plans/ok-now-here-s-the-woolly-nygaard.md`), produced from three research
workflows and a 3-lens adversarial review. Where this plan and that document diverge,
**this spec tree wins** (per Stage 0 rule).

## Summary

Rebuild `patterson-cli` as a Bun-workspace monorepo around one canonical project model
(`PattersonProject` IR): scaffolding, agent/editor config management, skills, plugins,
MCP consumption *and* self-exposure, generators, CI standards, and a tutor are all
expressed as IR changes plus deterministic emission (`compile(ir, target) → FileOp[]`)
with provenance-tracked, drift-safe writes. One typed command registry serves both the
citty CLI and the stdio MCP server. Delivery is walking-skeleton phased (P0–P8) with
named spikes (S1–S7) gating dependent work.

## Technical Context

**Language/Version**: TypeScript (strict; `noUncheckedIndexedAccess`,
`verbatimModuleSyntax`) on Bun ≥ 1.3

**Primary Dependencies** (each socket-gated before install, versions pinned at install
time): `zod` v4 (IR schema + registry input schemas), `citty` (command tree),
`@clack/prompts` (wizard), `jsonc-parser` (comment-preserving key-path surgery),
`@modelcontextprotocol/sdk@^1.30` (legacy line — S1 verifies), `skills@1.5.21`
(devDependency, invoked via `bunx`, never imported)

**Storage**: files only — `patterson.config.ts` or `patterson.config.jsonc` (IR; this
exact filename pair), `.patterson/emitted.json` (provenance sidecar),
`.patterson/wizard.json` (persisted wizard state, `--resume`),
`.patterson/tutor-progress.json`, `.patterson/backup/` (pre-shell-out lockfile
backups), vendored design-system snapshot in package assets

**Testing**: `bun test` — golden/fixture tests for emitters (model in → files out),
round-trip drift tests, JSON-RPC handshake harness for MCP, corrupted-lockfile fixture,
pre-existing-`.cursorrules` fixture; oxlint for lint

**Target Platform**: Linux/macOS dev machines + CI; distribution via npm
(`create-patterson`), `bun create patterson`, GitHub template repo, and
`bun build --compile` binaries

**Project Type**: CLI monorepo (Bun workspaces, `packages/*`)

**Performance Goals**: non-interactive scaffold < 60 s on fresh machine (SC-001);
interactive flow < 5 min; `mcp serve` handshake < 1 s

**Constraints**: offline-capable defaults (SC-008); never-write list absolute (SC-007);
non-interactive never-clobber (SC-002); no Python; no npm/pnpm/yarn except the
documented Node-24 provenance release step and documented `npx` fallback

**Scale/Scope**: 8 target surfaces, 11 templates, ~14 command groups, 6 generators,
4 tutor tracks (42 researched lesson candidates)

## Constitution Check

*Constitution v1.0.0 (2026-07-31). Gate evaluation — initial and post-design:*

| Principle | Gate | Status |
| --- | --- | --- |
| I Canonical IR First | All emission flows through `compile(ir, target)`; no emitter reads outside IR + merge snapshot | PASS — architecture is built around this |
| II Drift Safety (NON-NEG) | Provenance for every write incl. OWN-tier; non-interactive never-clobber; never-write list | PASS — emit engine spec + SC-002/007 tests |
| III One Registry, Two Frontends | Commands defined once; prompt-free core; structured decision-required | PASS — registry design; MCP startup assertion |
| IV Supply-Chain Gate (NON-NEG) | socket score before install; pins everywhere; no `@latest` | PASS — process rule + FR-016 |
| V Verified Facts or Spikes | Emitter contracts cite primary sources or spikes S1–S7 | PASS — spike table below; S2 schema derivation |
| VI Licensing Boundaries | Tutor content: MIT/CC-BY adapt, NC/unlicensed link-out | PASS — lesson frontmatter `sources[]` |
| VII Walking Skeleton | P2a single-emitter end-to-end before breadth; spikes head their phase | PASS — phasing below |

No violations → Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-patterson-cli-v1/
├── spec.md              # WHAT/WHY (done)
├── plan.md              # this file
├── research.md          # Phase 0 — decisions + spike registry
├── data-model.md        # Phase 1 — IR entities
├── contracts/           # Phase 1 — registry command contracts + MCP tool surface
├── quickstart.md        # Phase 1 — dev quickstart
├── checklists/requirements.md   # spec quality gate (done)
└── tasks.md             # Phase 2 — speckit-tasks output (P0–P2a detailed; later = epics)
```

### Source Code (repository root)

```text
packages/
  core/              # IR schema (zod), config loader, command registry, emit engine
                     # (own/merge/instruct + sentinels + emitted.json), check registry,
                     # definePattersonPlugin INTERFACE
    src/ir/          # PattersonProject, SecretRef, Exec, Scope, entity defs
    src/registry/    # command descriptors, decision-required protocol
    src/emit/        # FileOp, provenance, drift, mergers (md sentinel / jsonc keypath)
    src/checks/      # doctor/check backbone
    test/            # golden + fixture tests
  emitters/
    claude-code/     # P2a walking skeleton emitter (settings, CLAUDE.md shim, .mcp.json,
                     # skills/agents/commands dirs, C8 merge table)
    copilot/         # .github/copilot-instructions.md, instructions/, agents/, prompts/,
                     # skills/, copilot-setup-steps.yml, coding-agent instruct-mode
    opencode/        # opencode.json(c), .opencode/* (hostile-co-writer aware),
                     # skills.paths emission
    vscode/          # .vscode/mcp.json (servers+inputs), settings, extensions, tasks
    zed/             # .zed/settings.json, instructions chain handling (S6)
    devcontainer/    # devcontainer.json + codespaces (badge, prebuild, C15 warnings)
    github-actions/  # workflows, dependabot/renovate, lefthook, commitlint, release
    cross/           # C7 chain guard, coverage reporter
  design/            # vendored snapshot + claude-design client + materializer
  skills/            # pinned skills-CLI wrapper, lockfile reader, backup guard,
                     # marketplace registry (awesome-copilot@SHA, anthropics official)
  generators/        # new skill|mcp-server|plugin|marketplace|command|cli-plugin
  tutor/             # P7: engine, progress, tracks (gated extension)
  mcp/               # stdio server over core registry (non-interactive mode assertion)
  cli/               # citty tree, @clack wizard (STEP REGISTRY), create entry
  create-patterson/  # npm shim → wizard --resume
templates/           # project templates (design-system snapshot materialized targets)
```

**Structure Decision**: Bun workspaces monorepo. `cli` and `mcp` are thin frontends
over `core`'s registry (Principle III). Every emitter is an isolated package with
fixture tests so ultracode fan-out can own one package per agent. `tutor` and plugin
*loading* are feature-gated so cutting them deletes zero earlier code (Principle VII).

## Phase 0 → research.md

All NEEDS CLARIFICATION are pre-resolved by the session's research corpus (synthesis +
tutor curricula + adversarial review); research.md records the Decision / Rationale /
Alternatives for the 12 load-bearing choices and the spike registry S1–S7 with
consumer-phase mapping.

## Phase 1 → data-model.md, contracts/, quickstart.md

- data-model.md: IR entities (PattersonProject, InstructionBlock, SkillDef, AgentDef,
  CommandDef, McpServerDef, SecretRef, Exec, Scope, PolicyDef, ModelDef, hooks split,
  MarketplaceRef, ExtensionRec, EnvironmentDef, DevopsDef, EmitPolicy, FileOp,
  EmissionRecord, Lesson/Track/Progress) with validation rules and emit mappings.
- contracts/: command-registry contract (descriptor shape, decision-required protocol,
  annotations) + the MCP tool surface derived from it + emitter contract
  (compile signature, FileOp modes, provenance obligations).
- quickstart.md: dev setup, workspace commands, how to run the walking skeleton.

**Agent context update**: `update-agent-context.sh` is absent at the pinned spec-kit
SHA (verified 404 at fetch time); its intent is covered by this repo's `AGENTS.md`
(+`CLAUDE.md` symlink), which will be updated in P0 with the workspace layout and
spec-tree pointers instead.

## Phasing (delivery contract)

P0 reset → P1 core+S1 → **P2a walking skeleton (claude-code emitter, create/init→
emit→sync→doctor end-to-end; S2, S3 first)** → P2b agent/editor emitters: copilot,
opencode, zed (S6), vscode + cross (C7 guard incl. pre-existing `.cursorrules`;
coverage reporter) → P3 design+create wizard (S5; offline defaults; SETUP.md;
`design refresh`) → P4 skills/plugins/mcp serve (emitters own MCP files; P4 adds
wizard steps + registry data + serve) → P5 generators (handshake validator shared;
`--plan` interview) → P6 devcontainer(+codespaces) + github-actions emitters with
their consumers, ci + doctor --fix (S7-gated release scaffolds) → P7 tutor →
P8 polish (S4, binary, --json sweep). Cut lines: zed/vscode → v1.1; tutor cuttable
clean. (Emitter placement matches tasks.md: E-P2b vs E-P6.)

## Complexity Tracking

*No constitution violations to justify.*
