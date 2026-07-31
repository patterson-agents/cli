# Phase 0 Research: Patterson CLI v1

All unknowns were resolved during the session's research corpus (three ultracode
workflows; primary-source verification). This file records the load-bearing decisions
and the spike registry. Full evidence: session task outputs
(`synthesis.md`, `wqtkh9p9b.output`, `w90ar8q0f.output`, `wtlu9ffiv.output`).

## Decisions

### D1 — Canonical IR with per-surface emitters (not per-surface config editing)
- **Decision**: One `PattersonProject` IR; all target files are compiled projections.
- **Rationale**: The same logical concepts (instructions, MCP, skills, agents,
  commands, permissions, models) appear in 3–6 incompatible shapes across surfaces;
  managing N files directly guarantees drift.
- **Alternatives**: (a) template-only scaffolding — rejected: no ongoing management;
  (b) per-surface adapters without a shared model — rejected: cross-surface conflicts
  (C7 Zed chain) are only detectable with a global view.

### D2 — CLI framework: citty; prompts: @clack/prompts; no TUI in v1
- **Rationale**: citty gives nested lazy subcommands with runtime registration
  (plugin-friendly) and clean `--help`; @clack is the modern create-* prompt UX;
  OpenTUI full-screen app added no value to a linear wizard and dies under MCP
  (stdout owned by JSON-RPC).
- **Alternatives**: oclif (heavy, manifest-generation conflicts with bun compile),
  commander/cac (weaker grouping/lazy story), Ink/OpenTUI dashboard (post-v1).

### D3 — MCP SDK: legacy `@modelcontextprotocol/sdk@^1.30`, S1-verified
- **Rationale**: v2/`server@2.0.0` landed days ago; no consumer (Claude Code, VS Code,
  Zed) confirmed on the 2026-07-28 protocol era. Compatibility beats novelty for a
  server whose whole point is being consumed.
- **Alternatives**: v2 now — rejected until S1 evidence; MCP Apps — rejected
  (peer-dep conflict with v2; unsupported by Claude Code/Zed).

### D4 — Registry-first: commands defined once, CLI and MCP generated
- **Rationale**: strictly better than CLI→MCP bridges (which scrape --help); ensures
  agent parity (Principle III).
- **Alternatives**: separate MCP tool definitions — rejected: guaranteed divergence.

### D5 — skills.sh integration by shelling out to pinned `skills@1.5.21`
- **Rationale**: the lockfiles are versioned, self-wiping, and hash-bearing; two
  different schemas (project v1 `computedHash`, global v3 tree-SHA). Only the upstream
  tool can maintain them. `skills list --json` + `GET /api/search` give read paths.
- **Alternatives**: reimplement install/lock — rejected: guaranteed corruption on
  upstream change; MCP/registry API — rejected: `/api/v1/*` is auth-walled.
- **Consequences**: devDependency pin; `bunx` invocation with `npx` fallback;
  pre-shell-out lockfile backup to `.patterson/backup/`.

### D6 — Instructions compile rule
- **Decision**: `AGENTS.md` = widest artifact; `CLAUDE.md` = `@AGENTS.md` shim + tail;
  `.github/copilot-instructions.md` = real copy; Zed handled via full-chain scan.
- **Rationale**: verified reach matrix; Copilot has no import syntax; Zed reads
  exactly one file by first-match (C7) including files we never wrote.

### D7 — Skills layout
- **Decision**: canonical `.agents/skills/<name>` + per-agent links (claude symlink,
  copilot copy) with `linkMode` recorded; opencode gets `skills.paths:
  [".agents/skills"]` emitted always; dir name == frontmatter name enforced (C6).

### D8 — Secrets as `SecretRef` nodes; argv as arrays; scope as globs
- **Rationale**: C4 (four interpolation syntaxes), C1 (argv split/join lossiness),
  C5 (three scoping models). Strings cannot round-trip; nodes can.

### D9 — Provenance: sentinels (md) + `.patterson/emitted.json` (structured), OWN-tier
  included; non-interactive never-clobber
