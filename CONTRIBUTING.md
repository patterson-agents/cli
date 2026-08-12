# Contributing

Canonical contribution guidelines for the Patterson org live in
[`patterson-corp/CONTRIBUTING.md`](https://github.com/patterson-agents/patterson-corp/blob/main/CONTRIBUTING.md).
Read that first.

## This repo keeps its own conventions

`patterson` (this repo) is governed by its own documentation chain, which takes precedence over
generic org conventions where they'd otherwise conflict:

- [`AGENTS.md`](AGENTS.md) (`CLAUDE.md` is a symlink to it) — start here.
- [`.specify/memory/constitution.md`](.specify/memory/constitution.md) — 7 binding principles,
  including the never-write list and the supply-chain gate.
- The [`specs/001-patterson-cli-v1/`](specs/001-patterson-cli-v1/) spec tree — wins on any drift.

Before opening a PR:

```sh
bun install
bun run gate      # typecheck + test + lint — the full check before calling anything done
```

Commits follow [Conventional Commits](https://www.conventionalcommits.org/); `commitlint` and
`lefthook` enforce this (`bunx lefthook install` once per clone). See
[REFERENCES.md](REFERENCES.md) for pinned upstream dependency versions.
