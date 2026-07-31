# Canvas

A full Patterson corporate page — nav, hero, proof band, capability cards, CTA, footer —
wired to **three expressive tweaks**. It is the template to open when you want to see how far
the system flexes without leaving the brand.

Entry: [`Canvas.dc.html`](Canvas.dc.html) (a Design Component).

## The tweaks

Each control reshapes the *feel* of the whole page, not one property.

| Tweak | Options | What it moves |
| --- | --- | --- |
| **Hero surface** | Navy ground · Paper · Soft blue | Reskins the page end to end: hero ground and text, eyebrow color, wave-watermark opacity, both button treatments, and the alternating band colors behind proof / capabilities / CTA. Navy ground is the corporate default; Paper is the quiet editorial read; Soft blue is the sky-forward storefront register. |
| **Density** | Editorial · Standard · Compact | Retunes the whole type-and-space rhythm together — section padding, h1/h2/lead/quote/stat sizes, stack gaps, card padding, grid gaps and the headline measure. Editorial is a landing page; Compact is an internal dashboard header. |
| **Proof** | Statistics · Statements | Swaps how the page argues. Statistics renders the four-up sky numeral band (*1877 · 98% · 60 · 86M*) — numbers as proof, the brand's signature device. Statements replaces it with a navy pull-quote and supporting line, for pages where the claim is about character rather than scale. |

## How it is wired

Tweaks are declared in `data-props` and read via `this.props` in the logic class. The class
maps each option to a **table of values**, then sets CSS custom properties imperatively on the
root element in `componentDidMount` / `componentDidUpdate`.

Every `style` attribute in the template stays a **literal** with a `var()` fallback:

```html
padding: var(--pc-pad-y, 96px)
```

so the page paints correctly from the first streamed character, and the literals double as the
default theme (Navy ground / Standard / Statistics). No style attribute is driven by a
`{{ hole }}` — holes cannot resolve mid-stream, which would leave the page unstyled while it
loads.

## Editing

Copy the folder and adjust `base` in [`ds-base.js`](ds-base.js) to point at the design system.
Content is static markup, so headings and copy are directly click-editable in the preview.
Add a tweak by extending the `D` (density) or `S` (surface) tables and setting one more
custom property — the template rarely needs to change.

See [`../../DESIGN.md`](../../DESIGN.md) for the verified brand rules these values follow.
