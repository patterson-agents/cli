# Patterson Companies — Design System

A brand-accurate design system for **Patterson Companies, Inc.** — an international distributor of products, technologies, services and business solutions for the **oral health (dental)** and **animal health (veterinary & production)** industries. Founded **1877**, headquartered in Saint Paul, MN.

> **Brand promise:** *Trusted Expertise. Unrivaled Support.*
> **Purpose:** *We strengthen the people who keep us and our animals healthy.*

This project is the design-system source. An automated compiler reads it, bundles the React components into a runtime library (`_ds_bundle.js`), and indexes the tokens. Consuming projects link a single file — [`styles.css`](styles.css) — and read components from `window.PattersonCompaniesDesignSystem_3534f9`.

**At a glance:** Navy `#003767` + Sky `#00A8E1` on generous white. Proxima Nova (licensed kit bundled; Figtree fallback). Small radii — 5px buttons, 2px fields. Navy headings, no letter-spacing. The official 93-glyph Patterson icon font. Clean, corporate, calm — never flashy.

> **Start at the [site](site/index.html)** — [landing](site/index.html) · [docs](site/docs.html) · [demos](site/demos.html) · [kitchen sink](site/kitchen-sink.html).
>
> **Read [`DESIGN.md`](DESIGN.md) before building.** It is the verified spec: every rule tagged **[V]** production-verified, **[S]** system convention, or **[C]** corrected, with a delta table against the live theme. Several intuitive-seeming rules are wrong — Patterson is not a pill brand, primary buttons do not hover to sky, and only two font weights are real.

---

## 1 · Starting points — templates

Everything you copy to start something lives in **[`templates/`](templates)** — one directory, eleven entries. Each is a self-contained folder: open its `index.html` (or `.dc.html`), replace the content, ship. They fall into two kinds.

### Product surfaces

Interactive recreations of real Patterson properties. Use them as the starting shell for work on that surface, and as reference for layout, density and interaction patterns.

| Template | Surface |
| --- | --- |
| [`corporate-website/`](templates/corporate-website) | pattersoncompanies.com — navy hero, We-Are-Patterson stats, capability tabs, newsroom, footer. |
| [`storefront/`](templates/storefront) | Patterson e-commerce storefront (pattern library v5.7.2), switchable **Dental** ↔ **Veterinary**: utility bar, search, category nav + flyouts, hero, featured products, manufacturers, Advantage Rewards, footer. |
| [`docs-site/`](templates/docs-site) | VitePress-style documentation site — top nav, Diátaxis sidebar, article body with callouts, prev/next pager. |

### Document & app shells

| Template | What it is |
| --- | --- |
| [`purpose-vision-values/`](templates/purpose-vision-values) — **Purpose, Vision & Values Deck** | The corporate PVV deck, reversed from the official PowerPoint: cover panel, stair-step definitions, performance chart, navy section dividers, the four-colour values panels, the inverted-pyramid model, statement lockups and the word-cloud closer. |
| [`deck/`](templates/deck) — **Presentation Deck** | 16:9 company-overview deck (cover, section divider, stats, comparison, quote, capabilities table, full-bleed photo band, closing) on the PowerPoint master. |
| [`executive-deck/`](templates/executive-deck) — **Executive Deck** | Executive-briefing deck (navy cover, key takeaways, breakdown matrix, requirements, build outputs, benefits) on the PowerPoint master, with speaker notes. |
| [`canvas/`](templates/canvas) — **Canvas** | Corporate page wired to three expressive tweaks — **Hero surface** reskins the page (navy / paper / soft blue), **Density** retunes the whole type-and-space rhythm, **Proof** swaps the stats band for a statement band. The one template to open if you want to feel the system move. |
| [`corporate-page/`](templates/corporate-page) — **Corporate Page** | Generic brand page shell — sticky nav, navy hero, content band, footer. |
| [`patterson-docs/`](templates/patterson-docs) — **Patterson Docs** | Documentation shell as a Design Component, with light/dark theme, accent and width tweaks. |
| [`file-manager/`](templates/file-manager) — **Skill Studio** | Branded file-manager / studio app shell: sidebar tree, tabbed panels, toolbar. |

## 2 · The brand — foundations & components

Everything visual: color, type, spacing, shape, motion, voice, and the React primitives that encode them. Foundation specimen cards live in `guidelines/` and render in the Design System tab.

### Color

Navy `#003767` and Sky `#00A8E1` are the brand. Cool grays carry text and structure. A secondary blue set adds depth; a tertiary green/teal/purple set is reserved for infographics, data and presentations.

