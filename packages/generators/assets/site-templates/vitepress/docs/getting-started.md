# Getting started

This is a ready-to-run [VitePress](https://vitepress.dev) project skinned in the
Patterson Companies brand. Scaffold it, run it, and start writing.

## Prerequisites

Node 20 or newer, or [Bun](https://bun.sh) 1.1 or newer. The commands below use Bun.
npm works identically.

## Scaffold

```sh
bun create patterson-vitepress my-docs
cd my-docs
```

If the template is not registered locally, copy it out of the plugin instead:

```sh
cp -R "${CLAUDE_PLUGIN_ROOT}/ds/templates/vitepress" my-docs
cd my-docs
bun install
```

## Run

```sh
bun run docs:dev
```

The dev server serves the themed docs at `http://localhost:5173`. Content and style
edits hot-reload.

## Add a page

Create a Markdown file under `docs/`. The URL follows the file path, so
`docs/guides/ordering.md` becomes `/guides/ordering`. Then add it to the sidebar in
`docs/.vitepress/config.ts`.

```md
# Placing an order

How to submit an order through the API.
```

The first `# heading` becomes the page title. VitePress does not autogenerate the
sidebar, so a new page needs one line in `config.ts` to appear in it.

::: warning
VitePress fails the build on a dead internal link. If you remove a page, remove every
link to it, or set `ignoreDeadLinks` in `config.ts`.
:::

## Point it at a domain

VitePress does not need a `site` origin to build. The one deployment field that
matters is `base` in `docs/.vitepress/config.ts`, and only when the site is served
from a sub-path rather than a domain root, as with GitHub Pages project sites. It is
commented out in the starter.

## Re-theme

All brand mapping lives in `docs/.vitepress/theme/custom.css`, which remaps VitePress's
`--vp-*` variables onto Patterson tokens. Change a value there and both themes update.
[Theming](/guides/theming) walks the full surface.

::: tip
Proxima Nova is an Adobe Fonts face served by kit `uth1qfm`, linked from the `head`
entry in `config.ts`. Adobe's terms do not permit re-hosting Typekit payloads, so never
commit font binaries or `@font-face` declarations for it. Arial is the sanctioned
substitute when the kit is unavailable.
:::
