# Patterson Deck Template — scratchpad

A reusable, brand-accurate **presentation deck template** for the design system.
Lives at `templates/deck/` (picked up as a "Templates" entry). Sample content is a
realistic Patterson corporate overview so each slide archetype looks finished and is
directly editable.

## Title sequence (topic noun-phrase style)
1. **Patterson Companies** — cover (display title + "Trusted Expertise. Unrivaled Support.")
2. **01 · Who We Are** — section divider
3. **Company at a Glance** — content / intro + key facts
4. **By the Numbers** — big-stat slide (1877 / 86M / 98% / 60)
5. **Two Markets, One Mission** — two-column comparison (Dental | Animal Health)
6. **Quote** — full-bleed brand quote (navy)
7. **Three Core Capabilities** — table (Service / Logistics / Products)
8. **Built on a Personal Touch** — full-bleed image band
9. **Let's Work Together** — closing / contact

Reading only the titles tells the story: who we are → facts → scale → markets →
belief → what we do → proof → call to action.

## Archetypes (parallel rules)
- **Cover / Section / Closing:** navy background, white type, sky accent. Section
  dividers share one layout (big number + topic).
- **Content / Table:** white background, navy headings, gray body.
- **Stat:** white background, oversized sky numbers.
- **Quote:** navy background, large white serifless quote, sky quotation mark.
- Footer wordmark "Patterson." bottom-left on body slides; slide number bottom-right.

## Type scale (1920×1080) — CSS vars
display 120 · title 72 · section# 132 · subtitle 40 · lead 38 · body 32 · small 24 ·
eyebrow 22 · stat 128 | pad-x 120 · pad-y 96 · gap-title 36 · gap-item 28

## Foundations
Fonts + colors from the DS via `ds-base.js` (loads `styles.css`). proxima-nova
(Typekit) → Figtree fallback. Navy #003767 / Sky #00A8E1 / Gray #58585B — confirmed
exact against the official PDCO PowerPoint theme.
Real assets used: official Patterson lockup `patterson-logo-white/navy.svg`,
`wave-bg-navy.png` (navy wave-watermark bg on cover/section/quote/closing) and
`photo-markets.png` (full-bleed 4-market photo band on the Personal Touch slide).
Also available: `value-prop.png` (Trusted Expertise / Unrivaled Support chevron).
