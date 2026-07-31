# Fonts

## Proxima Nova — the brand face

Self-hosted from the licensed Adobe files: `proxima-nova-400.woff2`,
`proxima-nova-700.woff2`, `proxima-nova-italic.woff2`.

**Only 400 and 700 are real.** The official kit ([`typekit-rul6mjk.css`](typekit-rul6mjk.css),
published 2024-08-01) serves exactly four faces — n4, i4, n7, i7. The production Patterson
theme nevertheless asks for `font-weight: 800` on h1/h2, `600` on `.btn` and `500` on
`.eyebrow`, so **the live sites render browser-synthesized faux bold** at those weights. Treat
700 as the real bold ceiling; to get genuine heavier weights, variations must be added to the
Typekit kit first.

To load from Adobe instead of these local copies, swap the `@font-face` blocks in
[`../../tokens/fonts.css`](../../tokens/fonts.css) for
`@import url('../assets/fonts/typekit-rul6mjk.css');`.

## patterson-icons — the official icon font

`patterson-icons.woff` / `.ttf` / `.svg` — **93 glyphs**, 1024 units-per-em, ascent 960 /
descent −64, private-use codepoints from `U+E900`. Lifted from the production storefront
pattern library. Wired up by [`../../tokens/icons.css`](../../tokens/icons.css) and exposed as
the [`Icon`](../../components/core/Icon.jsx) component. This replaces Lucide.

## Fallbacks

**Figtree** (Google) is the loaded free fallback and **Arial** is the PowerPoint-safe
substitute named in the official template. Never substitute Inter, Roboto, or any serif.
