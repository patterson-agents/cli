---
title: Design system reference
description: Where this starter fits in the Patterson design-system marketplace, and how its tokens map onto Starlight.
---

## Choosing a starter

| Need | Use |
|---|---|
| Docs, guides, and reference on Astro | **This starter**, `patterson-starlight` |
| Docs on Vite with a lighter toolchain | `patterson-vitepress` |
| Interactive, in-browser coding tutorial | `patterson-tutorialkit` |
| Single on-brand marketing page | `patterson-corporate-page` |
| Full corporate site shell | `patterson-corporate-website` |

## Starlight to Patterson token map

| Starlight variable | Patterson source |
|---|---|
| `--sl-color-accent-high` (dark) | sky-40 `#99DCF3` |
| `--sl-color-accent` (dark) | `#0A84B8` |
| `--sl-color-accent-low` (dark) | `#012D4D` |
| `--sl-color-accent-high` (light) | navy `#003767` |
| `--sl-color-accent` (light) | link blue `#147EC2` |
| `--sl-color-accent-low` (light) | navy-10 `#E5EBF0` |
| `--sl-color-gray-1` … `-7` (light) | Patterson cool gray ramp |
| `--sl-font` | `'proxima-nova', Arial, sans-serif` |
| `.header` background | navy `#003767` with a sky `#00A8E1` hairline |
| `:focus-visible` | 2px sky ring, 2px offset |
| `.sl-link-button.primary` (light) | navy, `#315D83` on hover |
| `.sl-link-button.primary` (dark) | sky, `#33B9E7` on hover |
| `.card`, `.starlight-aside`, code frames | 5px radius |

## Pinned dependencies

| Package | Version | Why pinned |
|---|---|---|
| `astro` | 7.1.5 | Supply-chain scored and install-verified at this exact version |
| `@astrojs/starlight` | 0.41.5 | Matched to the Astro 7 line |

Both are pinned without a caret. Adding a dependency to this template means scoring it
first.

The image pipeline deliberately uses Astro's passthrough service rather than an
optimizing image library. Astro still declares `sharp` as an *optional* dependency, so
it appears in the lockfile and in `node_modules`, but it is never loaded — passthrough
copies images through instead of calling it. Do not switch the image service back, and
do not install with `--omit=optional`: that strips Rolldown's native binding along with
sharp and the build fails.

## Components

Starlight ships MDX components including `Card`, `CardGrid`, `Tabs`, `Aside`, `Steps`,
`LinkCard`, and `FileTree`. All of them inherit the Patterson accent and shape tokens.
Import them in any `.mdx` page.

```mdx
import { Card, CardGrid, Aside } from '@astrojs/starlight/components';
```

The [Starlight components reference](https://starlight.astro.build/components/) covers
the full set.

## Project layout

```text
astro.config.mjs          Starlight integration, sidebar, head, image service
src/content.config.ts     Astro content-layer collection for docs
src/content/docs/         Your pages. Folders drive the sidebar
src/styles/patterson.css  The only brand file
src/assets/               Hero logos, processed by Astro
public/                   Favicon and nav logos, copied verbatim
```
