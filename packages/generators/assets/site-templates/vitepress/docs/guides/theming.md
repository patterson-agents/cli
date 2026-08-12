# Theming

All Patterson branding is applied in one stylesheet,
`docs/.vitepress/theme/custom.css`, imported by `docs/.vitepress/theme/index.ts`. That
file extends VitePress's default theme rather than forking it, so the branding survives
VitePress upgrades.

```ts
// docs/.vitepress/theme/index.ts
import DefaultTheme from 'vitepress/theme';
import './custom.css';

export default { extends: DefaultTheme };
```

## How it works

VitePress is themed through CSS custom properties. Light values live on `:root` and
dark values on `.dark`. The Patterson stylesheet overrides five groups.

1. **Surfaces.** `--vp-c-bg`, `-bg-alt`, `-bg-soft`, `-bg-elv`.
2. **Text.** `--vp-c-text-1` through `-3`. Headings are navy on light, body is
   Patterson gray.
3. **Brand tiers.** `--vp-c-brand-1` is accent and link *text*, `-2` is the hover
   state, `-3` is the solid fill behind reversed text, and `-soft` is the tinted
   background. Because `-1` is text and `-3` is a fill, they take different colors
   under the accent policy.
4. **Buttons.** `--vp-button-brand-*` for background, text, border, and their hover
   and active states.
5. **Chrome and shape.** The navy nav bar with its sky hairline, the sky focus ring,
   and the 5px radius applied by selector where VitePress hard-codes a value.

## Why some rules are written `#app .VPThing`

This is the one thing worth understanding before you edit the stylesheet, because
getting it wrong fails silently — the rule is simply ignored, with no error anywhere.

VitePress's default theme is built from Vue single-file components using
`<style scoped>`. Vue compiles those rules with a data attribute, so what ships is:

```css
/* what VitePress actually ships */
.VPButton.medium[data-v-b1f4a5c9] { border-radius: 20px; }
```

That attribute adds a level of specificity. A plain `.VPButton { border-radius: 5px }`
is *less* specific and loses, so the button keeps its 20px pill and the override looks
like it did nothing. The stylesheet handles this two ways.

**Prefer a custom property.** Where VitePress reads a value from a variable, set the
variable. Custom properties resolve by inheritance, so there is no specificity contest
at all — and you can scope them to a subtree. That is how the nav bar is themed: the
bar is navy in both themes, so the theme variables are re-pointed inside it.

```css
.VPNavBar {
  --vp-c-text-1: #fff;                    /* nav links, search placeholder, title */
  --vp-c-brand-1: var(--pat-blue-light);  /* the active nav link */
  --vp-c-bg-elv: var(--pat-navy);         /* any flyout menu panel */
}
```

Without this, `.VPNavBarMenuLink` keeps its default `color: var(--vp-c-text-1)` — navy
on the light theme, painted onto the navy bar, invisible.

**Anchor on `#app` only when the value is hard-coded.** Radii and the control height
are literals inside scoped rules, so those overrides are prefixed with `#app`, the
VitePress mount node. An id outranks any scoped rule, and it keeps `!important` out of
the file.

```css
#app .VPButton { border-radius: var(--pat-radius); }   /* 5px, not the 20px pill */
#app .VPFeature { border-radius: var(--pat-radius); }  /* 5px, not 12px */
```

One exception: the local search box is teleported to `body`, *outside* `#app`, so its
rules are written without the prefix.

## Units, and the root font size caveat

Every length in `custom.css` is written in `rem`, as tokens, so shape tracks the root
font size instead of a fixed device pixel count. The brand guide states its values in
px, so each token carries the px it resolves to at a 16px root:

```css
--pat-radius:       0.3125rem;  /* 5px  */
--pat-hairline:     0.0625rem;  /* 1px  */
--pat-control-line: 2.75rem;    /* 44px, inside a hairline border = 46px */
```

One caveat matters more than the rest of this section, and it is not ours to fix from
here. VitePress's own `base.css` pins the root:

```css
:root {
  /* FIXME: pins rem-sized bits while the theme is px-based - remove when
     moving to relative units (#570) */
  font-size: 16px;
}
```

While that line stands, a `rem` in this file is exactly `px / 16` in every case, and a
reader who raises their browser's default font size gets 16px anyway. Page **zoom**
still works — it scales px too — but the *text-size* preference does not reach the
theme, which is the specific thing relative units exist to honor.

The one-line override is:

```css
/* in custom.css, if you want the root to follow the user's preference */
:root { font-size: 100%; }
```

Take it as a deliberate change, not a default. The upstream theme is still px-based by
its own admission, so unpinning makes rem-sized and px-sized parts scale at different
rates. Check the nav, sidebar, and buttons at a 20px root before shipping it, and
follow VitePress issue #570 for the upstream move to relative units.

## Motion and contrast are partly upstream

Two accessibility behaviors are already handled by the default theme, so this file does
not duplicate them:

- **Reduced motion.** `base.css` carries a global
  `@media (prefers-reduced-motion: reduce)` block that forces `transition-duration: 0s`
  and near-zero animation durations. The Patterson transitions inherit that, so
  `--pat-transition` needs no separate guard.
- **Color scheme.** `base.css` sets `color-scheme: dark` / `light` alongside the theme
  class, so scrollbars and UA-rendered form controls follow the theme.

What this file does own is the contrast of the chrome it introduces, and two places
needed work to meet the 3:1 that WCAG 1.4.11 asks of a UI component boundary or state
indicator.

**Control boundaries on the navy bar.** The search field and the appearance toggle are
light controls on a dark surface, so `--pat-chrome-boundary` is white at `0.4` alpha
(3.19:1) rather than a softer `0.25` (2.08:1, a fail).

