import { defineConfig } from 'vitepress';

// Patterson-branded VitePress documentation site.
//
// Branding is applied entirely through `.vitepress/theme/custom.css`, which remaps
// VitePress's `--vp-*` custom properties onto Patterson brand tokens. The default
// theme is extended, never forked, so the branding survives VitePress upgrades.
//
// https://vitepress.dev/reference/site-config
export default defineConfig({
  // CUSTOMIZE: title, description, and the hero copy in docs/index.md.
  title: 'Patterson Docs',
  description:
    'Documentation, guides, and reference for teams building on the Patterson Companies design system.',

  // CUSTOMIZE: when deploying to a sub-path (GitHub Pages project sites), set
  // `base` to that path, e.g. base: '/my-docs/'. Leave it out at a domain root.
  // base: '/',

  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: true,
  // Light and dark are both tuned in custom.css, so keep the toggle.
  appearance: true,

  head: [
    // Proxima Nova is served by Adobe Fonts kit uth1qfm. Load it from the kit only —
    // Adobe's terms do not permit re-hosting Typekit payloads, so never commit font
    // binaries or @font-face declarations for it.
    ['link', { rel: 'stylesheet', href: 'https://use.typekit.net/uth1qfm.css' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  ],

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    // One lockup, not a light/dark pair: the nav bar is navy in both themes,
    // so the white lockup is the correct one on it in both. The navy lockup is
    // still shipped and is used by the hero in docs/index.md, which sits on
    // the page canvas. White on navy, navy on white — never the reverse.
    // `siteTitle: false` makes this the only site identity in the bar, so it
    // keeps an explicit alt.
    logo: { src: '/patterson-logo-white.svg', alt: 'Patterson Companies' },
    siteTitle: false,

    nav: [
      { text: 'Getting started', link: '/getting-started' },
      { text: 'Guides', link: '/guides/brand-tokens', activeMatch: '/guides/' },
      {
        text: 'Reference',
        link: '/reference/design-system',
        activeMatch: '/reference/',
      },
      { text: 'Patterson Companies', link: 'https://www.pattersoncompanies.com' },
    ],

    // Diataxis-flavored information architecture: a place to start, task-shaped
    // guides, and lookup-shaped reference.
    sidebar: [
      {
        text: 'Start here',
        items: [
          { text: 'Overview', link: '/' },
          { text: 'Getting started', link: '/getting-started' },
        ],
      },
      {
        text: 'Guides',
        items: [
          { text: 'Brand tokens', link: '/guides/brand-tokens' },
          { text: 'Theming', link: '/guides/theming' },
        ],
      },
      {
        text: 'Reference',
        items: [{ text: 'Design system', link: '/reference/design-system' }],
      },
    ],

    outline: { level: [2, 3], label: 'On this page' },

    // No socialLinks: VitePress renders those as inline SVG marks, and the brand
    // rule is to use the bundled lockups rather than redraw any mark. The external
    // link above carries the same destination.

    search: { provider: 'local' },

    // Sentence case throughout — all caps are barred from digital channels.
    docFooter: { prev: 'Previous', next: 'Next' },
    darkModeSwitchLabel: 'Appearance',
    returnToTopLabel: 'Back to top',
    lastUpdated: { text: 'Last updated' },

    footer: {
      message: 'Trusted Expertise. Unrivaled Support.',
      copyright: 'Patterson Companies, Inc. Internal use only.',
    },
  },
});
