---
title: Theming
description: How the Patterson brand is mapped onto Starlight, and how to adjust it.
---

All Patterson branding is applied in one stylesheet, `src/styles/patterson.css`,
loaded through `customCss` in `astro.config.mjs`. No Starlight component is ejected,
so the theme survives Starlight upgrades.

## How it works

Starlight is themed through CSS custom properties. It publishes its **dark** values on
`:root` and its **light** values on `:root[data-theme='light']`. The Patterson
stylesheet overrides four things and leaves the rest of Starlight's tuned defaults
alone.

1. **Accent tiers.** `--sl-color-accent-low`, `--sl-color-accent`, and
   `--sl-color-accent-high`, set per theme. Sky forward on dark, navy forward on light.
2. **Type stacks.** `--sl-font` and `--sl-font-mono` point at the Patterson stacks.
3. **The light neutral ramp.** `--sl-color-gray-1` through `-7` come from the Patterson
   cool grays. The dark ramp is left as Starlight ships it, because that is where
   contrast regressions hide.
4. **Brand chrome.** The navy header with its sky hairline, the sky focus ring, the
   button states, and the 5px shape language.

## Adjusting the accent

Edit the accent block for the theme you want.

```css
/* dark canvas */
:root {
  --sl-color-accent-low: #012d4d;
  --sl-color-accent: #0a84b8;
  --sl-color-accent-high: var(--pat-sky-40);
}

/* light canvas */
:root[data-theme='light'] {
  --sl-color-accent-low: var(--pat-navy-10);
  --sl-color-accent: var(--pat-blue);
  --sl-color-accent-high: var(--pat-navy);
}
```

Keep the light accent on navy or link blue. Moving sky into a text role on white
breaks contrast.

## Loading Proxima Nova

The font stack is `'proxima-nova', Arial, sans-serif`, verbatim from the live Patterson
sites. The face itself comes from Adobe Fonts kit `uth1qfm`, loaded by the `head`
entry in `astro.config.mjs`.

```js
head: [
  {
    tag: 'link',
    attrs: { rel: 'stylesheet', href: 'https://use.typekit.net/uth1qfm.css' },
  },
],
```

Never self-host the face and never add an `@font-face` block for it. Adobe's terms do
not permit re-hosting Typekit payloads. If the kit cannot be reached from your
deployment, the stack falls back to Arial, which is the sanctioned substitute.

## Swapping the logo

Logos live in `src/assets/` for the hero and `public/` for the nav and favicon.
Replace the white and navy lockups with your own. Keep the white lockup on the navy
chrome and the navy lockup on light surfaces, and never redraw the wave mark.

## Images

The starter uses Astro's passthrough image service, configured in `astro.config.mjs`.
Images are copied through untouched rather than optimized at build time, so no image
library is loaded during a build. If you later need resizing or format conversion,
pre-process the assets before committing them rather than adding an image pipeline
dependency.

Astro declares `sharp` as an *optional* dependency, so it does land in `node_modules` on
a default install even though passthrough never calls it. Leave it there. Installing
with `--omit=optional` removes Rolldown's native binding at the same time, and the build
fails with `Cannot find native binding`.