- **Rationale**: review blocker — OWN files rewritten wholesale silently lose hand
  edits; `--yes`/MCP contexts must fail safe. `--accept-generated` is the only
  clobber path.

### D10 — Distribution: three doors, one wizard
- **Decision**: `create-patterson` npm package (canonical) ≡ `bun create patterson` ≡
  GitHub repo with shell-free `bun-create.postinstall` (`bunx create-patterson
  --resume`); wizard state persisted (`.patterson/wizard.json`) makes `--resume` a
  first-class property. Non-empty dir refused without `--force`.
- **Rationale**: verified `bun create` semantics — GitHub-path hooks undocumented
  (S5 tests empirically), postinstall has no shell (single-space split).

### D11 — Design system: vendored snapshot + authenticated `design sync`
- **Rationale**: endpoint requires a claude.ai session; the headline `bun create`
  flow must work on a fresh machine, offline. `_ds_manifest.json` (verified this
  session) provides the machine-readable template index incl. binary PNG thumbnails.
- **Consequences**: snapshot build script is part of P3; unauthenticated `sync`
  exits 0 with a stale-snapshot warning.

### D12 — Tutor: lessons-as-data over the `doctor` check registry; licensing tiers
- **Rationale**: GitHub Skills' validated-steps model, run locally; 42 lesson
  candidates researched with per-step programmatic validations. Licensing verified:
  MIT (MCP docs, GitHub Skills, copilot-cli-for-beginners) adapt; CC-BY (VS Code
  docs) quote+attribute; CC BY-NC(-SA) (Anthropic courses/AI Fluency) concepts +
  link-out; unlicensed (prompt-eng-interactive-tutorial) link-only.

## Spike registry

| Spike | Question | Phase (before) | Consumer |
| --- | --- | --- | --- |
| S1 | Does sdk@1.30 stdio connect to real Claude Code? What does a 2026-07-28-era client do? | P1, before registry freeze | registry contract, mcp package |
| S2 | Does the schemastore Claude settings schema resolve/current? Else derive from raw docs + vendor fixture | P2a first task | claude-code emitter whitelist + validation harness |
| S3 | Does Claude Code scan `.agents/skills/`? | P2a (1-hour) | skills layout, wizard install |
| S4 | Can a compiled binary `import()` arbitrary paths? | P8 | plugin loader vs out-of-process |
| S5 | Does `bun-create.postinstall` fire on the GitHub template path? | P3 | shim weighting, README instructions |
| S6 | Can `.zed/settings.json` carry `context_servers` at project scope? | P2b | zed emitter mode (file vs instruct) |
| S7 | changesets × Bun workspaces `workspace:*`: tarball diff `bun pm pack` vs `npm pack` | P6 | release scaffold gating (`--experimental`) |

## Spike resolutions

