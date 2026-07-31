# Template — Patterson Storefront (Dental & Veterinary)

An interactive recreation of the **Patterson e-commerce storefront**, captured from
[pattersondental.com](https://www.pattersondental.com) and
[pattersonvet.com](https://www.pattersonvet.com). Both sites run on the **same Patterson
pattern library (v5.7.2)** — the same header/search/nav/footer shell — so this kit models
that shared shell once and switches brand content with the toggle (bottom-right).

## Run it
Open `index.html`. Use the **Dental / Veterinary** toggle to switch brands; the header logo
sub-label, utility links, category nav + flyouts, hero, catalog, manufacturers and footer
legal all swap. Click **Add to cart**, quick-links or the cart icon to see the cart count +
toast update.

## Composition
- `brands.js` — brand config (labels, nav, flyout categories, hero copy, products, legal) for `dental` and `vet`.
- `StoreHeader.jsx` — navy utility bar + white main bar (real Patterson mark, Algolia-style search, Sign In, cart) + category nav with hover flyout.
- `StoreHome.jsx` — hero, "where to start" quick links, service banner, new & featured products, featured manufacturers, Advantage Rewards, testimonial, create-account CTA.
- `StoreFooter.jsx` — multi-column links, HQ, legal.
- `icons.jsx` — Lucide-style inline icons.
- Components from `window.PattersonCompaniesDesignSystem_3534f9`: **Button, Card, Badge**.

## Fidelity notes
- **Font:** the real sites render in **proxima-nova** (Adobe Fonts). This kit uses the system
  `--font-sans` stack (`proxima-nova → Figtree fallback`).
- **Confirmed values from capture:** body color `#58585B`, logo/heading navy `#003767`,
  search via Algolia InstantSearch, BEM classes (`o-page-wrapper`, `header__nav`, `has--flyout`).
- Product and manufacturer **imagery** is shown as placeholder panels — drop in real
  Patterson product photography to finish.
- Catalog content (products, categories, testimonials) is representative of the captured
  pages; exact live inventory will differ.
