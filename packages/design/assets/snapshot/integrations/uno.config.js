/**
 * Patterson Companies — UnoCSS config
 * -------------------------------------------------------------
 * Import into your uno.config.js (or use as a preset). Uses presetWind4
 * (Tailwind-v4-compatible utilities) plus Patterson theme values and a set
 * of brand shortcuts that reproduce the component recipes as utilities.
 *
 *   import { defineConfig, presetWind4, presetIcons } from 'unocss';
 *   import { pattersonPreset } from '@patterson/design-system/integrations/uno.config.js';
 *
 *   export default defineConfig({
 *     presets: [presetWind4(), presetIcons({ scale: 1.1 }), pattersonPreset()],
 *   });
 *
 * Then: <button class="btn btn-primary">Shop</button>
 *       <div class="pat-card">…</div>
 *       <p class="eyebrow">Since 1877</p>
 *       <span class="stat">98%</span>
 *
 * This module intentionally does NOT import from 'unocss' itself — it is pure
 * theme data, so it can be consumed anywhere without a build step. You supply
 * defineConfig + presets in your own uno.config.js as shown above.
 */
const theme = {
  colors: {
    navy: { DEFAULT: '#003767', 80: '#335f85', 60: '#6687a4', 40: '#99afc2', 20: '#ccd7e1', 10: '#e5ebf0' },
    sky:  { DEFAULT: '#00A8E1', 80: '#33b9e7', 60: '#66caed', 40: '#99dcf3', 20: '#ccedf9', 10: '#e5f6fc' },
    blue: '#147EC2', bluelight: '#6DCFF6', green: '#7BC24D', teal: '#00817D', purple: '#522E91',
    // Production-verified interaction states + the brand's warm taupe.
    primaryhover: '#315D83', primarydisabled: '#93A9BC',
    secondaryhover: '#96DBF6', secondarydisabled: '#DAEDF5',
    graywarm: '#AFA593', borderfield: '#AFA593', slidernav: '#D9D9D9',
    ink: '#1d1d20',
    gray: { brand: '#58585B', 700: '#46464a', 600: '#58585B', 500: '#7c7c80', 400: '#a3a3a7', 300: '#c9c9cc', 200: '#e2e2e4', 100: '#ECECEC', 50: '#f6f7f8' },
    success: '#00817D', info: '#147EC2', warning: '#d98a00', danger: '#c0392b',
    heading: '#1d1d20', body: '#58585B', muted: '#7c7c80', link: '#147EC2',
    border: '#e2e2e4', surface: '#FFFFFF', ring: '#00A8E1',
  },
  fontFamily: {
    sans: "'proxima-nova','Figtree',system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
    display: "'proxima-nova','Figtree',system-ui,sans-serif",
    mono: "'IBM Plex Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace",
  },
  fontSize: {
    xs: '0.75rem', sm: '0.875rem', body: '1rem', h5: '1.0625rem', lead: '1.25rem', h4: '1.25rem',
    h3: 'clamp(1.375rem, 1.15rem + 0.8vw, 1.75rem)',
    h2: 'clamp(1.75rem, 1.3rem + 1.6vw, 2.5rem)',
    h1: 'clamp(2.25rem, 1.5rem + 2.6vw, 3.25rem)',
    display: 'clamp(2.75rem, 1.6rem + 4.2vw, 4.5rem)',
    stat: 'clamp(2.5rem, 1.4rem + 4vw, 4rem)',
  },
  // Only 400 and 700 are licensed faces; the rest are synthesized.
  fontWeight: { light: '300', medium: '500', semibold: '600', bold: '700', extra: '800', black: '900' },
  lineHeight: { tight: '1.05', snug: '1.2', heading: '1.15', body: '1.6', relaxed: '1.75' },
  letterSpacing: { tight: '-0.02em', snug: '-0.01em', wide: '0.04em', caps: '0.08em' },
  // btn/btnElevated/field are production-verified; pill is system-only.
  borderRadius: { xs: '2px', sm: '4px', md: '6px', lg: '10px', xl: '16px', '2xl': '24px', pill: '999px', btn: '5px', btnElevated: '6px', field: '2px' },
  boxShadow: {
    xs: '0 1px 2px rgba(0,55,103,0.06)',
    sm: '0 1px 3px rgba(0,55,103,0.08), 0 1px 2px rgba(0,55,103,0.06)',
    md: '0 4px 12px rgba(0,55,103,0.10), 0 2px 4px rgba(0,55,103,0.06)',
    lg: '0 12px 28px rgba(0,55,103,0.12), 0 4px 10px rgba(0,55,103,0.07)',
    xl: '0 24px 48px rgba(0,55,103,0.16)',
    focus: '0 0 0 3px rgba(0,168,225,0.45)',
  },
  maxWidth: { container: '1240px', text: '720px' },
  easing: { standard: 'cubic-bezier(0.2,0,0.2,1)', out: 'cubic-bezier(0.16,1,0.3,1)' },
};

/* Component recipes as shortcuts — reproduce the .jsx primitives' looks. */
const shortcutsMap = {
  'eyebrow': 'text-xs font-bold tracking-caps uppercase text-sky',
  'stat': 'font-display text-stat font-bold leading-tight tracking-tight text-sky',
  'pat-container': 'w-full max-w-container mx-auto px-6',
  'pat-card': 'bg-surface border border-border rounded-lg shadow-sm p-6',
  'pat-card-interactive': 'pat-card transition-all duration-200 ease-standard hover:-translate-y-[3px] hover:shadow-lg',
  'btn': 'inline-flex items-center justify-center gap-2 h-11 px-6 rounded-pill font-sans font-semibold leading-none cursor-pointer transition-colors duration-[120ms] ease-standard border-2',
  'btn-primary': 'btn bg-navy text-white border-navy hover:bg-sky hover:border-sky',
  'btn-sky': 'btn bg-sky text-white border-sky hover:bg-navy hover:border-navy',
  'btn-outline': 'btn bg-transparent text-navy border-navy hover:bg-navy hover:text-white',
  'btn-ghost': 'btn bg-transparent text-navy border-transparent hover:bg-navy-10',
  'btn-on-dark': 'btn bg-white text-navy border-white hover:bg-sky hover:text-white hover:border-sky',
  'input': 'w-full h-11 px-3 rounded-md border border-gray-300 bg-surface text-body font-sans focus-visible:(outline-none border-sky shadow-focus)',
  'badge': 'inline-flex items-center gap-1 px-3 py-1 rounded-pill text-xs font-semibold',
};

export const shortcuts = shortcutsMap;

/** UnoCSS preset carrying the Patterson theme + brand shortcuts. */
export function pattersonPreset() {
  return { name: 'patterson', theme, shortcuts: shortcutsMap };
}

export default pattersonPreset;