- **Vibe:** cool, clean, clinical-but-human. Navy + sky read as health, trust, intelligence and communication.
- **Backgrounds:** predominantly **white** (content) and **navy** (hero / emphasis bands). Light gray (`#ECECEC` / gray-50) for subtle section separation. No heavy gradients, textures or patterns.
- **Tertiary colors** appear only in charts/infographics — never as page chrome.
- **Official PPTX theme palette** (confirms the set): accent1 `#003767` navy · accent2 `#00A8E1` sky · accent3 `#147EC2` · accent4 `#7BC24D` · accent5 `#00817D` · accent6 `#522E91` · dk2 `#58585B` · lt2 `#ECECEC`.

Tokens: [`tokens/colors.css`](tokens/colors.css). Specimens in [`guidelines/`](guidelines): primary, secondary, tertiary, tints, neutral, semantic.

### Slide layouts

All three deck templates share **`assets/deck/patterson-slides.css`** — the corporate PowerPoint master reversed onto a 1920 × 1080 canvas (13.333in × 7.5in, so 1in = 144px and 1pt = 2px). Specimen card: **Presentation → Slide Layouts**.

| Class | Layout | Use |
| --- | --- | --- |
| `.lay-cover` | Custom Layout | Cover only — white copy column (27.65%) + navy icon-collage panel with the sky logo flag. |
| `.lay-bar` | Title and Content | The workhorse. Navy icon rail (15.3%) with the Patterson mark; content sits in `.well` (padding-left 383px). |
| `.lay-navy` | Blue Slide + PPV | Full-bleed navy, icon pattern bleeding off the left edge. Section dividers; sky `.peyebrow` top-right. |
| `.lay-wave-navy` | 2_Title Only | Navy wave field — quotes, statements, closers. |
| `.lay-wave-light` | Hands only | White wave field — the `.pkicker` + `.lockup` statement pattern. |
| `.lay-plain` | Blue Bar Blank | Plain white, for edge-to-edge colour fields (e.g. the four `.value-col` panels). |

Type, verbatim from `slideMaster1`: title **48pt bold uppercase** secondary blue `#147EC2` (`.ptitle`) · body **18pt bold** navy (`.pbody`) · statement 24pt (`.plead`) · section word 72pt white (`.pnumeral`) · footer **7pt** gray right-aligned (`.pfoot`, "©YEAR Patterson Companies | pattersoncompanies.com | #"). Shapes are **flat rectangles — no rounded corners** on slides.

