# AGENTS.md

Guidance for coding agents working in this repository. `CLAUDE.md` is a symlink to this
file — edit `AGENTS.md`, and both names stay in sync.

Bun + OpenTUI terminal application, scaffolded from `bun create tui` and still close to
the template.

## Runtime & commands

**Bun only.** `bun.lock` is the lockfile — never run `npm`/`pnpm`/`yarn`, and don't add a
`package-lock.json` or `node_modules/.package-lock.json`.

```sh
bun install
bun dev              # = bun run --watch src/index.ts
bunx tsc --noEmit    # the only verification step that exists
```

There is **no test runner, linter, formatter, or CI**. `bunx tsc --noEmit` is the entire
verification story — run it before declaring work done. It currently passes clean. If you
need to verify runtime behaviour, you must either add a test setup or ask the user to run
the app; do not claim a change works because it typechecks.

**Never run `bun dev` in a blocking tool call.** It takes over the terminal with a
full-screen renderer and does not return (`exitOnCtrlC: true` in `src/index.ts`).
Background it or hand it to the user.

## Layout

- `src/index.ts` — the entry point and currently the whole app.
- `package.json` `"module": "src/index.tsx"` is a **stale scaffold default** — no `.tsx`
  file exists anywhere in `src/`. Fix the field rather than creating an `index.tsx` to
  match it.

## OpenTUI

`src/index.ts` uses the **functional element API**, not JSX: `Box()`, `Text()`,
`ASCIIFont()` are composed as plain calls and handed to `renderer.root.add(...)`.

The `@opentui/react` and `@opentui/solid` bindings (plus `solid-js`) are dependencies but
are **not imported anywhere yet** — only `@opentui/core` is actually used. Adding JSX also
requires setting `jsx` / `jsxImportSource` in `tsconfig.json`, which is **not configured
today**; installing a binding alone is not enough. Pick one binding rather than wiring up
both React and Solid.

`@opentui/keymap` and `@opentui/ssh` were deliberately **removed** — both scored below the
90 supply-chain threshold (78 and 76) on the `socket` gate, driven by package age rather
than any publisher anomaly, and neither was imported. Re-add them if you genuinely need
keybindings or SSH serving, but re-score first:
`socket package shallow npm pkg:npm/@opentui/keymap@<ver> --markdown`.

`@opentui/core-linux-x64*` are native optional platform packages resolved at install time.
Don't import them directly or pin them by hand.

A pinned `opentui` agent skill carries the full API reference — **load it before writing
non-trivial OpenTUI code instead of guessing component props.** It lives in
`.claude/skills/opentui/` and is mirrored byte-for-byte in `.agents/skills/opentui/`;
`skills-lock.json` pins it to `anomalyco/opentui` with a content hash. Edit both copies
together, or better, re-sync from source rather than hand-editing either.

## TypeScript config quirks

`tsconfig.json` is strict in ways that bite:

- `noUncheckedIndexedAccess` — every array/record index is `T | undefined`.
- `verbatimModuleSyntax` — type-only imports must use `import type`.
- `allowImportingTsExtensions` + `noEmit` — Bun runs TS directly; tsc never emits.
