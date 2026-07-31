# Docs Site

A VitePress-style documentation site organised by [Diátaxis](https://diataxis.fr) — top nav,
sidebar grouped into Tutorials / How-to / Reference / Explanation, article body with callouts,
and a prev/next pager.

Static recreation: [`index.html`](index.html) loads the JSX directly. Content lives in
[`data.jsx`](data.jsx), [`pages1.jsx`](pages1.jsx) and [`pages2.jsx`](pages2.jsx);
[`collections.jsx`](collections.jsx) defines the Diátaxis grouping.

For the prop-driven Design Component version, see [`../patterson-docs`](../patterson-docs).

## Editing

Add a page to `pages1.jsx` / `pages2.jsx` and register its Diátaxis category in
`data.jsx`. Body copy sits at a 720px measure — the readable-text width, not the full
container. See [`../../DESIGN.md`](../../DESIGN.md).
