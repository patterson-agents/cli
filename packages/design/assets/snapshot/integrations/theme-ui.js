/**
 * Patterson Companies — Theme UI theme
 * -------------------------------------------------------------
 * The canonical theme, shaped to the Theme UI spec:
 *   https://theme-ui.com/theme-spec  ·  https://theme-ui.com/theming
 *
 * Single source of truth is ../theme.json (which mirrors tokens/*.css).
 * This module imports it, drops the documentation-only `$` keys, and
 * exports a ready-to-use Theme UI theme — variants included.
 *
 * Usage (React):
 *   import { ThemeUIProvider } from 'theme-ui';
 *   import theme from '@patterson/design-system/integrations/theme-ui.js';
 *   <ThemeUIProvider theme={theme}>{app}</ThemeUIProvider>
 *
 * Then compose with the sx prop and variants, e.g.
 *   <button sx={{ variant: 'buttons.primary', px: 5, height: 'controlMd' }}>Shop</button>
 *   <h1 sx={{ variant: 'text.display' }}>Trusted Expertise.</h1>
 *   <div sx={{ variant: 'cards.interactive' }}>…</div>
 *
 * If your bundler does not support JSON import assertions, replace the
 * import below with a copy of theme.json's contents as a JS object literal.
 */
import raw from '../theme.json' with { type: 'json' };

const { $schema, $meta, ...theme } = raw;

/** Theme UI colours use `modes` for alternate palettes. Patterson ships a
 *  single light palette today; a navy "on-dark" surface is expressed through
 *  the `buttons.onDark` / `text.eyebrow` variants rather than a full mode. */
export const meta = $meta;
export const pattersonTheme = theme;
export default theme;
