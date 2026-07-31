# Template — Patterson Companies Corporate Website

An interactive, brand-accurate recreation of **pattersoncompanies.com**, composed entirely
from this design system's tokens and components.

## Run it
Open `index.html`. The bundle (`_ds_bundle.js`) and `styles.css` are loaded from the project
root; the screens are separate Babel JSX files mounted in order.

## Screens / routes
- **Home** (`HomeScreen.jsx`) — navy hero with the brand promise, four capability pillars,
  the "We Are Patterson" stats band (86M / 90% / 250M), a tabbed capabilities section, a
  news preview and a sky CTA band.
- **What We Do** (`WhatWeDoScreen.jsx`) — page header + alternating Service / Logistics /
  Products sections.
- **Newsroom** (`NewsroomScreen.jsx`) — filterable press-release list with a featured story.
- Other nav links route to a simple placeholder (not part of the recreation).

## Composition
- `Header.jsx` — sticky product-switch bar + main nav (active state = sky underline).
- `Footer.jsx` — visit-our-sites, connect, contact, legal.
- `icons.jsx` — Lucide-style inline SVG icons (2px rounded stroke).
- Components used from `window.PattersonCompaniesDesignSystem_3534f9`: **Button, Card, Stat,
  Tabs, Badge**.

## Fidelity notes
Built from the live site's **content, navigation, messaging and statistics** (the site's
exact CSS/layout source was not available). Imagery is represented with navy/sky placeholder
panels — drop in real Patterson photography to finish. The wordmark is the system's
placeholder; replace with the official logo.