- **S1 RESOLVED (2026-07-31)**: **sdk@1.30.0 works end to end with real Claude
  Code (v2.1.220).** Artifacts: `packages/mcp/spike/server.ts` (McpServer +
  StdioServerTransport, two dummy tools, zod@4.4.3 schemas) +
  `packages/mcp/spike/handshake.test.ts` (raw newline-delimited JSON-RPC client
  over a spawned process; 6 tests green).
  - **Negotiated protocolVersion**: real Claude Code sends `"2025-11-25"` in
    initialize (wire-captured via tee wrapper; `clientInfo:
    {name:"claude-code", version:"2.1.220"}`); sdk@1.30.0's
    `LATEST_PROTOCOL_VERSION` is exactly `2025-11-25`, echoed back verbatim.
    No "2026-07-28-era" client exists in the wild on this machine — current
    Claude Code still speaks 2025-11-25. `SUPPORTED_PROTOCOL_VERSIONS` in
    1.30.0: `[2025-11-25, 2025-06-18, 2025-03-26, 2024-11-05, 2024-10-07]`; a
    scripted client requesting unknown `"2026-07-28"` gets `"2025-11-25"` back
    (SDK falls back to latest; per spec the client decides whether to proceed).
  - **Live headless verification**: throwaway dir with `.mcp.json`
    (`{command:"bun", args:[…/spike/server.ts]}`): `claude mcp list` shows the
    server but `⏸ Pending approval` — project-scope `.mcp.json` needs
    interactive trust, so headless runs must use `claude -p … --mcp-config
    <file> --strict-mcp-config` (bypasses approval, skips unrelated servers).
    With that, Claude Code listed both tools and called them:
    `TOOLS=patterson_spike_add,patterson_spike_echo SUM=5`, echo `HI`.
  - **Surprises**: (1) zod-invalid `tools/call` args do NOT yield a JSON-RPC
    `error` — sdk@1.30.0 returns an `isError:true` tool *result* with text
    `"MCP error -32602: Input validation error: …"`; registry error mapping
    must not expect protocol-level errors for validation failures. (2) zod is
    an SDK peer dep (`^3.25 || ^4.0`) but only installed in `packages/core`;
    `packages/mcp` cannot `import "zod"` today (spike shims via a
    `spike/node_modules/zod` symlink into the bun store — same physical
    instance the SDK resolves, so `instanceof ZodType` holds); P1 must add
    pinned `zod@4.4.3` to `packages/mcp/package.json`. (3) `tools/list`
    round-trips `annotations` (readOnlyHint/destructiveHint) and derives
    JSON-Schema `required` correctly from zod optionality. (4) Claude Code
    attaches `_meta: {"claudecode/toolUseId": …, progressToken: …}` to
    `tools/call` — handlers must tolerate `_meta`.
  - **Gate outcome**: D3 confirmed; registry contract can freeze on
    `@modelcontextprotocol/sdk@1.30.0` + zod v4 `registerTool` shape. Re-run
    the wire capture if Claude Code's requested protocolVersion advances.

- **S2 RESOLVED (2026-07-31)**: `https://www.schemastore.org/claude-code-settings.json`
  (301 from json.schemastore.org) resolves; draft-07; **143 top-level properties**
  including `permissions`, `hooks`, `statusLine`, `enabledPlugins`,
  `extraKnownMarketplaces`, `sandbox`, `pluginConfigs` — and every key the research
  pass had flagged possibly-hallucinated (`alwaysThinkingEnabled`, `autoMode`,
  `fastMode`, `effortLevel`, `editorMode`, `autoCompactEnabled`, `tui`,
  `fileCheckpointingEnabled`, `advisorModel`, `allowedHttpHookUrls`,
  `channelsEnabled`) is present. Vendored to
  `packages/emitters/claude-code/schema/settings.schema.json` as the emitter
  whitelist + test-fixture oracle. The hallucination flag was the summarizer's
  truncation, not the schema.

- **S3 RESOLVED (2026-07-31)**: empirical canary test (two skills, one only in
  `.agents/skills/`, one only in `.claude/skills/`, fresh git dir, headless
  `claude -p` listing): **Claude Code does NOT scan `.agents/skills/`** — only the
  `.claude/skills/` canary was visible. Consequence: the `.claude/skills/<n>` link
  (symlink default, copy fallback) is MANDATORY for every skill that targets
  claude-code; `skills experimental_install` (which restores only to
  `.agents/skills/`) must always be followed by per-agent linking. Default
  `linkMode: "symlink"` confirmed as the correct default.

