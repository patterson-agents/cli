# Templates

Every starting point, in one directory. Each folder is self-contained: open its `index.html`
(or `.dc.html`), replace the content, ship. Each loads the design system through its own
`ds-base.js`, so a copied folder only needs that one file's `base` path adjusted.

## Product surfaces

Interactive recreations of real Patterson properties — the starting shell for work on that
surface, and reference for layout, density and interaction patterns.

| Template | Surface |
| --- | --- |
| [`corporate-website/`](corporate-website) | pattersoncompanies.com — navy hero, We-Are-Patterson stats, capability tabs, newsroom, footer. |
| [`storefront/`](storefront) | Patterson e-commerce shell (pattern library v5.7.2), switchable **Dental** ↔ **Veterinary**. |
| [`docs-site/`](docs-site) | VitePress-style documentation site organised by Diátaxis. |
| [`tutorialkit/`](tutorialkit) | TutorialKit lesson shell. Ships `theme.css` — all 98 `--tk-*` vars across four themes; drop that one file into any TutorialKit project to brand it. |

## Document & app shells

| Template | What it is |
| --- | --- |
| [`deck/`](deck) | 16:9 company-overview deck — cover, dividers, stats, comparison, quote, table, photo band, closing. |
| [`executive-deck/`](executive-deck) | Editorial executive briefing — takeaways, breakdown matrix, requirements, outputs, benefits. |
| [`purpose-vision-values/`](purpose-vision-values) | Faithful reversal of the corporate Purpose·Vision·Values PowerPoint. |
| [`canvas/`](canvas) | Corporate page with three **expressive tweaks** — surface, density and proof mode. Start here to feel how far the system flexes. |
| [`corporate-page/`](corporate-page) | Generic brand page shell — sticky nav, navy hero, content band, footer. |
| [`patterson-docs/`](patterson-docs) | Documentation shell as a Design Component, with theme / accent / width tweaks. |
| [`file-manager/`](file-manager) | **Skill Studio** — branded file-manager / studio app shell. |

## Copying one out

`ds-base.js` resolves the design system with a single `base` constant:

```js
const base = '../..';   // -> point at the bound _ds/<folder> in a consuming project
```

Templates are **not** compiled into `_ds_bundle.js` and their JSX is loaded directly by the
page, so anything here can call `ReactDOM.createRoot` at module scope safely.

Read [`../DESIGN.md`](../DESIGN.md) before restyling a template — it tags every brand rule
[V]erified / [S]ystem convention / [C]orrected.
