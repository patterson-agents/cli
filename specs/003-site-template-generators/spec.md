# Feature Specification: Site-template generators

**Feature Branch**: `003-site-template-generators`

**Created**: 2026-08-12

**Status**: Implemented

**Input**: User description: "Relocate the two Patterson site templates out of `~/.bun-create`
and integrate them into the patterson CLI's template/generator system, so scaffolding
Patterson-branded projects is a first-class CLI capability."

**Numbering note**: `003` was free at the time of writing. `001-patterson-cli-v1` and
`002-marketplace-emission` are the only prior feature directories; no number was reserved
for the `claude-plugin` generator, which shipped in `c960dc3` without a spec directory.
Nothing here renumbers or supersedes that work.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scaffold a branded docs site with one command (Priority: P1)

A Patterson engineer needs a documentation site for their service. They run
`patterson new starlight-site my-docs`, `cd my-docs`, `bun install`, `bun run dev`, and
have a running, on-brand Starlight site — correct palette, typography, logos and sample
content — without choosing a framework version, hunting for the brand stylesheet, or
registering anything beforehand.

**Why this priority**: This is the whole feature. Before it, the templates were reachable
only via `bun create`, which required each user to first copy a directory into
`~/.bun-create` on their own machine — an undiscoverable, unversioned, per-machine step
that silently fell back to an npm lookup for a package that does not exist.

**Independent Test**: Run the command into an empty directory on a machine with no
network access and no prior setup; the site's files appear and `bun install` resolves
from the committed lockfile.

**Acceptance Scenarios**:

1. **Given** an empty working directory, **When** the user runs
   `patterson new starlight-site my-docs`, **Then** `my-docs/` contains the full template
   and the command prints the install and dev-server steps.
2. **Given** no network connection, **When** the user runs either site generator,
   **Then** the scaffold still succeeds, because the template bytes ship inside the
   package.
3. **Given** a scaffolded site, **When** the user inspects `package.json`, **Then**
   `name` is the target directory name and every dependency carries the version the
   upstream template was install-verified with.

---

### User Story 2 - Never lose existing work (Priority: P1)

A user points a site generator at a directory that already holds something — a git
checkout, a half-finished draft, a folder they forgot about. The command refuses, names
what is in the way, and writes nothing.

**Why this priority**: Equal-first with US1 because it is the reason to prefer this path
over `bun create` at all. `bun create` replaces an existing directory's contents without
a prompt; a file already sitting in the target is gone afterward. Silent data loss in a
scaffolding tool is not an acceptable trade for convenience.

**Independent Test**: Put a file in the target, run the generator, confirm a non-zero
exit, the original file untouched, and no template file anywhere in the target.

**Acceptance Scenarios**:

1. **Given** a target containing `keep-me.txt`, **When** the user runs a site generator
   against it, **Then** the command fails with `TARGET_REFUSED`, `keep-me.txt` is
   unchanged, and no template file was written.
2. **Given** a target containing only a dotfile, **When** the user runs a site generator,
   **Then** it is still refused — hidden entries count.
3. **Given** a target that exists but is empty, **When** the user runs a site generator,
   **Then** the scaffold proceeds normally.

---

### User Story 3 - Drive it from an agent (Priority: P2)

An agent connected over `patterson mcp serve` scaffolds a docs site as one step of a
larger task, and can run the plan-first interview (`--plan`) to agree the site's audience
and information architecture with the user before any file is written.

**Why this priority**: Agent-driveability is a headline property of the CLI
(Constitution III), and it costs nothing extra here — registering the generators in the
one registry surfaces them as MCP tools automatically. It ranks below the two P1 stories
only because the value is unlocked by them.

**Independent Test**: List tools over the MCP server and confirm
`patterson_new_starlight_site` and `patterson_new_vitepress_site` appear with correct
annotations; call one and confirm the same behavior as the CLI.

**Acceptance Scenarios**:

1. **Given** a running MCP server, **When** the agent lists tools, **Then** both site
   generators appear in the deterministic ordering, with `readOnlyHint: false`.
2. **Given** `--plan`, **When** either generator runs, **Then** it writes
   `SPEC-<kind>-<name>.md` with the interview sections and scaffolds nothing.

---

### User Story 4 - Keep the copy honest (Priority: P3)

A maintainer updates a template upstream in `design-plugins` and re-vendors it here. The
provenance record and the bytes must not silently diverge, and nobody should be able to
"fix" a template in the CLI repository and leave the canonical copy behind.

**Why this priority**: A vendored copy without a recorded origin becomes a fork by
accident. This is maintenance-time value, not user-facing, hence P3.

**Independent Test**: Edit one byte of a vendored file and run the test suite; the
provenance digest assertion fails.

**Acceptance Scenarios**:

1. **Given** an edited vendored file, **When** the suite runs, **Then** the recorded
   digest no longer matches the computed one and the gate fails.
2. **Given** the provenance note, **When** a reader opens it, **Then** it names the source
   repository, the exact commit, the vendoring date, the one-way sync direction, and the
   per-template file count and content digest.

### Edge Cases