- **S6 RESOLVED (2026-07-31)**: **Project-scope `.zed/settings.json` DOES carry
  `context_servers` — verdict: file.** Source-verified against zed-industries/zed
  `main` (local binary: Zed preview 1.10.0 / 8d56867; no display/Xvfb in this
  container, so verification is source + docs, not a GUI run):
  - Local settings files are parsed as `ProjectSettingsContent`
    (`crates/settings/src/settings_store.rs`, `set_local_settings` →
    `parse_and_migrate_zed_settings::<ProjectSettingsContent>` → stored as
    `SettingsContent { project: …, ..Default::default() }`) — i.e. only the
    project subset of settings takes effect at project scope.
  - `ProjectSettingsContent` includes `pub context_servers:
    HashMap<Arc<str>, ContextServerSettingsContent>` and
    `context_server_timeout` (`crates/settings_content/src/project.rs` ~L70).
  - The consumer resolves them worktree-scoped: `ContextServerStore` calls
    `ProjectSettings::get(Some(SettingsLocation { worktree_id, .. }))
    .context_servers` (`crates/project/src/context_server_store.rs` ~L1140),
    so local values from `.zed/settings.json` are honored (merged over user
    scope; local wins per Zed's default→user→local merge in
    `recompute_values`).
  - Official docs corroborate indirectly: `session.trust_all_worktrees` —
    "When trusted, project settings are synchronized automatically, language
    and MCP servers are downloaded and started automatically." The dedicated
    context-servers docs page only shows user-scope examples; project scope is
    undocumented but implemented.
  - **Trust gate (emitter consequence)**: project-defined context servers do
    NOT start until the worktree is trusted (Zed's worktree-trust prompt, or
    `session.trust_all_worktrees: true`). Emit the file, and have SETUP.md /
    doctor note the one-time trust prompt.
  - **Unknown-key behavior (drift consequence)**: `ProjectSettingsContent` has
    no `deny_unknown_fields` — at load time Zed SILENTLY ignores unknown or
    user-only keys in `.zed/settings.json`. The strict project-settings JSON
    schema (`root_schema_for::<ProjectSettingsContent>()` with
    `DefaultDenyUnknownFields`) only powers in-editor diagnostics when the
    file is open in Zed. So patterson cannot rely on Zed to flag drift: a
    misspelled or user-scope-only key (e.g. `theme`) in the emitted file
    fails silently — `patterson doctor` must validate emitted Zed settings
    against the project-scope whitelist itself.

- **S7 RESOLVED-FOR-BUN (2026-07-31, P6)**: `bun pm pack` on
  `packages/create-patterson` (carries `"@patterson/cli": "workspace:*"`)
  rewrites the dependency to the concrete version (`"0.0.1"`) in the packed
  tarball — verified by extracting the tarball's package.json. The `npm pack`
  comparison could not run in this environment (the socket-firewall PATH shim
  wraps npm and the mise npm launcher fails under it), but the decision needs
  only the bun half: release scaffolds pack with `bun pm pack` and publish the
  tarball via Node 24 `npm publish --provenance` (C13), so npm never packs.
  Monorepo (changesets) release scaffolds stay gated behind
  `devops.release.monorepo: "experimental"` as planned.

- **S5 PARTIALLY RESOLVED (2026-07-31, P3)**: the GitHub-door hook is in place
  but the empirical fire test is **deferred to publish time (P8)**.
  - Root `package.json` now carries
    `"bun-create": { "postinstall": "bunx create-patterson --resume" }` —
    one shell-free command (single-space split safe), and `--resume` on a
    fresh directory degrades to a fresh wizard, so the hook is harmless
    whether or not it fires.
  - The empirical test (`bun create techdays-ai/patterson-cli`) is blocked:
    the repo is **private**, and Bun's GitHub template path fetches a public
    tarball. Cannot be validated until the repo is public or the package is
    published.
  - **Design consequence already absorbed**: the three-doors architecture
    makes the canonical door `bunx create-patterson` (npm), which does not
    depend on the hook at all. S5's only remaining stake is README wording
    for the GitHub door — gate that on the publish-time test.

- awesome-copilot layout (restructured 2026-02; pin @SHA; `.schemas/` contains a
  stale-path trap).
- Official Anthropic marketplace registered names: `claude-code-plugins`,
  `claude-plugins-official`, `claude-community`.
- skills.sh `GET /api/search` is undocumented; honor `SKILLS_API_URL`; degrade to
  `skills find` output parsing if it vanishes.
- Copilot `.chatmode.md` → `.agent.md` rename (2025-11-25); `mode:` → `agent:` key.
