---
name: patterson-design
description: Use this skill to generate well-branded interfaces and assets for Patterson Companies (oral & animal health distribution), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, components, and ready-to-copy templates for prototyping.
user-invocable: true
---

Read [`readme.md`](readme.md) within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick reference
- **Brand:** Patterson Companies, Inc. — "Trusted Expertise. Unrivaled Support." Since 1877.
- **Colors:** Navy `#003767`, Sky `#00A8E1`, cool grays. Secondary blues; tertiary green/teal/purple for data only.
- **Type:** Proxima Nova — the licensed kit is bundled and self-hosted ([`assets/fonts/`](assets/fonts)). **Only 400 and 700 are real faces**; 500/600/800 render as faux bold. Navy headlines at *every* level, cool-gray body, big sky stats, **no letter-spacing anywhere**.
- **Shape:** small radii — **5px buttons, 2px fields**, 10px cards. Patterson is **not** a pill brand.
- **Buttons:** primary navy `#003767` → hover **lighter navy `#315D83`** (not sky). Secondary is a **filled light blue `#6DCFF6`** with a navy label. Fields use the warm taupe `#AFA593` border.
- **Icons:** the official 93-glyph [`patterson-icons`](tokens/icons.css) font — `<i class="pat-i pat-i-cart">` or `<Icon name="cart" />`. No Lucide, no emoji.
- **Never:** gradients, textures, glass/blur. The wave watermark is the only decorative mark.
- **Read [`DESIGN.md`](DESIGN.md) first** — it tags every rule [V]erified / [S]ystem / [C]orrected against the live theme.
- **Tokens:** link [`styles.css`](styles.css). **Components:** `window.PattersonCompaniesDesignSystem_3534f9`.
- **Framework support:** the same brand ships for **Theme UI, Tailwind v4, UnoCSS and shadcn/ui** — see [`integrations/`](integrations) (generated from [`theme.json`](theme.json)). Pick the adapter matching the consuming stack; all render identical Patterson navy & sky.
- **Site:** [`site/`](site) — [landing](site/index.html), [docs](site/docs.html), [demos](site/demos.html), [kitchen sink](site/kitchen-sink.html) (every component in every state).
- **Files:** [`DESIGN.md`](DESIGN.md) (verified spec — read first), [`readme.md`](readme.md) (full guide), [`theme.json`](theme.json) (canonical machine-readable theme), [`tokens/`](tokens), [`components/`](components), [`guidelines/`](guidelines) (specimens), [`integrations/`](integrations) (framework adapters), [`assets/`](assets).
- **Templates:** everything you copy to start lives in [`templates/`](templates) — product surfaces ([corporate-website](templates/corporate-website), [storefront](templates/storefront) Dental+Vet, [docs-site](templates/docs-site)) and shells ([canvas](templates/canvas) — tweakable, [deck](templates/deck), [executive-deck](templates/executive-deck), [purpose-vision-values](templates/purpose-vision-values), [corporate-page](templates/corporate-page), [patterson-docs](templates/patterson-docs), [file-manager](templates/file-manager)).
