# Assets

Brand files the designs actually load. Copy what you need into a consuming project — these
paths are not resolvable from outside this repo.

## [`brand/`](brand)

- **Lockups** — `patterson-logo-white.svg`, `-navy.svg`, `-sky.svg`, `-square.svg`,
  `-square-navy.svg`. The corporate wave-mark + PATTERSON wordmark, recolored.
- **Favicons** — Patterson **Veterinary** set (`favicon-16x16.png`, `favicon-32x32.png`,
  `apple-touch-icon-180x180.png`, `android-chrome-192x192.png`, `safari-pinned-tab.svg`).
  The square navy mark; correct for small formats.
- **Imagery** — `wave-bg-navy.png` (the wave watermark, the brand's only decorative mark),
  `photo-markets.png`, `value-prop.png`, `color-palette.png` (the brand-guide palette page
  the color tokens derive from).

## [`fonts/`](fonts)

- `proxima-nova-400.woff2`, `-700.woff2`, `-italic.woff2` — self-hosted from the licensed
  Adobe files. **These four faces are all that exist**; 500 / 600 / 800 are browser-synthesized.
- `typekit-rul6mjk.css` — the official Adobe Fonts kit CSS, verbatim. Swap it in for the
  self-hosted `@font-face` blocks in [`../tokens/fonts.css`](../tokens/fonts.css) to load
  from Adobe instead.
- `patterson-icons.woff` / `.ttf` / `.svg` — the official 93-glyph icon font, wired up by
  [`../tokens/icons.css`](../tokens/icons.css).

## Missing

The **Patterson Dental** and **Patterson Veterinary** horizontal lockups are not here — they
live on a CORS-restricted CDN. Upload `logo-dental.svg` / `logo-vet.svg` if you need them.
Photography is warm, authentic, natural-light — never abstract stock or illustration.
