# Design tokens

Every brand value, as CSS custom properties. [`../styles.css`](../styles.css) imports all of
these in order — consumers link that one file, never these individually.

| File | Contains |
| --- | --- |
| [`fonts.css`](fonts.css) | `@font-face` for Proxima Nova (self-hosted from the licensed kit) + the Figtree / IBM Plex Mono fallbacks. |
| [`icons.css`](icons.css) | The official `patterson-icons` webfont and its 93 `.pat-i-*` glyph classes. |
| [`colors.css`](colors.css) | Brand, tint, neutral and semantic colors; interaction states; semantic aliases; production name aliases. |
| [`typography.css`](typography.css) | Families, weights, the fluid `--fs-*` system scale **and** the exact `--pt-*` production scale. |
| [`spacing.css`](spacing.css) | 4px spacing scale, radii (production + system), layout widths, control heights. |
| [`effects.css`](effects.css) | Elevation, focus rings, motion durations and easings, overlay scrim. |
| [`base.css`](base.css) | Element defaults and helpers (`.pat-container`, `.pat-eyebrow`, `.pat-production`). |

## Two scales, on purpose

`typography.css` and `spacing.css` each carry **production-verified** values alongside this
system's own conventions. Production values are the truth about the live Patterson sites;
system values are deliberate additions. Both are labelled in the files.

- **Production:** `--pt-*` type scale, `--radius-btn` 5px, `--radius-field` 2px,
  `--download-shadow`, `--transition-prod`.
- **System:** the fluid `--fs-*` scale, `--radius-pill`, navy-tinted `--shadow-*`,
  `--ring-focus`, the tracking tokens, the 44px control floor.

Read [`../DESIGN.md`](../DESIGN.md) — specifically its Verification section — before changing
either set. Several intuitive-seeming values are wrong: Patterson is not a pill brand, and
only two font weights are licensed.

## Adding a token

1. Add it to the right file here.
2. Mirror it in [`../theme.json`](../theme.json), the machine-readable source the
   [framework adapters](../integrations) are generated from.
3. If the compiler can't infer its kind from name or value, annotate the line:
   `--my-token: 4px; /* @kind spacing */` (or `color` / `radius` / `shadow` / `font` / `other`).
