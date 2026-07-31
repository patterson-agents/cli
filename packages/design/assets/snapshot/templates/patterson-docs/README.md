# Patterson Docs

Documentation shell authored as a **Design Component** —
[`PattersonDocs.dc.html`](PattersonDocs.dc.html). Unlike the other templates it exposes
tweakable props (light/dark theme, accent color, content width) that surface in the Tweaks
panel.

For a static VitePress-style docs *site* recreation, use [`../docs-site`](../docs-site).
This one is the reusable component version: scaffolded pages, prop-driven theming.

## Editing

- Template markup and logic live in the `.dc.html`; edit with the DC tools, not by hand.
- Styling is **inline only** — no stylesheets, no CSS classes.
- Page content is static markup, so it is directly click-editable in the preview.

See [`../../DESIGN.md`](../../DESIGN.md) for brand rules.
