# Brand tokens

The Patterson design system is token-first. You reference semantic variables, never
raw hex values. This starter maps those tokens onto VitePress's theme, so the docs
render on brand automatically.

## Core palette

| Token | Value | Use |
|---|---|---|
| `--pat-navy` | `#003767` | Primary. Chrome, strong text, primary buttons |
| `--pat-sky` | `#00A8E1` | Accent on dark, focus ring, hairlines |
| `--pat-blue` | `#147EC2` | Secondary blue (PMS 7683) |
| `--pat-digital-link` | `#147CBD` | Links on a light canvas |
| `--pat-blue-light` | `#6DCFF6` | Accent text on a dark canvas |
| `--pat-gray` | `#58585B` | Body copy |
| `--pat-ink` | `#1D1D20` | Neutral ink |

The full ramp, including the navy and sky tints, the neutral cool grays, and the
tertiary green, teal, and purple set reserved for data graphics, lives in the
`patterson-brand` plugin under `ds/tokens/`. Copy those files in when you need the
complete palette in content.

## The accent policy

Sky is the brand's most recognizable color and the easiest one to misuse. White text
on sky fails WCAG contrast, and sky text on white fails it too. The rule this starter
enforces:

- On a **light** canvas, navy carries strong text and link blue carries links. Sky
  appears only as non-text chrome, such as the nav hairline and the focus ring.
- On a **dark** canvas, sky and light blue carry the accent, text included.

That is why `--vp-c-brand-1`, which VitePress uses for link text, is link blue on light
and light blue on dark, while `--vp-c-brand-3`, the solid button fill, is navy on light
and sky on dark.

## Type

Proxima Nova is the brand face, with Arial as the sanctioned substitute and a system
stack beneath it. It is served by Adobe Fonts kit `uth1qfm` and is never self-hosted.
Weights run 400 for body, 600 for subheads, 700 for calls to action, and 800 for
headlines.

## Shape and interaction

- **Buttons** carry a 5px radius, a 46px control height, semibold weight, and a flat
  fill. Primary hover on light is a lighter navy `#315D83`, never sky. Primary hover on
  dark is `#33B9E7`. VitePress's own default is a 20px pill at 40px tall, so the
  stylesheet overrides both.
- **Feature cards, callouts, and code blocks** use the same 5px radius. The Patterson
  docs UI kit ships a 9px radius as a kit convention; the brand value is 5px, and this
  template uses the brand value.
- **Form fields** use a tighter 2px radius.
- **Focus** is a 2px sky ring, offset 2px, on every interactive element, backed by a
  navy ring. Sky on white is 2.73:1 and misses the 3:1 a focus indicator needs; the
  navy backing carries the contrast so the ring can stay visibly sky. See
  [Theming](/guides/theming) for the rule.
- **Motion** is restrained: 100 to 200ms, ease-in-out, on color and transform only.
- **No gradients.** The hero name is a flat navy, not VitePress's default gradient.

## Voice

Confident, warm, plain-spoken. "We" for Patterson, "you" for the customer. Short
declarative sentences and numbers as proof points. Sentence case everywhere, with no
uppercase transforms. Never use emoji. This is a business-to-business healthcare
distribution brand.
