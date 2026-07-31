# Feature Specification: Patterson CLI v1

**Feature Branch**: `001-patterson-cli-v1`

**Created**: 2026-07-31

**Status**: Draft

**Input**: User description: "Rebuild patterson-cli as the patterson CLI: a
template-driven scaffolder plus AI-agent configuration manager, skills installer,
plugin/marketplace loader, MCP server, generators, CI standards, and AI-fluency tutor"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scaffold a branded project in one command (Priority: P1)

A developer runs one create command on a fresh machine and, through a short guided
flow, picks one of the 11 Patterson design-system templates, chooses which AI agents
(Claude Code, GitHub Copilot, opencode) and editors/environments (VS Code, Zed,
devcontainer/Codespaces) the project should be configured for, and receives a working,
branded project — with every selected agent and editor correctly configured, a setup
guide for anything that cannot be automated, and no network access required for the
defaults.

**Why this priority**: This is the headline demo and the product's front door; every
other capability builds on the project model it creates.

**Independent Test**: On a machine with no claude.ai session and no network beyond the
package registry, run the create command non-interactively with flags; verify the
produced project contains the chosen template, valid configuration for each selected
agent/editor, and a setup guide listing the manual steps.

**Acceptance Scenarios**:

1. **Given** a fresh empty directory, **When** the user runs the create flow selecting
   a template and all three agents, **Then** the project contains working configuration
   for all three agents and reports zero drift immediately after creation.
2. **Given** a non-empty directory, **When** the user runs create without a force flag,
   **Then** the command refuses, listing what would be touched.
3. **Given** no authenticated design-system session, **When** the user runs create,
   **Then** templates come from the bundled snapshot and the flow completes fully offline.

---

### User Story 2 - Keep agent/editor config in sync from one source of truth (Priority: P1)

A team keeps all agent instructions, MCP server definitions, permissions, skills, and
editor settings in one project config file. Regenerating is safe: hand-edited files are
never silently overwritten; a doctor command reports drift and a check command reports
which configured intent reaches which agent (and why not, where a surface can't express
it).

**Why this priority**: This is what makes the tool a configuration *manager* rather
than a one-shot generator; it is also the safety story that makes regeneration trustworthy.

**Independent Test**: Configure an instruction block + an MCP server, emit, hand-edit
one emitted file, re-run sync non-interactively; verify the edit survives, the conflict
is reported, and the exit code is non-zero.

**Acceptance Scenarios**:

1. **Given** an emitted project, **When** a user hand-edits an emitted file and runs
   sync non-interactively, **Then** the edit is preserved, reported, and the run exits
   non-zero; an explicit accept-generated flag is required to overwrite.
2. **Given** a path-scoped instruction targeting an agent that cannot express path
   scoping, **When** the user runs check, **Then** the report names the unreachable
   pairing and the configured fallback behavior.
3. **Given** a repo that already contains hand-written agent config, **When** the user
   adopts patterson via init, **Then** pre-existing content is treated as hand-owned and
   an import option lifts it into the project model instead of overwriting it.
4. **Given** a repo with a pre-existing instructions file from another tool that wins an
   editor's first-match search order, **When** the user runs check, **Then** the report
   names the actual winning file and offers fixes.

---

### User Story 3 - Install and manage skills across all agents (Priority: P2)

A developer searches the skills.sh ecosystem, installs a skill once, and it becomes
available to every configured agent (canonical location + per-agent links). Lockfiles
written by the upstream skills tool are respected — never hand-written — and a corrupted
lockfile is backed up rather than lost.

**Why this priority**: Skills are the primary knowledge-distribution mechanism across
agents, and the design system itself ships as a skill.

**Independent Test**: Install one skill via the CLI; verify canonical placement,
per-agent visibility, lockfile written only by the upstream tool, and backup-on-corruption.

**Acceptance Scenarios**:

1. **Given** a configured project, **When** the user installs a skill, **Then** it is
   visible to every selected agent and recorded in the upstream lockfile.
2. **Given** a corrupted skills lockfile, **When** any skills operation runs, **Then**
   the file is backed up before the upstream tool can wipe it, and the user is warned.

---

### User Story 4 - Drive the CLI from an AI agent (Priority: P2)

An AI agent connects to the CLI over MCP (stdio) and can do everything the human can:
inspect state, run checks, scaffold artifacts, manage skills. Operations that would
prompt a human return structured "decision required" responses naming the resolving
option; nothing destructive happens without explicit opt-in.

