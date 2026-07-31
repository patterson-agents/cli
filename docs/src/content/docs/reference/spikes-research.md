---
title: Spikes & research
description: The S1–S7 spike registry — what each spike gates, and the recorded findings for the resolved ones.
sidebar:
  order: 4
---

patterson's constitution requires that any claim about an external surface —
a config schema, a discovery order, protocol support — either cites a primary
source or is gated behind a **named spike** whose result is recorded before
dependent work proceeds. This page is the public status of that spike
registry.

:::note[Status]
S1, S2, and S3 are **resolved** (findings below, recorded 2026-07-31). S4–S7
remain **open** and gate work in their consumer phases — dependent features
are not built until their spike lands.
:::

## Registry

| Spike | Question | Runs before | Gates | Status |
| --- | --- | --- | --- | --- |
| **S1** | Does `@modelcontextprotocol/sdk@1.30` stdio connect to real Claude Code? What does a newer-protocol client do? | P1, before registry freeze | Registry contract, `mcp` package | ✅ Resolved |
| **S2** | Does the schemastore Claude Code settings schema resolve and stay current? | P2a, first task | claude-code emitter whitelist + validation harness | ✅ Resolved |
| **S3** | Does Claude Code scan `.agents/skills/`? | P2a | Skills layout, wizard install | ✅ Resolved |
| **S4** | Can a compiled binary `import()` arbitrary paths? | P8 | Plugin loader in-process vs out-of-process | ⏳ Open |
| **S5** | Does `bun-create.postinstall` fire on the GitHub template path? | P3 | Distribution shim weighting, README instructions | ⏳ Open |
| **S6** | Can `.zed/settings.json` carry `context_servers` at project scope? | P2b | Zed emitter mode (file vs instruct) | ⏳ Open |
| **S7** | Do changesets work with Bun workspaces `workspace:*`? (tarball diff: `bun pm pack` vs `npm pack`) | P6 | Release scaffold gating (`experimental`) | ⏳ Open |

## S1 — MCP SDK vs real Claude Code (resolved)

**Verdict: `@modelcontextprotocol/sdk@1.30.0` works end to end with real
Claude Code (v2.1.220).** The registry contract froze on sdk 1.30 + zod v4.

Key findings:

- **Protocol negotiation**: real Claude Code sends protocol version
  `2025-11-25` in its initialize request (wire-captured); sdk 1.30.0's latest
  supported version is exactly that, echoed back verbatim. The SDK supports
  `2025-11-25`, `2025-06-18`, `2025-03-26`, `2024-11-05`, and `2024-10-07`; a
  client requesting an unknown newer version gets the SDK's latest back and
  decides for itself whether to proceed. No newer-era client exists in the
  wild yet.
- **Live headless verification**: with a project-scope `.mcp.json`, headless
  runs hit `Pending approval` (project MCP servers need interactive trust);
  `claude -p … --mcp-config <file> --strict-mcp-config` bypasses this. With
  that, Claude Code listed both spike tools and called them successfully.
- **Surprise — validation errors are tool results, not protocol errors**:
  zod-invalid `tools/call` arguments do **not** produce a JSON-RPC error; the
  SDK returns an `isError: true` tool *result* with the validation message.
  Error mapping must not expect protocol-level errors for validation failures.
- **Surprise — `_meta` on calls**: Claude Code attaches
  `_meta` (`claudecode/toolUseId`, `progressToken`) to `tools/call`; handlers
  must tolerate it.
- `tools/list` round-trips `readOnlyHint`/`destructiveHint` annotations and
  derives JSON-Schema `required` correctly from zod optionality.
- Re-verify the wire capture if Claude Code's requested protocol version ever
  advances.

## S2 — Claude Code settings schema (resolved)

**Verdict: the schemastore schema resolves and is authoritative.**
`https://www.schemastore.org/claude-code-settings.json` resolves (draft-07)
with **143 top-level properties** — including every key an earlier research
pass had flagged as possibly hallucinated (`permissions`, `hooks`,
`statusLine`, `enabledPlugins`, `sandbox`, `alwaysThinkingEnabled`, and
others). The "hallucination" flag turned out to be a summarizer truncation,
not a schema gap.

The schema is vendored into the claude-code emitter package as its settings
**whitelist and test-fixture oracle** — the emitter validates against the
real schema, not against research notes.

## S3 — Skills discovery in Claude Code (resolved)

**Verdict: Claude Code does *not* scan `.agents/skills/`.** An empirical
canary test (two skills — one only in `.agents/skills/`, one only in
`.claude/skills/` — in a fresh git directory, listed via headless `claude -p`)
showed only the `.claude/skills/` canary was visible.

Consequences baked into the design:

- The `.claude/skills/<name>` link is **mandatory** for every skill targeting
  Claude Code; canonical placement alone is invisible to it.
- The upstream skills tool's install (which restores only to
  `.agents/skills/`) must always be followed by per-agent linking.
- The default `linkMode: "symlink"` was confirmed as the correct default
  (copy remains the fallback).

## Open spikes

- **S4** (P8): whether a `bun build --compile` binary can `import()` arbitrary
  paths decides if the plugin loader runs in-process or out-of-process.
- **S5** (P3): `bun create` from a GitHub template repo has undocumented hook
  behavior; S5 tests empirically whether `bun-create.postinstall` fires,
  which decides how much weight the npm shim vs the GitHub door carries.
- **S6** (P2b): decides whether Zed MCP servers can be emitted as a project
  file or must fall back to instruct-mode (SETUP.md).
- **S7** (P6): decides whether monorepo release scaffolds can leave
  `experimental` status.

## Known-stale watchlist

Facts verified once but likely to move — re-verified at implementation
touch-time, not trusted from memory:

- **awesome-copilot layout** — restructured 2026-02; consumed at a pinned SHA;
  its `.schemas/` directory contains a stale-path trap.
- **Official Anthropic marketplace names** — `claude-code-plugins`,
  `claude-plugins-official`, `claude-community`.
- **skills.sh search API** — `GET /api/search` is undocumented; patterson
  honors `SKILLS_API_URL` and degrades to parsing `skills find` output if the
  endpoint vanishes.
- **Copilot `.chatmode.md` → `.agent.md` rename** (2025-11-25), including the
  `mode:` → `agent:` key change.

## Related: the decision record

The spike registry sits alongside twelve recorded load-bearing decisions
(D1–D12) in the spec tree — canonical IR with per-surface emitters, citty +
@clack for the CLI, registry-first command definition, shelling out to the
pinned skills CLI rather than reimplementing it, the instructions compile
rule (`AGENTS.md` widest, `CLAUDE.md` shim, Copilot copy), SecretRef/argv/glob
node forms, provenance and never-clobber semantics, three distribution doors,
the vendored design snapshot, and lessons-as-data for the tutor. See
`specs/001-patterson-cli-v1/research.md` in the repository for the full
Decision / Rationale / Alternatives record.
