# Guidelines — foundation specimens

Each file here is a `@dsCard`: a self-contained HTML page rendered as a card in the Design
System tab. They are the visual reference for the brand's foundations, and several document
corrections against the live Patterson theme.

| Group | Cards |
| --- | --- |
| **Brand** | [logo](brand-logo.card.html) · [palette](brand-palette.card.html) · [voice](brand-voice.card.html) · [icon set](brand-icons.card.html) · [interaction states](brand-interaction-states.card.html) |
| **Colors** | [primary](colors-primary.card.html) · [secondary](colors-secondary.card.html) · [tertiary](colors-tertiary.card.html) · [tints](colors-tints.card.html) · [neutral](colors-neutral.card.html) · [semantic](colors-semantic.card.html) |
| **Type** | [family](type-family.card.html) · [display](type-display.card.html) · [body](type-body.card.html) · [weights](type-weights.card.html) · [production scale](type-production-scale.card.html) · [eyebrow & stat](type-eyebrow-stat.card.html) |
| **Spacing** | [scale](spacing-scale.card.html) · [radii](radii.card.html) · [shadows](shadows.card.html) |
| **Other** | [integrations](integrations.card.html) |

## The three worth reading first

- **[Icon set](brand-icons.card.html)** — all 93 glyphs of the official `patterson-icons`
  font, which replaces Lucide.
- **[Interaction states](brand-interaction-states.card.html)** — the real button states, with
  the plausible-but-wrong variants marked ✕.
- **[Weights](type-weights.card.html)** — only 400 and 700 are licensed faces; everything
  else the live theme asks for renders as faux bold.

## Writing a card

Put the marker on the **first line**, then link [`../styles.css`](../styles.css) so real
tokens are available:

```html
<!-- @dsCard group="Type" viewport="700x150" name="Weights" subtitle="…" -->
```
