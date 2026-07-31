/**
 * Patterson Companies — Tailwind config (v3-style / JS)
 * -------------------------------------------------------------
 * Prefer integrations/tailwind.css (the CSS-first v4 theme) when you can.
 * Use THIS file if you are on Tailwind v3, or on v4 but loading a JS config
 * with `@config "./tailwind.config.js";`.
 *
 * All values mirror tokens/*.css and theme.json. Spacing is intentionally
 * left as Tailwind's default (0.25rem base = Patterson's 4px grid).
 *
 *   // tailwind.config.js
 *   import patterson from '@patterson/design-system/integrations/tailwind.config.js';
 *   export default { presets: [patterson], content: ['./src/**\/*.{html,js,jsx,ts,tsx}'] };
 */
const navy = '#003767';
const sky = '#00A8E1';

/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ["proxima-nova", "Figtree", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        display: ["proxima-nova", "Figtree", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SF Mono", "Menlo", "Consolas", "monospace"],
      },
      colors: {
        navy: { DEFAULT: navy, 80: "#335f85", 60: "#6687a4", 40: "#99afc2", 20: "#ccd7e1", 10: "#e5ebf0" },
        sky:  { DEFAULT: sky,  80: "#33b9e7", 60: "#66caed", 40: "#99dcf3", 20: "#ccedf9", 10: "#e5f6fc" },
        blue: "#147EC2",
        "blue-light": "#6DCFF6",
        green: "#7BC24D",
        teal: "#00817D",
        purple: "#522E91",
        // Interaction states (production-verified): primary hover is a
        // LIGHTER NAVY, not sky; secondary is a filled light blue.
        "primary-hover": "#315D83",
        "primary-disabled": "#93A9BC",
        "secondary-hover": "#96DBF6",
        "secondary-disabled": "#DAEDF5",
        // Warm taupe — the brand's one non-cool gray (input borders).
        "gray-warm": "#AFA593",
        "border-field": "#AFA593",
        "slider-nav": "#D9D9D9",
        ink: "#1d1d20",
        gray: {
          brand: "#58585B",
          700: "#46464a", 600: "#58585B", 500: "#7c7c80", 400: "#a3a3a7",
          300: "#c9c9cc", 200: "#e2e2e4", 100: "#ECECEC", 50: "#f6f7f8",
        },
        success: "#00817D", "success-bg": "#e5f2f1",
        info: "#147EC2", "info-bg": "#e7f1f9",
        warning: "#d98a00", "warning-bg": "#fbf1df",
        danger: "#c0392b", "danger-bg": "#f8eae8",
        // role aliases
        heading: "#1d1d20",
        body: "#58585B",
        muted: "#7c7c80",
        link: "#147EC2",
        border: "#e2e2e4",
        "border-strong": "#a3a3a7",
        surface: "#FFFFFF",
        "surface-subtle": "#f6f7f8",
        ring: sky,
      },
      fontSize: {
        xs: "0.75rem",
        sm: "0.875rem",
        body: "1rem",
        h5: "1.0625rem",
        lead: "1.25rem",
        h4: "1.25rem",
        h3: "clamp(1.375rem, 1.15rem + 0.8vw, 1.75rem)",
        h2: "clamp(1.75rem, 1.3rem + 1.6vw, 2.5rem)",
        h1: "clamp(2.25rem, 1.5rem + 2.6vw, 3.25rem)",
        display: "clamp(2.75rem, 1.6rem + 4.2vw, 4.5rem)",
        stat: "clamp(2.5rem, 1.4rem + 4vw, 4rem)",
      },
      // NOTE: the Patterson Proxima Nova kit ships only 400 and 700.
      // 300/500/600/800/900 are browser-synthesized (faux) bold.
      fontWeight: {
        light: "300", medium: "500", semibold: "600", bold: "700", extra: "800", black: "900",
      },
      lineHeight: {
        tight: "1.05", snug: "1.2", heading: "1.15", body: "1.6", relaxed: "1.75",
      },
      letterSpacing: {
        tight: "-0.02em", snug: "-0.01em", wide: "0.04em", caps: "0.08em",
      },
      borderRadius: {
        // Production-verified: 5px buttons, 2px fields. No pill in production.
        btn: "5px", "btn-elevated": "6px", field: "2px",
        xs: "2px", sm: "4px", md: "6px", lg: "10px", xl: "16px", "2xl": "24px", pill: "999px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(0, 55, 103, 0.06)",
        sm: "0 1px 3px rgba(0, 55, 103, 0.08), 0 1px 2px rgba(0, 55, 103, 0.06)",
        md: "0 4px 12px rgba(0, 55, 103, 0.10), 0 2px 4px rgba(0, 55, 103, 0.06)",
        lg: "0 12px 28px rgba(0, 55, 103, 0.12), 0 4px 10px rgba(0, 55, 103, 0.07)",
        xl: "0 24px 48px rgba(0, 55, 103, 0.16)",
      },
      maxWidth: {
        container: "1240px",
        text: "720px",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.2, 0, 0.2, 1)",
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        fast: "120ms", base: "200ms", slow: "320ms",
      },
    },
  },
};