Values panel colours (from the deck's own artwork): Passionate `#41B8DA` · Focused `#7BC24D` · People-First `#522E91` · Always Advancing `#147EC2`.

### Type

**Proxima Nova** across display and text (`proxima-nova, Arial, sans-serif`); **Figtree** is the loaded free fallback; **Arial** is the PowerPoint-safe substitute.

- **Every heading level is navy** — never gray, never near-black. Production drops weight hard: **800 at h1/h2, then 400 from h3 down**, with **no letter-spacing anywhere**.
- Only **400 and 700 are licensed faces** (kit `rul6mjk`). 500 / 600 / 800 render as browser-synthesized faux bold. 700 is the real bold ceiling.
- Production body is **18px / 24px (1.33)**; this system's `--fs-body` runs 16px at 1.6. Add `class="pat-production"` to render the exact live scale.
- Sky-blue for emphasis words, links and big stats. Big sky numbers (`Stat`) are a signature device.
- **Eyebrows are navy, 14px, weight 500, sentence case** (`.pat-eyebrow`) — "Trusted expertise" and "Unrivaled support" are used verbatim as section eyebrows on the live sites. `.pat-eyebrow--accent` keeps the uppercase-sky treatment as a system option.
- **Casing:** sentence case for body and most headings; Title Case for the brand promise and product brands; eyebrows/overlines UPPERCASE and letter-spaced.

Tokens: [`tokens/typography.css`](tokens/typography.css) (system `--fs-*` scale **and** the production `--pt-*` scale), [`tokens/fonts.css`](tokens/fonts.css). Specimens: family, display, body, weights, production scale, eyebrow/stat.

### Spacing & layout

- **4px base unit.** Roomy section rhythm (64–128px vertical).
- Centered max-width container ≈**1240px**; readable text measure ≈**720px**.
- Generous, uncramped — white space is part of the brand.

Tokens: [`tokens/spacing.css`](tokens/spacing.css).

### Shape, depth & motion

- **Corners:** production is restrained — **`--radius-btn` 5px** buttons, **`--radius-btn-elevated` 6px** download/external buttons, **`--radius-field` 2px** inputs. Cards 10px. **There is no pill radius in production**; `--radius-pill` is a system convention, used knowingly.
- **Cards:** white surface, 1px `--border-subtle` hairline, soft navy-tinted `--shadow-sm`, 10px radius. Optional 4px top accent stripe. Interactive cards lift 3px to `--shadow-lg` on hover.
- **Shadows:** soft and low-contrast. This system tints them **navy** `rgba(0,55,103,…)` across five steps xs→xl; production instead uses neutral black at 4–12% alpha (`--download-shadow`). Either reads correctly — keep alpha very low.
- **Borders:** 1px hairlines for structure (`--border-subtle` / `--border-default`); 2px for emphasis and button outlines. Sky for focus/active.
- **Focus:** visible 3px **sky** ring (`--ring-focus`) — accessibility-first, and a system addition: production ships no branded focus style.
- **Motion:** 120–320ms, standard ease `cubic-bezier(0.2,0,0.2,1)`, `--ease-out` for entrances. Fades and short slides — no bounces, no infinite loops, no decorative animation.
- **Transparency / blur:** sparing. Navy scrims ≈55% over imagery; optional panel blur on sticky headers. Not a glassmorphism brand.
- **Imagery:** warm, authentic, natural-light photography of practitioners, animals and operations. Navy duotone/scrim only when text must sit over an image.

Tokens: [`tokens/effects.css`](tokens/effects.css), [`tokens/base.css`](tokens/base.css).

### Components

React primitives, read via `window.PattersonCompaniesDesignSystem_3534f9`:

- **[`components/core/`](components/core)** — Button, IconButton, Badge, Stat, Card, **Icon**
- **[`components/forms/`](components/forms)** — Input, Select, Checkbox, Radio, Switch
- **[`components/feedback/`](components/feedback)** — Alert, Tabs

Interaction contract they all follow:

- **Buttons** are 5px, 15px/30px padding, 15px/600 label (≈50px tall). **Primary** = solid navy `#003767` hovering to a **lighter navy `#315D83`** — it does *not* turn sky. **Secondary** = a **filled light blue `#6DCFF6`** with a navy label, hovering to `#96DBF6` — not an outline. Disabled: `#93A9BC` / `#DAEDF5`. Pass `pill` to opt into the system's rounder shape.
- **Fields** are 2px radius with a **warm taupe `#AFA593`** border — the one non-cool gray in the brand, and deliberate.
- **Hover:** the navy-family shift above, a soft `--pat-navy-10` wash on ghost controls, card lift. Links go navy on hover.
- **Motion:** production is 100–200ms with plain easings, on `background-color`, `border-color`, `color`, `transform` and `height` only.

### Iconography

**The official Patterson icon font is bundled** — [`tokens/icons.css`](tokens/icons.css) registers `patterson-icons`, the real set lifted from the production storefront pattern library: **93 glyphs**, private-use codepoints from `U+E900`. This replaces Lucide.

```html
<i class="pat-i pat-i-cart" aria-hidden="true"></i>
```
```jsx
<Icon name="chevron-right" size="sm" />
```

- It is a **font**, so glyphs inherit `color` and scale with `font-size` — there is no stroke to set. Production renders inline glyphs at **14px** (`--icon-size-sm`).
- Coverage: navigation (arrows, chevrons in regular + `_light`), commerce (`cart`, `tag-price`, `promotion`, `previouslypurchased`), dental/vet specifics (`pedigree`, `prescription`, `formulary-list`, `hazmat`, `shiponice`), documents (`pdf`, `excel`), account/UI (`user`, `gear`, `filter`, `toggle-gridview`), full social set.
- Always pair a glyph with a text label or `aria-label` — PUA codepoints read as nothing to a screen reader.
- **Spot illustrations** are a separate tier: navy-and-sky **two-tone** line art at 64–120px ([`assets/brand/`](assets/brand)), used to head a card or capability block. Not in the font.
- **No emoji, no unicode glyphs** — off-brand for a clinical B2B company, without exception.

### Voice & content

- **Tone:** confident, warm, professional, plain-spoken. "Bold solutions and a personal touch." Expertise and reliability without jargon or hype.
- **Person:** **"we"** for Patterson, **"you / your"** for the customer. Partnership-framed.
- **Sentence style:** short, declarative, active. Confident statements, not questions.
- **Signature constructions:** three-beat cadence (*"Passionate. Focused. People-first. Always advancing."*); noun pairs (*"Trusted Expertise. Unrivaled Support."*); proof through numbers.
- **Numbers as proof:** *"86,000,000 U.S. households have pets," "98% of customers reached in 1-to-2-day shipping," "60 fulfillment centers," "since 1877."* Render big numbers prominently with `Stat`.
- **Vocabulary:** strengthen, support, partner, expertise, solutions, essentials, practices, operations, communities, health/healthy. No trendy slang. **No emoji, ever.**
- **Verbatim examples:** *"We strengthen the people who keep us and our animals healthy with bold solutions and a personal touch." · "Generations of quality customer service define our business operations and our personal interactions." · "We are much more than a distributor – we are an indispensable partner."*

---

## 3 · Framework integrations

The brand is **framework-agnostic**. Beyond the CSS tokens and React components, the palette, type, radii, elevation and component recipes are packaged for the major styling stacks — all generated from one source of truth, **[`theme.json`](theme.json)** (a [Theme UI spec](https://theme-ui.com/theme-spec)-shaped record mirroring `tokens/*.css`).

| File | Stack |
| --- | --- |
| [`theme.json`](theme.json) | Canonical machine-readable theme (colors, scales, and `buttons` / `text` / `cards` / `badges` / `forms` / `links` variants). Edit it and `tokens/*.css` together. |
| [`integrations/theme-ui.js`](integrations/theme-ui.js) | Theme UI theme (`import theme from …`), variants included. |
| [`integrations/tailwind.css`](integrations/tailwind.css) | Tailwind **v4** CSS-first `@theme` (`bg-navy`, `text-sky`, `rounded-lg`, `shadow-md`, `font-display`…). Spacing stays at Tailwind's 0.25rem unit — already the brand's 4px grid. |
| [`integrations/tailwind.config.js`](integrations/tailwind.config.js) | Same scale as a Tailwind **v3** / JS preset. |
| [`integrations/uno.config.js`](integrations/uno.config.js) | **UnoCSS** theme + brand shortcuts (`btn-primary`, `pat-card`, `stat`, `eyebrow`, `input`). |
| [`integrations/shadcn-theme.css`](integrations/shadcn-theme.css) | **shadcn/ui** semantic CSS-variable contract mapped to the brand (paper-white light mode + navy-ground `.dark`), Tailwind-v4 `@theme inline`. |
| [`integrations/README.md`](integrations/README.md) | Copy-paste wiring for each stack. |

Colors in every adapter are the exact brand hexes, not re-derived, so nothing drifts off-brand.

---

## 4 · File map

Every directory below has its own README, so browsing the repo on GitHub explains itself.

**Entry points**

- [`site/`](site) — the design system's own landing page, docs, demo gallery and kitchen sink
- [`styles.css`](styles.css) — the single file consumers link (imports only)
- [`theme.json`](theme.json) — canonical machine-readable theme; source for the adapters
- [`DESIGN.md`](DESIGN.md) — verified spec: tagged rules + production delta table
- [`readme.md`](readme.md) — this guide
- [`SKILL.md`](SKILL.md) — Agent-Skill front-matter for downloadable use
- [`thumbnail.html`](thumbnail.html) — project tile

**Directories**

| Directory | Contains |
| --- | --- |
| [`site/`](site) | [landing](site/index.html) · [docs](site/docs.html) · [demos](site/demos.html) · [kitchen sink](site/kitchen-sink.html) |
| [`tokens/`](tokens) | fonts · icons · colors · typography · spacing · effects · base |
| [`components/`](components) | [core/](components/core) · [forms/](components/forms) · [feedback/](components/feedback) |
| [`guidelines/`](guidelines) | foundation specimen cards (color, type, spacing, brand) |
| [`templates/`](templates) | every starting point — [corporate-website](templates/corporate-website) · [storefront](templates/storefront) · [docs-site](templates/docs-site) · [purpose-vision-values](templates/purpose-vision-values) · [deck](templates/deck) · [executive-deck](templates/executive-deck) · [canvas](templates/canvas) · [corporate-page](templates/corporate-page) · [patterson-docs](templates/patterson-docs) · [file-manager](templates/file-manager) |
| [`integrations/`](integrations) | [theme-ui](integrations/theme-ui.js) · tailwind ([v4](integrations/tailwind.css) / [v3](integrations/tailwind.config.js)) · [uno](integrations/uno.config.js) · [shadcn](integrations/shadcn-theme.css) |
| [`assets/brand/`](assets/brand) | logo lockups, Veterinary favicons, wave watermark, photography |
| [`assets/fonts/`](assets/fonts) | Proxima Nova 400/700/italic, patterson-icons, the official Typekit kit |


---

## 5 · Sources & open items

Recorded for provenance; the reader is not assumed to have access.

| Source | Detail |
| --- | --- |
| **GitHub — [Patterson-Agents/patterson-design-plugins](https://github.com/Patterson-Agents/patterson-design-plugins)** | The Patterson brand packaged as a Claude Code plugin marketplace. `plugins/patterson-brand/ds/` mirrors this design system; other plugins wrap the templates and UI kits. **Upstream source of truth for the plugin distribution.** |
| **Patterson Companies Brand Guide 2025** (PDF) | In `design-system/` (mounted, read-only). >30 MB — not copyable into the project; the **color palette page** was provided separately as an image and is the basis of the color tokens (`assets/brand/color-palette.png`). |
| **pattersoncompanies.com** | Corporate website — voice, messaging, navigation, statistics; source of the corporate-website template. |
| **pattersondental.com** / **pattersonvet.com** (captures) | Storefronts on the shared Patterson **pattern library v5.7.2** shell; source of the storefront template and its brand toggle. |
| **Typekit kit `rul6mjk`** (official) | `assets/fonts/typekit-rul6mjk.css` — the verbatim Adobe Fonts kit CSS, published 2024-08-01. Serves **four faces only**: 400, 400i, 700, 700i. Confirms Proxima Nova licensing and that heavier weights on the live sites are faux bold. |
| **`icons.woff` / `.ttf` / `.svg`** (official) | The production Patterson icon font — **93 glyphs**, 1024 upm, PUA `U+E900`+. Bundled as `tokens/icons.css` + the `Icon` component; retires Lucide. |
| **`theme-styles.min.css`** (production WordPress theme) | The live corporate stylesheet. Source of the verified palette, interaction states, type scale, radii and motion in `DESIGN.md`. |
| **Patterson Veterinary favicons** | `manifest.json` name `PVcom`; square navy lockup 16→192px + `safari-pinned-tab.svg`. In `assets/brand/`. |
| **Patterson logo** | `assets/brand/patterson-logo-*.svg` — official lockup (wave mark + PATTERSON wordmark), recolored into white / navy / sky / square variants. |
| **PDCO_template.potx** (official PowerPoint template) | "Patterson Companies PDCO Slide Master." Confirms the exact theme palette and **Arial** as the PowerPoint-safe font; source of the deck archetypes and of `wave-bg-navy.png`, `photo-markets.png`, `value-prop.png`. |
| Confirmed from capture | Font `proxima-nova, Arial, sans-serif`; body `#58585B`; navy `#003767`; Algolia InstantSearch; BEM classes (`o-page-wrapper`, `header__nav`, `has--flyout`). |

### ⚠️ Open items

1. **Brand-specific horizontal lockups.** The corporate lockup is bundled and wired everywhere. The **Patterson Dental** / **Patterson Veterinary** horizontal lockups (`logo-dental.svg`, `logo-vet.svg`) live on a CORS-restricted CDN and could not be fetched — *upload those two SVGs if you want the exact brand lockups.*
2. **Font weights, not licensing.** Licensing is settled — the official kit is bundled and the faces are self-hosted. But the kit has **no 500, 600 or 800 face**, so the production theme's `font-weight: 800` headings render as browser-synthesized faux bold. *Add Proxima Nova variations to kit `rul6mjk` if genuine heavier weights are wanted.*
3. **Brand guide PDF** was not machine-readable (imagery direction, logo clear-space, co-brand rules) — the foundations above are inferred from the websites, the palette page and the official PPTX.
4. **Spot illustrations.** The UI-glyph tier is solved by the official font. The navy/sky **two-tone spot illustrations** remain loose PNGs with no documented library — and the font has no dental tooth glyph (only `tooth.png`).
5. **Storefront stylesheet.** Only the corporate theme was inspected. The storefront pattern library (v5.7.2) ships its own CSS that was not supplied, so storefront radii, densities and control heights may differ from both this system and the corporate theme.

*Direction note:* Nocturne and Broadsheet informed the **structure** here — a machine-readable `theme.json` and cross-consumer portability — not their visual signatures, which would contradict the Patterson brand and were deliberately not imported.

---

*Namespace for components in `@dsCard` HTML:* `window.PattersonCompaniesDesignSystem_3534f9`
