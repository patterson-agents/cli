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

## Known-stale watchlist (re-verify at implementation touch-time)

- awesome-copilot layout (restructured 2026-02; pin @SHA; `.schemas/` contains a
  stale-path trap).
- Official Anthropic marketplace registered names: `claude-code-plugins`,
  `claude-plugins-official`, `claude-community`.
- skills.sh `GET /api/search` is undocumented; honor `SKILLS_API_URL`; degrade to
  `skills find` output parsing if it vanishes.
- Copilot `.chatmode.md` → `.agent.md` rename (2025-11-25); `mode:` → `agent:` key.
