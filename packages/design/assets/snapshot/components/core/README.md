# Core components

The primary action and content set. Read via
`window.PattersonCompaniesDesignSystem_3534f9`; specimen card: [`core.card.html`](core.card.html).

| Component | Notes |
| --- | --- |
| [`Button`](Button.jsx) | 5px radius, 15px/30px padding. `primary` navy → **lighter navy `#315D83`**; `secondary` filled light blue `#6DCFF6` with a navy label. Both production-verified. `sky`/`outline`/`ghost`/`onDark` are system additions; `pill` opts into the rounder shape. |
| [`IconButton`](IconButton.jsx) | 44px hit area, navy glyph, `--pat-navy-10` wash on interaction. |
| [`Icon`](Icon.jsx) | A glyph from the official 93-glyph [`patterson-icons`](../../tokens/icons.css) font. Inherits `color`, scales with `font-size` — no stroke. `PATTERSON_ICONS` exports the full name list. |
| [`Badge`](Badge.jsx) | Pill label. Default navy-10 fill; `solid` sky for "New"/featured. |
| [`Stat`](Stat.jsx) | The signature device — an oversized sky numeral with a gray caption. Numbers are how this brand proves things. |
| [`Card`](Card.jsx) | White surface, hairline border, 10px radius, soft shadow. `interactive` lifts 3px; `accent` adds the 4px top stripe. |

Each component ships `Name.jsx` + `Name.d.ts` (typed props) + `Name.prompt.md` (agent usage
notes). See [`../../DESIGN.md`](../../DESIGN.md) for the verified rules behind these defaults.
