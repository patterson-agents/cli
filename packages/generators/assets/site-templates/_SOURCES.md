# Sources — vendored site templates

`starlight/` and `vitepress/` are **copies**. Their canonical home is the
`design-plugins` marketplace repository, where each ships as a plugin's `ds/templates/`
payload. This package vendors them so that `patterson new starlight-site` and
`patterson new vitepress-site` scaffold entirely offline — embedded content installs
from vendored package assets, never the network.

---

## Primary source

| Field | Value |
|---|---|
| Repository | `github.com/patterson-agents/design-plugins` |
| Commit | `faf924a9ffc02bfc9c1543a1154aed326b20d6ec` |
| Vendored | 2026-08-12 |
| Sync direction | design-plugins (canonical) → cli (vendored copy); **never the reverse** |
| Method | `git archive HEAD:<canonical path>` — tracked files only, so no `node_modules/`, no `.vitepress/cache/`, no build output |

| Template | Canonical path | Files | sha256 |
|---|---|---|---|
| `starlight/` | `plugins/patterson-starlight/ds/templates/starlight` | 18 | `3672e76fc23dc74418f9cb7aa7c3f18affc4b6408a6303523a9ec39f70c79f66` |
| `vitepress/` | `plugins/patterson-vitepress/ds/templates/vitepress` | 15 | `78aa5887b848e7c30a189958be9f5ef7b48047cba0e16e79084c9ef362af7c6e` |

The digest is sha256 over the manifest line `<sha256 of file>  <path>` (newline
terminated) for every file, path-sorted. `siteTemplateDigest()` in `../../src/site.ts`
recomputes it and `test/site-generators.test.ts` asserts it still matches the table
above — so an accidental edit to a vendored file fails the gate, exactly as a stale
golden fixture does. This file and `SITE_TEMPLATE_PROVENANCE` are updated together.

## Pinned versions

Both templates were install-verified upstream, and both carry a committed `bun.lock`, so
`bun install` inside a scaffolded site resolves the tree that was actually tested.

| Template | Direct dependencies |
|---|---|
| `starlight/` | `astro@7.1.5`, `@astrojs/starlight@0.41.5` — exact, no range |
| `vitepress/` | `vitepress@^2.0.0-alpha.19` — a caret range, resolved to `2.0.0-alpha.19` by the committed `bun.lock` |

> [!NOTE]
> The `vitepress` caret is the upstream template's own specification and is copied
> verbatim; tightening it here would break byte-identity with the canonical home. The
> committed lockfile is what makes that install deterministic. Change it upstream first,
> then re-vendor.

## Rules for maintainers

1. **Never edit a file under `starlight/` or `vitepress/` in this repository.** Fix it in
   design-plugins, then re-vendor the whole tree and update the digest table.
2. Re-vendor with `git archive`, never `cp -R` — `cp` picks up untracked build output
   (`.vitepress/cache/`, `.vitepress/dist/`, `.astro/`, `node_modules/`).
3. Re-vendoring is a behavior change for the generators: record the new commit, date,
   file counts, and digests here *and* in `SITE_TEMPLATE_PROVENANCE`.
4. Adding a dependency to either template means supply-chain scoring it first
   (Constitution IV) — upstream, in design-plugins, where the template lives.
5. This file is never copied into a scaffolded site: it documents the vendoring, not the
   site. `test/site-generators.test.ts` asserts that.