- **Target name is not scaffold-safe** (uppercase, spaces, leading dash): rejected by the
  shared generator name rule before anything is read or written, with the same message
  every other generator gives.
- **Target sits outside the root** (a name containing `../`): rejected by the existing
  scaffold-writer path assertion; a generator cannot write outside its root.
- **Template ships a file on the never-write list**: refused by the never-write guard,
  which every scaffold write already passes through.
- **A user wants to overwrite anyway**: not supported. See FR-004 — there is deliberately
  no `--force`, because the whole target is template content, so an overwrite can only
  destroy work and never merge with it. The user empties the directory, or picks another.
- **Vendored template has no `package.json`**: a packaging error, and it fails loudly at
  generate time rather than producing a half-site.
- **Upstream loosens a version spec**: copied verbatim; the tightening decision belongs
  upstream, where the template is install-verified. The committed lockfile is what makes
  the install deterministic either way.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The CLI MUST provide `patterson new starlight-site <dir>` and
  `patterson new vitepress-site <dir>`, defined once in the command registry so they
  surface as both CLI subcommands and MCP tools (Constitution III), sharing `--dir` and
  `--plan` with every other generator kind.
- **FR-002**: Both generators MUST scaffold from template bytes vendored inside the
  package. No network request may occur at scaffold time — embedded content installs from
  vendored package assets, never the network.
- **FR-003**: The scaffold MUST reproduce the vendored template byte for byte, including
  the committed `bun.lock` and every dependency's exact version spec, with a single
  exception: `package.json`'s `name` is rewritten to the target directory name.
- **FR-004**: A site generator MUST refuse a target directory that contains any entry,
  hidden entries included, and MUST write nothing at all when it refuses. The refusal is
  reported with its own error code (`TARGET_REFUSED`), distinct from a validation failure
  after writing. There MUST NOT be a flag that overrides the refusal. This is a
  deliberate divergence from `bun create`, which replaces an existing directory's
  contents without a prompt.
- **FR-005**: After scaffolding, the generator MUST verify what landed: `package.json`
  parses as JSON, its `name` equals the target directory, and every dependency retains
  the vendored version spec. Any failure is an error finding naming the offending key.
- **FR-006**: The generator MUST print next steps naming the install command and the
  template's own dev script (`bun run dev` for Starlight, `bun run docs:dev` for
  VitePress).
- **FR-007**: The vendored assets MUST carry a provenance note recording the canonical
  repository, the exact source commit, the vendoring date, the one-way sync direction
  (canonical → vendored, never the reverse), and each template's file count and content
  digest.
- **FR-008**: The recorded digests MUST be asserted against the bytes on disk by the test
  suite, so an edit to a vendored file fails the gate rather than silently forking the
  copy.
- **FR-009**: Vendoring MUST exclude everything that is not template source —
  `node_modules/`, framework caches (`.vitepress/cache/`, `.astro/`) and build output
  (`dist/`, `.vitepress/dist/`).
- **FR-010**: `patterson new` MUST keep its existing behavior for every other kind; the
  pre-flight hook this feature adds is optional and unused by them.

### Key Entities

- **Vendored site template**: a directory of template source under
  `packages/generators/assets/site-templates/<slug>/`, plus a provenance record (canonical
  path, file count, content digest). Read-only in this repository.
- **Site generator**: a registry entry binding a generator kind to one vendored template,
  a dev-script name, a pre-flight refusal rule and a post-write validation.
- **Pre-flight finding**: a structured refusal produced before any write, carrying the
  offending path and the fix, distinct from a post-write validation finding.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with a fresh checkout and no prior setup scaffolds a running,
  on-brand docs site in three commands (`patterson new …`, `bun install`, `bun run dev`),
  with zero manual template registration steps — down from the previous two-step
  `cp -R … ~/.bun-create` prerequisite.
- **SC-002**: Scaffolding succeeds with the network disabled, in 100% of runs.
- **SC-003**: Zero pre-existing files are modified or deleted when a generator is pointed
  at a non-empty directory, in 100% of runs.
- **SC-004**: A one-byte edit to any vendored template file is detected by the test suite.
- **SC-005**: Both kinds appear automatically in `patterson new --help` and in the MCP
  `tools/list` output with no frontend-specific registration.

## Assumptions

- The canonical home of both templates is the `design-plugins` marketplace repository;
  this package holds downstream copies, and upstream changes flow here by re-vendoring,
  never the other way.
- The upstream templates are install-verified and carry a committed lockfile, so this
  feature does not re-run `bun install` as part of its gate; doing so would pull
  platform-native optional dependencies into a unit-test suite for no added signal.
- The version specs the upstream templates declare are authoritative and are copied
  verbatim; tightening or loosening one is an upstream decision, taken where the template
  is install-verified, and the committed lockfile is what makes the install deterministic
  either way.
- The target directory argument follows the existing generator name rule (lowercase
  letters, digits and `-`), because it becomes the npm `name` field.
- Users who genuinely want the `bun create` path can still register a template by hand;
  it remains a documented alternative, not the recommended one.