**The focus ring is two-tone.** Sky is the brand's signature focus color, but `#00A8E1`
on white measures 2.73:1 — under the bar. It passes on the navy chrome (4.41:1) and on
the dark canvas (6.51:1); white is the problem, and white is where most content sits.
Rather than drop sky, the ring is backed with navy:

```css
:focus-visible {
  outline: var(--pat-focus-width) solid var(--pat-sky);
  outline-offset: var(--pat-focus-offset);
  box-shadow: 0 0 0 calc(var(--pat-focus-offset) + var(--pat-focus-width) * 2)
    var(--pat-navy);
}
```

The shadow paints navy from the border box outward and the outline paints on top, so
the result is a sky band sandwiched in navy. Sky reads against its navy neighbor, and
the indicator's outer edge is navy against the page at 12.06:1. If you restyle this,
check the ring against a white background, not just the navy bar.

## Code blocks follow the canvas

VitePress ships dual-theme Shiki. Every token carries an inline
`--shiki-light` / `--shiki-dark` pair, and the light value is used outside `.dark`.

That makes `--vp-code-block-bg` more coupled than it looks: setting a dark background
on the light theme paints dark GitHub-light tokens onto a dark field, and the syntax
colors vanish. Keep the block background on the same side as the canvas, or force the
dark token set as well as the background.

## The `--c-*` to `--vp-c-*` map

The Patterson docs UI kit in the `patterson-docs` plugin uses a `--c-*` vocabulary that
maps almost one-to-one onto VitePress.

| Docs kit | VitePress | Light | Dark |
|---|---|---|---|
| `--c-bg` | `--vp-c-bg` | `#FFFFFF` | `#15181E` |
| `--c-bg-alt` | `--vp-c-bg-alt` | `#F8F8F8` | `#1B1F27` |
| `--c-bg-soft` | `--vp-c-bg-soft` | `#F8F8F8` | `#20252E` |
| `--c-text` | `--vp-c-text-1` | `#003767` | `#F1F3F5` |
| `--c-text-2` | `--vp-c-text-2` | `#58585B` | `#B4BAC4` |
| `--c-text-3` | `--vp-c-text-3` | `#8A8A8E` | `#828A96` |
| `--c-divider` | `--vp-c-divider` | `#ECECEC` | `#262B34` |
| `--c-border` | `--vp-c-border` | `#E4E5E8` | `#2A2F39` |
| `--c-brand-3` | `--vp-c-brand-1` | `#147CBD` | `#6DCFF6` |
| `--c-brand` | `--vp-c-brand-3` | `#003767` | `#00A8E1` |
| `--c-brand-soft` | `--vp-c-brand-soft` | `rgba(0,168,225,.10)` | `rgba(0,168,225,.14)` |
| `--radius` | applied by selector | `5px` | `5px` |

The one deliberate divergence is the radius. The kit ships `9px`; the brand value is
`5px`, so this template overrides it.

## Adjusting the accent

Edit the brand tier block for the theme you want.

```css
/* light canvas */
:root {
  --vp-c-brand-1: var(--pat-digital-link); /* link text */
  --vp-c-brand-2: var(--pat-navy);         /* hover */
  --vp-c-brand-3: var(--pat-navy);         /* solid fill */
}

/* dark canvas */
.dark {
  --vp-c-brand-1: var(--pat-blue-light);
  --vp-c-brand-2: var(--pat-sky-40);
  --vp-c-brand-3: var(--pat-sky);
}
```

Keep the light `-1` tier on navy or the digital link blue. Moving sky into a text role
on white breaks contrast.

Two blues sit close together and are not interchangeable. `--pat-blue` (`#147EC2`,
PMS 7683) is the print secondary; `--pat-digital-link` (`#147CBD`) is the digital link
color. On white the first measures 4.38:1 and the second 4.52:1, so only the link blue
clears the 4.5:1 the WCAG AA body-text threshold asks for. Links use it.

## Loading Proxima Nova

The font stack is `'proxima-nova', Arial, sans-serif`, verbatim from the live Patterson
sites. The face comes from Adobe Fonts kit `uth1qfm`, loaded by the `head` entry in
`docs/.vitepress/config.ts`.

```ts
head: [
  ['link', { rel: 'stylesheet', href: 'https://use.typekit.net/uth1qfm.css' }],
],
```

Never self-host the face and never add an `@font-face` block for it. Adobe's terms do
not permit re-hosting Typekit payloads. If the kit cannot be reached from your
deployment, the stack falls back to Arial, which is the sanctioned substitute.

## Swapping the logo

Logos live in `docs/public/` and are referenced by `themeConfig.logo` and the hero
frontmatter in `docs/index.md`. Replace the white and navy lockups with your own, and
never redraw the wave mark.

The two references take different shapes on purpose. `themeConfig.logo` is a single
white lockup, not a light/dark pair, because the nav bar is navy in *both* themes — a
pair would swap in the navy lockup on the light theme and paint navy on navy. The hero
in `docs/index.md` does keep the pair: it sits on the page canvas, which does change
with the theme.

```ts
// nav bar — always navy, so always the white lockup
logo: { src: '/patterson-logo-white.svg', alt: 'Patterson Companies' },
```

White on navy, navy on white, and never the reverse.

## Adding Vue components

`docs/.vitepress/theme/index.ts` is the place. Register a component there and it is
available in every Markdown file.

```ts
import DefaultTheme from 'vitepress/theme';
import './custom.css';
import Callout from './Callout.vue';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Callout', Callout);
  },
};
```

Style any component you add with the `--pat-*` variables, never raw hex.
