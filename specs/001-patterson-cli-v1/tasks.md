# Tasks: Patterson CLI v1

**Input**: Design documents from `/specs/001-patterson-cli-v1/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Delivery phases P0/P1/P2a are fully detailed (walking-skeleton rule,
Constitution VII). P2b–P8 are epics, elaborated at their phase boundary after the prior
phase's spikes land (Stage 0 rule). Story labels map to spec.md user stories:
US1 scaffold, US2 sync/drift, US3 skills, US4 MCP-drive, US5 generators, US6 tutor.

**Tests**: Constitution (Development Workflow) mandates tests-first for core
mechanisms — emit engine, provenance, registry — so test tasks are included and
precede implementation within each unit.

## Phase 1: Setup (delivery phase P0 — workspace reset)

- [ ] T001 Snapshot socket scores for planned deps (zod, citty, @clack/prompts,
      jsonc-parser, @modelcontextprotocol/sdk@^1.30, oxlint, lefthook) into
      docs/dep-scores.md; flag any dimension <90 with disposition per Constitution IV
- [ ] T002 Remove OpenTUI app: delete src/index.ts, drop @opentui/* + solid-js from
      package.json, re-lock with bun install, prune stale node_modules dirs
- [ ] T003 Convert repo root to Bun workspaces: root package.json (workspaces:
      ["packages/*"], private), shared tsconfig.base.json (strict flags preserved),
      per-package tsconfig extends
- [ ] T004 [P] Add oxlint config (.oxlintrc.json) and lefthook.yml (pre-commit:
      oxlint + tsc --noEmit; commit-msg: commitlint conventional) at repo root
- [ ] T005 [P] Update AGENTS.md (CLAUDE.md symlink intact) with workspace layout,
      spec-tree pointers (specs/001-patterson-cli-v1/), and the constitution's
      never-write list; remove stale OpenTUI sections
- [ ] T006 Create empty workspace packages with package.json + src/index.ts + test/
      stubs: packages/{core,design,skills,generators,mcp,cli,create-patterson} and
      packages/emitters/{claude-code,copilot,opencode,vscode,zed,devcontainer,
      github-actions,cross}
- [ ] T007 Verify P0 gate: bunx tsc --noEmit, bun test (empty suites pass), oxlint
      clean; commit "P0: workspace reset"

## Phase 2: Foundational (delivery phase P1 — core + S1; blocks all user stories)

**Spike first:**

- [ ] T008 S1 spike in packages/mcp/spike/: minimal sdk@^1.30 stdio server (2 dummy
      tools); connect real Claude Code via .mcp.json; record protocol revision
      negotiated + behavior of a 2026-07-28-era client; write findings to
      specs/001-patterson-cli-v1/research.md (S1 row → resolved)

**IR (tests before implementation per unit):**

- [ ] T009 [P] Golden tests for IR schema validation in packages/core/test/ir.test.ts
      (valid fixture, unknown-target rejection, SecretRef string-forbidden rule,
      skill name regex, reserved MCP names, argv non-empty)
- [ ] T010 IR schemas in packages/core/src/ir/ per data-model.md: PattersonProject,
      TargetId, SecretRef, Exec, Scope, InstructionBlock, SkillDef, AgentDef,
      CommandDef, McpServerDef, PolicyDef, ModelDef, hooks, MarketplaceRef,
      ExtensionRec, EnvironmentDef, DevopsDef, EmitPolicy (zod v4 + inferred types)
- [ ] T011 Config loader in packages/core/src/config.ts: patterson.config.ts (Bun
      import) + patterson.config.jsonc (jsonc-parser) → validated IR; error reporting
      with path context; tests in packages/core/test/config.test.ts

**Command registry:**

- [ ] T012 [P] Registry tests in packages/core/test/registry.test.ts: descriptor
      registration, duplicate-id rejection, decision-required round-trip, conflicts
      result shape, exit-code mapping (0/1/2/3) per contracts/command-registry.md
- [ ] T013 Command registry in packages/core/src/registry/: CommandDescriptor,
      CommandResult (ok|conflicts|decision-required|error), CommandCtx (cwd, io,
      nonInteractive flag), register/resolve/list APIs

**Emit engine (the P1 heart):**

- [ ] T014 [P] Emit engine tests in packages/core/test/emit.test.ts: FileOp apply for
      own/merge/instruct; sentinel insert/replace/hand-edit-detect (hash mismatch);
      jsonc key-path surgery preserving comments+unknown keys; emitted.json record/
      compare; OWN-tier drift protection; non-interactive conflict exit; foreign-key
      adoption marking; never-write guard (attempt → hard error)
- [ ] T015 Emit engine in packages/core/src/emit/: FileOp, provenance store
      (.patterson/emitted.json), markdown sentinel merger, jsonc key-path merger,
      instruct collector → SETUP.md renderer, drift comparator, backup util
      (.patterson/backup/), never-write guard
- [ ] T016 Check registry in packages/core/src/checks/: CheckDef {id, run(ctx) →
      finding[]}, aggregation, --json output shape; used by doctor/check/tutor;
      tests in packages/core/test/checks.test.ts
- [ ] T017 definePattersonPlugin INTERFACE (types only: contributes commands/emitters/
      checks/generators/lessons) in packages/core/src/plugin.ts; loading deferred to
      P8 (S4)
- [ ] T018 Verify P1 gate: tsc + bun test + oxlint green; commit "P1: core + S1"

## Phase 3: User Story 1+2 walking skeleton (delivery phase P2a — claude-code end-to-end)

**Goal**: `create → emit → sync → doctor` on a real directory with the claude-code
target only — first demo-able increment (US1 minimal + US2 core safety).

**Independent test**: quickstart.md walking-skeleton block: non-interactive create
with --template docs-site --agents claude-code, then doctor reports zero drift;
hand-edit then sync --yes preserves + exits 2.

**Spikes first:**

- [ ] T019 [P] S2 spike: fetch json.schemastore.org/claude-code-settings.json; if
      live+current, vendor as packages/emitters/claude-code/schema/settings.schema.json;
      else derive whitelist from raw docs (code.claude.com/docs settings page) and
      vendor the derived schema; record disposition in research.md
- [ ] T020 [P] S3 spike: empirically test whether Claude Code discovers a skill in
      .agents/skills/ without a .claude/skills link (fixture repo + claude CLI);
      record in research.md; outcome sets default linkMode behavior

**Emitter (fixtures before implementation):**

- [ ] T021 [US1] Fixture suite for claude-code emitter in
      packages/emitters/claude-code/test/fixtures/: cases {minimal, instructions-shim
      (AGENTS.md + CLAUDE.md @import), mcp-stdio (env expansion ${VAR:-.} form),
      mcp-remote, skills-symlink, skills-copy, permissions (C8 concat-vs-override
      table), agents-dir, commands-as-skills} each with ir.json/before//expected/
- [ ] T022 [US1] claude-code emitter in packages/emitters/claude-code/src/: settings
      (.claude/settings.json merge-tier, whitelist from T019 schema), CLAUDE.md shim
      + AGENTS.md sentinel block, .mcp.json, skills materializer (linkMode from T020),
      .claude/agents/*.md, skills-as-commands; CoverageGap emission for inexpressible
      entities per contracts/emitter.md
- [ ] T023 [US2] Round-trip drift tests in packages/emitters/claude-code/test/
      roundtrip.test.ts: emit → hand-edit each tier → re-emit ⇒ edit preserved,
      conflict reported, --accept-generated overwrites; settings validate against
      vendored schema (T019)

**Skeleton commands (registry-defined, minimal):**

- [ ] T024 [US1] `create` skeleton in packages/cli/src/commands/create.ts +
      packages/core/src/scaffold.ts: non-interactive only (--yes + flags), template =
      plain directory copy from templates/skeleton/ (CREATED BY THIS TASK; design
      snapshot arrives P3 — P2a demo uses `--template skeleton`, docs-site becomes
      available post-P3), writes patterson.config.ts + a `patterson` script into the
      scaffolded package.json, runs emit, renders SETUP.md, refuses non-empty dir
      without --force (lists what would be touched), bun install + git init.
      NOTE: packages/tutor is deliberately NOT created until E-P7 (clean cut line).
- [ ] T025 [US2] `sync` + `doctor` + `check` descriptors in
      packages/cli/src/commands/{sync,doctor,check}.ts over core emit/check: sync
      re-emits with drift protocol; doctor = drift + validity findings; check =
      coverage table (claude-code only for now); exit codes per contract
- [ ] T025b [US2] `init` (adoption) descriptor in packages/cli/src/commands/init.ts:
      running in a repo with pre-existing claude-code config marks pre-existing
      keys/regions `foreign` in emitted.json (never overwritten — FR-007, US2-AS3);
      `--import` lifts recognizable claude-code config (mcp servers, instructions)
      into patterson.config; fixture test with a pre-populated repo
- [ ] T026 [US1] Wizard STEP REGISTRY shell in packages/cli/src/wizard/: ordered step
      interface {id, applicable(ir), run(ctx)→irPatch}, @clack driver, persisted
      state .patterson/wizard.json + --resume; only steps: template-dir, name,
      agents(claude-code) — later phases append steps without touching driver
- [ ] T027 Walking-skeleton E2E test in packages/cli/test/skeleton.e2e.test.ts:
      scripted create → doctor(0 drift) → hand-edit → sync --yes(exit 2, preserved) →
      --accept-generated(overwrites); never-write guard asserted across the run
- [ ] T028 Verify P2a gate: all green + E2E; demo transcript saved to
      specs/001-patterson-cli-v1/artifacts/p2a-demo.txt; commit "P2a: walking skeleton"

**Checkpoint**: US2 safety core proven; US1 minimally demoable.

## Phase 4: P2b — remaining agent/editor emitters (elaborated 2026-07-31 at boundary)

- [X] T029 [P] S6 spike: empirically determine whether Zed reads `context_servers`
      from project `.zed/settings.json` (zed CLI if present; else primary-source doc
      dig + issue trawl); record in research.md; outcome selects zed emitter mode
      (file vs instruct for MCP)
- [X] T030 [P] [US1] copilot emitter in packages/emitters/copilot/: instructions
      (.github/copilot-instructions.md real copy + .github/instructions/*.instructions.md
      applyTo comma-string), .github/agents/<n>.agent.md (agent: era), .github/prompts/
      *.prompt.md, .github/skills/<n>/ (copy linkMode), copilot-setup-steps.yml
      (job id literal, ≤59min), coding-agent MCP = instruct-mode blob w/ tools[] +
      COPILOT_MCP_* secrets; fixtures + roundtrip per emitter contract
- [X] T031 [P] [US1] opencode emitter in packages/emitters/opencode/: opencode.json(c)
      ($schema, mcp {type local/remote, command as string[]}, permission, instructions[],
      skills.paths [".agents/skills"] ALWAYS), .opencode/agent/*.md, .opencode/command/
      *.md (template required), AGENTS.md shared-sentinel coordination with claude-code
      emitter (same block id), C12 hostile-co-writer: never own-tier inside .opencode/;
      fixtures + roundtrip
- [X] T032 [P] [US1] zed emitter in packages/emitters/zed/: mode per S6 (context_servers
      file or instruct), .zed/settings.json merge-tier (project-scope-valid keys only),
      extensions warning (installs to user machine), C7 participation; fixtures
- [X] T033 [P] [US1] vscode emitter in packages/emitters/vscode/: .vscode/mcp.json
      (servers + synthesized inputs[] from SecretRef prompt/pick kinds), settings.json
      deviations-only merge, extensions.json recommendations, tasks.json; fixtures +
      roundtrip incl. JSONC comment preservation
- [X] T034 [US2] cross package in packages/emitters/cross/: C7 chain guard — scan the
      full Zed first-match chain ON DISK (.rules, .cursorrules, .windsurfrules,
      .clinerules, copilot-instructions, AGENT.md, AGENTS.md, CLAUDE.md) incl. files
      patterson never wrote; report winning file + unreachable-block findings + fix
      decisions; fixture with pre-existing .cursorrules. Coverage reporter: aggregate
      CoverageGaps from ALL emitters into the check table (extend check.ts multi-emitter)
- [X] T035 [US2] Multi-target integration: create/sync/init accept
      --agents claude-code,copilot,opencode --editors vscode,zed; emitter registry in
      cli wires all five; cross-emitter conflicts (AGENTS.md sentinel sharing) proven;
      E2E extended to all-targets scaffold; instruct-mode SETUP.md gets copilot
      coding-agent blob (verification #4)
- [X] T036 Gate: tsc/test/oxlint green; multi-target demo transcript appended to
      artifacts/; commit "P2b"

## Epics (elaborated at phase boundaries — placeholder scope only)
- [X] E-P3 [US1] Design + create: vendored DS snapshot build (manifest/theme/
      thumbnails/templates), materializer, full wizard steps (template picker w/
      thumbnail fallback), create-patterson shim, S5, offline-safe network steps,
      SETUP.md polish, `design refresh` command (authenticated refresh; unauthenticated
      → exit 0 + snapshot-age warning per FR-014; named `refresh` to avoid colliding
      with top-level `sync`)
- [X] E-P4 [US3,US4] Skills (pinned skills@1.5.21 wrapper, backup guard, marketplace
      registry @SHA), plugins, `mcp serve` (S1 diagnostics, non-interactive assertion,
      wizard steps for skills/MCP)
- [X] E-P5 [US5] Generators ×6 + post-scaffold validations; shared JSON-RPC handshake
      validator; `--plan` AI-assisted plan-first interview mode (FR-011)
- [X] E-P6 [US1,US2] devcontainer(+codespaces) + github-actions emitters with
      `patterson ci`/`editor` consumers; S7-gated release scaffolds; doctor --fix
- [X] E-P7 [US6] Tutor: engine over check registry, 4 tracks from the 42 researched
      candidates, license tiers enforced in lesson frontmatter, cert-prep link-outs
- [X] E-P8 Polish: S4 + plugin loading/out-of-process fallback, --json sweep,
      bun build --compile binary, README, end-to-end demo

## Dependencies

- Phase order: P0 → P1 → P2a → (P2b ∥ P3 partially) → P4 → P5 → P6 → P7 → P8;
  spikes always first within their phase.
- US2 (drift safety) is proven in P2a and re-verified per emitter thereafter.
- US3/US4 unblock after P4; US5 after P5; US6 after P7.

## Parallel opportunities

- P0: T004, T005 parallel after T003.
- P1: T009 ∥ T012 ∥ T014 (different test files) before their implementations;
  T008 (S1) runs alongside T009–T011.
- P2a: T019 ∥ T020; fixture suite T021 parallel with T024 scaffolding.
- P2b+: one agent per emitter package (worktree isolation) — the ultracode fan-out
  unit.

## Implementation strategy

MVP = Phases P0–P2a (tasks T001–T028): one agent target, end-to-end, safety proven.
Every subsequent phase is additive behind the step registry / emitter registry /
feature gates, keeping cut lines clean (Constitution VII).
