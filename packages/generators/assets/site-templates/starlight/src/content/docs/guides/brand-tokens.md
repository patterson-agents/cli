---
title: Brand tokens
description: The Patterson color, type, and shape tokens this starter is built on.
---

The Patterson design system is token-first. You reference semantic variables, never
raw hex values. This starter maps those tokens onto Starlight's theme, so the docs
render on brand automatically.

## Core palette

| Token | Value | Use |
|---|---|---|
| `--pat-navy` | `#003767` | Primary. Chrome, strong text, primary buttons |
| `--pat-sky` | `#00A8E1` | Accent on dark, focus ring, hairlines |
| `--pat-blue` | `#147EC2` | Links on a light canvas |
| `--pat-blue-light` | `#6DCFF6` | Secondary button fill |
| `--pat-gray` | `#58585B` | Body copy |
| `--pat-ink` | `#1D1D20` | Headings on light |

The full ramp, including the navy and sky tints, the neutral cool grays, and the
tertiary green, teal, and purple set reserved for data graphics, lives in the
`patterson-brand` plugin under `ds/tokens/`. Copy those files in when you need the
complete palette in content.

## The accent policy

Sky is the brand's most recognizable color and the easiest one to misuse. White text
on sky fails WCAG contrast, and sky text on white fails it too. The rule this starter
enforces:

- On a **light** canvas, navy carries strong text and link blue carries links. Sky
  appears only as non-text chrome, such as the header hairline and the focus ring.
- On a **dark** canvas, sky and its lighter tints carry the accent, including text.

## Type

Proxima Nova is the brand face, with Arial as the sanctioned substitute and a system
stack beneath it. It is served by Adobe Fonts kit `uth1qfm` and is never self-hosted.
Weights run 400 for body, 600 for subheads, 700 for calls to action, and 800 for
headlines.

## Shape and interaction

- **Buttons** carry a 5px radius, semibold weight, and a flat fill. Primary hover on
  light is a lighter navy `#315D83`, never sky. Primary hover on dark is `#33B9E7`.
- **Cards, callouts, and code frames** use the same 5px radius.
- **Form fields** use a tighter 2px radius.
- **Focus** is a 2px sky ring, offset 2px, on every interactive element.
- **Motion** is restrained: 100 to 200ms, ease-in-out, on color and transform only.

## Voice

Confident, warm, plain-spoken. "We" for Patterson, "you" for the customer. Short
declarative sentences and numbers as proof points. Sentence case everywhere, with no
uppercase transforms. Never use emoji. This is a business-to-business healthcare
distribution brand.