**Why this priority**: Agent-driveability is a core differentiator and multiplies every
other feature; it must be reliable before generators and tutor build on it.

**Independent Test**: A scripted MCP client performs the full handshake, lists tools,
runs a read tool and a write tool, and receives a structured conflict rather than a
clobbered file when drift exists.

**Acceptance Scenarios**:

1. **Given** the MCP server is running, **When** a real coding agent connects, **Then**
   the handshake succeeds and the tool list is stable and complete.
2. **Given** a drifted file, **When** an agent invokes sync over MCP, **Then** it
   receives a structured conflict list and no file is overwritten.

---

### User Story 5 - Generate new AI artifacts, including extending the CLI itself (Priority: P3)

A developer (or agent) scaffolds a new skill, MCP server, Claude Code plugin,
marketplace, or a new patterson subcommand/plugin — each generated artifact passes its
own validation immediately (a generated MCP server answers a real handshake; a
generated skill passes ecosystem validation).

**Why this priority**: Generators turn the toolkit self-hosting and close the
agent-extends-tool loop, but depend on the model, emitters, and MCP surface existing.

**Independent Test**: Generate an MCP server and run its self-test; generate a skill
and validate it with the upstream ecosystem tool.

**Acceptance Scenarios**:

1. **Given** a configured project, **When** the user generates an MCP server, **Then**
   its self-test (a real protocol handshake) passes without edits.
2. **Given** a generated patterson command, **When** the CLI restarts, **Then** the new
   command appears in help and works.

---

### User Story 6 - Learn AI-assisted development hands-on (Priority: P3)

A developer runs the tutor, picks a track (AI-fluency foundations, Claude Code,
Copilot, MCP), and works through lessons that make them perform real actions in their
real project; each step is validated against what actually changed on disk, progress
is resumable, and certification tracks link to the official courses/exams they prepare
for.

**Why this priority**: The tutor rounds out the product's mission but consumes every
other subsystem, so it lands last.

**Independent Test**: Run the first lesson of one track headlessly against a scaffolded
demo project; verify its validation passes and progress persists.

**Acceptance Scenarios**:

1. **Given** a scaffolded project, **When** the learner completes lesson 1 of the
   Claude Code track, **Then** the validation confirms the real artifact changed and
   progress is recorded.
2. **Given** a directory without version control, **When** a lesson requires it,
   **Then** the lesson is skipped with an explanation and an offer to initialize.

---

### Edge Cases

- Non-empty target directory on create (refuse + list, force to override).
- Offline machine / corporate proxy: defaults fully offline; network steps skippable
  with follow-up instructions written to the setup guide.
- Pre-existing config from other tools (adoption semantics; first-match instruction
  file conflicts; foreign keys preserved).
- Upstream skills tool unavailable or lockfile corrupted (backup + warn; degrade
  gracefully).
- Newer-protocol MCP client connects (readable diagnostic, documented behavior).
- Config surfaces that cannot be written programmatically (instruction-mode output in
  the setup guide, never silent omission).
- An agent target that another emitted file silently supersedes (reported by check).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST scaffold a new project from any of the 11 bundled design
  system templates, selectable interactively (with visual preview where the terminal
  supports it) or via flags, fully offline.
- **FR-002**: The system MUST hold all agent/editor/environment configuration in one
  canonical project model file, and every emitted artifact MUST be reproducible from it.
- **FR-003**: The system MUST support Claude Code, GitHub Copilot, and opencode as
  agent targets, and VS Code, Zed, devcontainer, and Codespaces as editor/environment
  targets, emitting each target's native configuration format.
- **FR-004**: The system MUST never overwrite hand-edited content without explicit
  consent, in any mode (interactive, flag-driven, or agent-driven), and MUST report
  every conflict it preserves. Non-interactive runs with conflicts MUST exit non-zero.
- **FR-005**: The system MUST never write files owned by other tools (the skills
  ecosystem lockfiles; agent-local settings beyond first creation).
- **FR-006**: The system MUST report, on demand, which configured intent reaches which
  target and why any does not (coverage/reachability), including conflicts caused by
  files it did not write.
- **FR-007**: The system MUST adopt existing repositories: pre-existing configuration
  is preserved as hand-owned, with an explicit import option that lifts recognizable
  config into the project model.
