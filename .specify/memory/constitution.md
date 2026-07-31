<!--
Sync Impact Report
- Version change: (template, unversioned) → 1.0.0
- Modified principles: n/a (initial adoption — all seven principles new)
- Added sections: Core Principles (I–VII), Additional Constraints, Development Workflow,
  Governance
- Removed sections: none (template placeholders replaced)
- Templates requiring updates:
  ✅ .specify/templates/plan-template.md (Constitution Check gates align with I–VII)
  ✅ .specify/templates/spec-template.md (no constitution-specific sections required)
  ✅ .specify/templates/tasks-template.md (task categories align: spikes, tests-first,
     supply-chain gate steps)
- Follow-up TODOs: none
-->

# Patterson CLI Constitution

## Core Principles

### I. Canonical IR First

Every file the CLI emits MUST be a pure function of the canonical `PattersonProject`
IR plus a target list: `compile(ir, target) → FileOp[]`. No emitter may read state
outside the IR and the target filesystem snapshot it is merging into. Features are
expressed as changes to the IR followed by re-emission — never as ad-hoc file edits.
Rationale: this is the property that makes patterson a configuration *manager* rather
than a one-shot generator; drift detection (`doctor`) and re-emission (`sync`) are only
sound if emission is deterministic.

### II. Drift Safety & the Never-Write List (NON-NEGOTIABLE)

Provenance MUST be recorded for every write: sentinel blocks with content hashes in
markdown; key-path + value + content-hash records in `.patterson/emitted.json` for
structured files — for OWN-tier files as well as MERGE-tier. Hand-edited content is
never overwritten: equal→rewrite, differing→keep & report. Non-interactive contexts
(`--yes`, `--json`, MCP) MUST NOT clobber drifted content — they keep, report, and exit
non-zero (MCP returns a structured conflict list); overwriting requires explicit
`--accept-generated`. On adoption (`init`), pre-existing keys/regions are hand-owned
(`foreign`) and never overwritten. The CLI MUST NEVER write: `skills-lock.json`, the
global `.skill-lock.json`, or `.claude/settings.local.json` beyond first creation.
Rationale: a config manager that loses user edits or corrupts foreign lockfiles is
worse than no tool at all.

### III. One Registry, Two Frontends

Every command is defined once in the typed command registry (`{id, path[], summary,
inputSchema, outputSchema, annotations, run}`) and surfaces automatically as both a CLI
subcommand and an MCP tool. Command handlers MUST be prompt-free at the core layer: any
interactive decision is expressed as a structured "decision required" outcome that the
CLI frontend resolves by prompting and the MCP frontend returns to the calling agent
with the resolving flag named. Read and write operations are separate registry entries
with `readOnlyHint`/`destructiveHint` annotations set.
Rationale: agent-driveability is a headline feature, not an afterthought; divergence
between CLI and MCP behavior is a bug class this principle eliminates by construction.

### IV. Supply-Chain Gate (NON-NEGOTIABLE)

Before adding, installing, or upgrading ANY third-party package: score it with the
`socket` CLI (`socket package shallow npm pkg:npm/<name>@<version> --markdown`). Any
dimension < 90 MUST be surfaced and confirmed before proceeding — never silently. All
runtime tool invocations (skills CLI, marketplace fetches) use pinned versions or
pinned SHAs; `@latest` is forbidden in emitted artifacts and internal invocations.
The hard denylist (atomic-lockfile, js-digest, lockfile-js, nextfile-js, publisher
herbsobering) is absolute.
Rationale: this CLI writes config for other people's machines and CI; a compromised
dependency here has multiplied blast radius.

### V. Verified Facts or Spikes

Any claim about an external surface (config schema, discovery order, CLI behavior,
protocol support) that an emitter or generator encodes MUST either cite a primary
source (docs, source code, live API response) or be gated behind a named spike whose
result is recorded before dependent work proceeds. Research summaries are not primary
sources; where research flagged hallucination risk (e.g. Claude settings keys), the
emitter's contract derives from the authoritative schema or vendored fixture, not the
summary.
Rationale: the adversarial review found invented config keys in otherwise-good
research; encoding a hallucinated key into an emitter ships corruption to every user.

### VI. Licensing Boundaries for Embedded Content

Content embedded in the package (tutor lessons, templates, snippets) MUST respect its
source license: MIT/CC-BY sources may be adapted with attribution; NC-licensed sources
(Anthropic courses, AI Fluency materials) are taught as concepts with attribution and
link-outs, never vendored; unlicensed sources (prompt-eng-interactive-tutorial) are
link-only with independently re-created exercises. Every lesson records its `sources[]`
in frontmatter. Certification language is always *preparation for* official credentials,
never issuance.
Rationale: the tutor's value depends on borrowing the best curricula lawfully.

### VII. Walking Skeleton & Spike-Before-Dependent-Work

Delivery proceeds as phased, individually shippable increments: the first end-to-end
path (one emitter, create→emit→sync→doctor) lands before breadth. Each phase's spikes
run as its first tasks, and their results gate the fan-out of dependent work. A phase
is complete only when `bunx tsc --noEmit`, `bun test`, and oxlint are green and the
phase's demo runs. Cut lines are explicit (zed/vscode → v1.1 if forced); cutting a
later phase MUST delete zero code in earlier ones (feature-gated extension points).
Rationale: the review identified breadth-first emitter work as the plan's hidden
big-bang; this principle is the structural fix.

## Additional Constraints

- Runtime: Bun only (`bun`/`bunx`); `bun.lock` is the only lockfile. No npm/pnpm/yarn
  invocations in scripts or emitted artifacts except the documented Node-24
  `npm publish --provenance` release step (C13) and documented `npx` fallbacks.
- Language: TypeScript throughout; no Python anywhere (tooling, scripts, or emitted CI).
- `Exec.argv: string[]` everywhere; never reconstruct shell command strings.
- Secrets are `SecretRef` nodes; interpolated secret strings are forbidden in the IR.
- Embedded/pre-selected content installs from vendored package assets, never the
  network; network steps are optional, time-boxed, and skippable with a SETUP.md note.

## Development Workflow

- Phases P0–P8 as defined in the approved plan; speckit task elaboration happens at
  each phase boundary, gated on the prior phase's spike results (tasks fully detailed
  for P0–P2a; later phases are epics until their boundary).
- Implementation runs as per-phase ultracode workflows: spikes first, one agent per
  named work item (worktree isolation), adversarial review per unit (correctness +
  spec-conformance lenses), integration agent verifies before commit.
- Tests-first for core mechanisms (emit engine, provenance, registry): golden/fixture
  tests exist before or alongside implementation, never after the phase closes.
- Every commit passes typecheck + tests + lint; commit messages record socket scores
  for any dependency changes.

## Governance

This constitution supersedes ad-hoc practice for this repository. Amendments are made
by editing `.specify/memory/constitution.md` with a Sync Impact Report, a semantic
version bump (MAJOR: principle removal/redefinition; MINOR: new principle or material
expansion; PATCH: clarification), and propagation to dependent templates. Compliance
review is part of every phase-boundary spec elaboration and every adversarial review
lens. Complexity beyond what these principles allow MUST be justified in the plan's
Complexity Tracking section or rejected.

**Version**: 1.0.0 | **Ratified**: 2026-07-31 | **Last Amended**: 2026-07-31
