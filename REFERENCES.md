# References

## Source of truth

This repo's own documentation chain wins on any drift with this file. In order:

1. [`AGENTS.md`](AGENTS.md) (`CLAUDE.md` is a symlink to it) — binding guidance for coding
   agents, entry point for everything below.
2. [`.specify/memory/constitution.md`](.specify/memory/constitution.md) — 7 binding principles,
   notably II (drift safety + the never-write list: `skills-lock.json`, the global
   `.skill-lock.json`, and `.claude/settings.local.json` beyond first creation) and IV
   (supply-chain gate: socket-score every dependency before install, pin everything, no
   `@latest`).
3. [`specs/001-patterson-cli-v1/`](specs/001-patterson-cli-v1/) — the spec tree:
   `spec.md` (WHAT) → `plan.md` (HOW) → `research.md` (decisions D1–D12 + spikes S1–S7) →
   `data-model.md` (the IR) → `contracts/` → `tasks.md`. On drift between the spec tree and any
   other doc, **the spec tree wins**.

## Upstream dependencies

Versions pinned in this repo's `package.json` files as of this writing:

| Package | Version | Used in |
|---|---|---|
| [`citty`](https://github.com/unjs/citty) | `0.2.2` | `packages/cli` — the CLI command tree |
| [`@clack/prompts`](https://github.com/bombshell-dev/clack) | `1.7.0` | `packages/cli` — the interactive wizard |
| [`zod`](https://github.com/colinhacks/zod) | `4.4.3` | `packages/core`, `packages/cli`, `packages/skills`, `packages/tutor`, `packages/mcp` — schema validation |
| [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) | `1.30.0` | `packages/mcp` — the stdio MCP server |

`bun.lock` is the authoritative lockfile for exact resolved versions and transitive deps; the
table above reflects direct `package.json` pins.

## Brand assets

`docs/assets/patterson-logo-navy.svg`, `docs/assets/patterson-logo-white.svg`,
`docs/assets/patterson-logo-square-navy.svg`, and `docs/assets/banner.svg` are copied from
[`patterson-agents/patterson-corp`](https://github.com/patterson-agents/patterson-corp)'s
`docs/assets/`. The README's existing `<picture>` block points at
`Patterson-Agents/design-system`'s hosted copies and is left as-is.
