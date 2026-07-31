# Presentation Deck

Patterson 16:9 company-overview deck, built on [`deck-stage.js`](deck-stage.js) — which owns
scaling, keyboard nav, the thumbnail rail, speaker notes and print-to-PDF. One `<section>`
per slide inside `<deck-stage>`.

## Slides

Cover · section divider · stats band · comparison · quote · capabilities table · full-bleed
photo band · closing. The wave watermark ([`wave-bg-navy.png`](../../assets/brand)) sits
behind navy slides at low contrast.

## Editing

- Add a slide: copy a `<section class="slide">` and its `data-label`. The label surfaces in
  the rail and in review comments.
- Keep slide text **≥24px** at 1920×1080, ideally much larger.
- Statements set in navy; statistics oversized in sky. Numbers are how this brand proves things.
- Export: the deck is print-ready as-is — no extra print CSS.

## Brand rules that bite on decks

Only 400 and 700 Proxima Nova faces exist, so the theme's 800 headings render as faux bold.
No gradients, no glass, no emoji. See [`../../DESIGN.md`](../../DESIGN.md).