- **FR-008**: The system MUST search, install, update, and remove skills via the
  skills.sh ecosystem with per-agent visibility, and protect the user from upstream
  lockfile self-wipe behavior via pre-operation backups.
- **FR-009**: The system MUST register and install plugins/marketplaces for Claude Code
  (official Anthropic marketplaces) and consume the awesome-copilot catalog at a pinned
  revision.
- **FR-010**: The system MUST expose its full command surface to AI agents over MCP
  (stdio), with structured "decision required" responses replacing interactive prompts,
  and read/write operations distinguishable by declared annotations.
- **FR-011**: The system MUST generate new artifacts — skill, MCP server, Claude Code
  plugin, marketplace, patterson subcommand, patterson plugin — each with an immediate
  post-generation validation, and optionally via an AI-assisted plan-first interview.
- **FR-012**: The system MUST generate CI/devops standards (workflows with
  least-privilege permissions, commit conventions, git hooks, release automation with
  provenance, supply-chain scanning) appropriate to a Bun project.
- **FR-013**: The system MUST provide an interactive tutor with tracks for AI-fluency
  foundations, Claude Code, Copilot, and MCP, whose lesson steps validate real changes
  in the learner's project, with resumable progress and license-respecting content
  (concept-teaching with attribution/link-outs where sources are non-commercial or
  unlicensed).
- **FR-014**: The system MUST provide a refresh path for the bundled design-system
  snapshot when an authenticated session exists, and a clear, non-failing message with
  snapshot age when it does not.
- **FR-015**: Every read command MUST offer machine-readable output; every write
  command MUST offer dry-run and non-interactive modes; every interactive prompt MUST
  be resolvable by a flag.
- **FR-016**: All third-party packages the system installs or invokes MUST pass the
  supply-chain gate (scored before use; pinned versions/revisions; sub-90 scores
  surfaced for confirmation).

### Key Entities

- **Project model**: The canonical description of a project's agents, editors,
  instructions, skills, MCP servers, policies, environment, and CI choices; single
  source of truth for all emission.
- **Instruction block**: A unit of guidance for agents, optionally path-scoped, with
  declared target reach.
- **Skill**: A named, self-describing knowledge package installed once and visible to
  many agents; identity = directory name = declared name.
- **MCP server definition**: A described server (local command or remote endpoint) with
  secrets as references (never inline values) and per-target rendering.
- **Emission record**: Provenance for every write (what was written where, with what
  content identity) enabling drift detection and safe regeneration.
- **Template**: A bundled design-system starting point with name, description, preview,
  and files.
- **Lesson / Track / Progress**: Tutor curriculum units with per-step validations and
  per-project resumable state.
- **Generator**: A scaffolder for a named artifact type with post-generation validation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user on a fresh machine reaches a fully configured, branded project in
  under 5 minutes interactively, or under 60 seconds non-interactively — with zero
  reported drift immediately after creation.
- **SC-002**: 100% of hand edits to emitted files survive non-interactive regeneration,
  and 100% of preserved conflicts are reported.
- **SC-003**: 100% of configured intents are accounted for in the coverage report —
  reached, or named with a reason and fallback.
- **SC-004**: A generated MCP server passes its own protocol self-test with zero manual
  edits, 100% of the time.
- **SC-005**: An AI agent connected over MCP can complete every read operation and
  every non-conflicting write operation without human intervention.
- **SC-006**: Tutor lesson validations produce no false positives on skipped work: a
  learner who did not perform the action cannot pass the step.
- **SC-007**: The CLI never writes a file on its never-write list, across the entire
  test suite.
- **SC-008**: All bundled defaults work with zero network access.

## Assumptions

- v1 agent scope is exactly Claude Code, GitHub Copilot, opencode; editor scope is
  VS Code, Zed, devcontainer, Codespaces. vscode.dev is deferred (verified-limited
  platform support) and revisited post-v1.
- The design-system snapshot bundled at publish time is acceptable staleness for
  unauthenticated users; live refresh requires an authenticated session.
- The upstream skills CLI (pinned) is the sole writer of its lockfiles; patterson
  wraps rather than reimplements it.
- Certification tracks prepare learners for official credentials (vendor courses and
  exams) and never issue credentials.
- Cutting the tutor or any later-phase capability leaves earlier capabilities fully
  functional (feature-gated extension points).
- The project runs on Bun; distribution channels are the package registry (canonical),
  the runtime's create-template flow, and a GitHub template repo (best-effort hooks,
  with a documented fallback command).
