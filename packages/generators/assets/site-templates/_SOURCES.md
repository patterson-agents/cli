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
| Commit | `dd0b84b22d4cee3076456c07e60cbb9f2274e4da` |
| Vendored | 2026-08-12 |
| Sync direction | design-plugins (canonical) → cli (vendored copy); **never the reverse** |
| Method | `git archive HEAD:<canonical path>` — tracked files only, so no `node_modules/`, no `.vitepress/cache/`, no build output |

| Template | Canonical path | Files | sha256 |
|---|---|---|---|
| `starlight/` | `plugins/patterson-starlight/ds/templates/starlight` | 18 | `7892c997356ad0fcd23cd2d7adabe33bdd527d6bfde16019464782c0cb06ec67` |
| `vitepress/` | `plugins/patterson-vitepress/ds/templates/vitepress` | 15 | `741166381d009876909eb72d29d33ab5174a99bcf809b566c53443eb9597c675` |

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
| `starlight/` | `astro@7.2.1`, `@astrojs/starlight@0.41.7` — exact, no range |
| `vitepress/` | `vitepress@2.0.0-alpha.19` — exact, no range |

> [!NOTE]
> Version specs are copied verbatim from upstream; tightening or loosening one here would
> break byte-identity with the canonical home. Change it upstream, where the template is
> install-verified, then re-vendor. `2.0.0-alpha.19` is VitePress's current `next`
> dist-tag and its newest release — `latest` is `1.6.4`, so moving there is a downgrade.

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
