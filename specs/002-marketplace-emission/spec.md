# Feature Specification: Marketplace emission & skill provenance

**Feature Branch**: `002-marketplace-emission`

**Created**: 2026-08-12

**Status**: Implemented

**Input**: `patterson new marketplace` published to only one of the two paths Claude
consumers read, and `patterson new skill` produced a SKILL.md with nowhere to record
where its claims came from.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A scaffolded marketplace is discoverable from either path (Priority: P1)

A maintainer runs `patterson new marketplace <name>` in a repo they want people to add
with `/plugin marketplace add <owner>/<repo>`. Both published manifest locations appear,
carrying the same bytes, so it does not matter which one a consumer reads.

**Why this priority**: publishing to one path only is a silent failure — the marketplace
looks scaffolded and simply is not found by consumers reading the other path.

**Independent Test**: run the generator into an empty directory; assert both files exist
and are byte-identical.

**Acceptance Scenarios**:

1. **Given** an empty repo, **When** `patterson new marketplace dental-tools` runs,
   **Then** `.claude-plugin/marketplace.json` and `.github/plugin/marketplace.json` both
   exist with identical bytes.
2. **Given** that scaffold, **When** the manifest is parsed, **Then** each plugin entry's
   `source` keeps its `./` prefix.

---

### User Story 2 - Diverged manifests are reported, not discovered in production (Priority: P2)

Someone edits one manifest by hand and forgets the other. `patterson doctor` reports the
divergence with the paths and a fix hint.

**Why this priority**: the dual-path convention only holds if drift between the copies is
detectable; without the check, US1's guarantee decays after the first hand edit.

**Independent Test**: write two differing manifests into a project and run `doctor`.

**Acceptance Scenarios**:

1. **Given** both manifests present and differing, **When** `doctor` runs, **Then** an
   `error` finding with checkId `marketplace.manifests-diverged` names both paths.
2. **Given** both manifests present and identical, **When** `doctor` runs, **Then** no
   such finding appears.
3. **Given** only one manifest (or neither), **When** `doctor` runs, **Then** no such
   finding appears.

---

### User Story 3 - A scaffolded skill has somewhere to record provenance (Priority: P2)

An author runs `patterson new skill <name>` and gets `_SOURCES.md` and `REFERENCES.md`
next to `SKILL.md`, pre-shaped with the fields a primary source needs and marked `[TBD]`
until filled in.

**Why this priority**: skills that assert organisational facts without traceable sources
are the failure mode Constitution V exists to prevent. Scaffolding the files is what makes
recording sources the default rather than an afterthought.

**Independent Test**: run the generator; assert all three files exist and the provenance
files contain only placeholders.

**Acceptance Scenarios**:

1. **Given** an empty repo, **When** `patterson new skill review-helper` runs, **Then**
   `SKILL.md`, `_SOURCES.md` and `REFERENCES.md` exist under
   `.agents/skills/review-helper/`.
2. **Given** a generated skill, **When** either provenance file is deleted and
   post-validation re-runs, **Then** an `error` finding with checkId
   `generators.skill.provenance` names the missing file.

### Edge Cases

- Only one marketplace manifest exists: legal (a repo may publish from a single path), so
  the check stays silent rather than demanding the second file be created.
- The two manifests differ only in trailing whitespace: still a divergence — the contract
  is byte identity, not JSON equality.
- A generated file already exists on disk: the guarded scaffold writer decides; this
  feature adds no new overwrite behaviour.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The marketplace generator MUST emit the manifest at both
  `.claude-plugin/marketplace.json` and `.github/plugin/marketplace.json`.
- **FR-002**: The two emitted manifests MUST be byte-identical — one rendered string
  written twice, never two renderings.
- **FR-003**: Plugin `source` values MUST keep the `./` prefix Claude requires.
- **FR-004**: A check `marketplace.manifests-diverged` MUST report an `error` when both
  files exist and their bytes differ, and MUST stay silent otherwise.
- **FR-005**: That check MUST surface through `patterson doctor` (and therefore through the
  MCP tool of the same registry command — Constitution III).
- **FR-006**: The skill generator MUST emit `_SOURCES.md` and `REFERENCES.md` alongside
  `SKILL.md`.
- **FR-007**: Those templates MUST carry the literal placeholder
  `[TBD: not specified in <source>]` in place of any fact not yet sourced — no invented
  system names, owners, URLs, or dates.
- **FR-008**: Generator output MUST remain a pure function of the skill name; in
  particular the `Retrieved` field is a placeholder, not a stamped date (Constitution I).
- **FR-009**: Skill post-validation MUST report `generators.skill.provenance` when either
  provenance file is absent.

### Key Entities

- **Marketplace manifest**: the JSON document listing a marketplace's plugins; identified
  by the pair of paths it is published at, not by one canonical location.
- **Skill provenance pair**: `_SOURCES.md` (primary-source table + maintainer provenance
  rules) and `REFERENCES.md` (authoritative sources + local `references/` files).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A freshly scaffolded marketplace is loadable by a consumer that reads either
  path, with no manual copy step.
- **SC-002**: A divergence between the two manifests is reported by `doctor` on the run
  immediately following the edit, naming both paths and a fix.
- **SC-003**: Every skill produced by `patterson new skill` has a place to record its
  sources, and a skill missing one fails post-validation rather than passing silently.
- **SC-004**: Re-running either generator with the same name produces identical bytes.

## Assumptions

- The dual-path convention is a **copy**, not a per-vendor transform. Verified against a
  primary source (Constitution V): `githubnext/ado-aw` ships both files with identical
  bytes — each sha256
  `f7010cf379fbc2977a06fc099de8c34b80a0a1e6197491a23eccafa03cf1630e`, confirmed with
  `cmp`/`sha256sum` on the vendored copy at
  `patterson-agents.archive/vendored/github.com/githubnext/ado-aw/`.
- The `./` prefix requirement on `source` is carried over unchanged from the existing
  generator; this feature does not re-derive it.
- The provenance file shape follows the in-house convention already in use at
  `patterson-corp/plugins/patterson-engineering/skills/cicd-pipeline-standards/`; it is a
  house style, not an external spec.
- Wiring the IR's `marketplaces` field into an emitter stays out of scope — no emitter
  reads it today, and `patterson plugins marketplace` remains a data-only listing.
