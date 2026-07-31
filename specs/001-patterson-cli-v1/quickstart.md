# Quickstart (contributors)

```sh
bun install                 # workspace root
bun test                    # all packages
bunx tsc --noEmit           # typecheck
bunx oxlint .               # lint
```

## Walking skeleton (post-P2a)

```sh
bun run packages/cli/src/index.ts create /tmp/demo --yes \
  --template skeleton --agents claude-code     # docs-site becomes available post-P3
cd /tmp/demo && bun run patterson doctor       # script written by create (T024)
```

## MCP smoke test (post-P4)

```sh
bun run packages/mcp/test/handshake.ts     # initialize + tools/list + tools/call
```

## Layout

See plan.md → Project Structure. Rules of the road: constitution
(`.specify/memory/constitution.md`) — especially II (drift safety / never-write list)
and IV (socket-score every dep before adding it, pinned).

## Spec tree

`specs/001-patterson-cli-v1/`: spec.md (WHAT) → plan.md (HOW) → research.md
(decisions + spikes) → data-model.md (IR) → contracts/ (registry + emitter) →
tasks.md (P0–P2a detailed; later phases elaborated at phase boundaries).
