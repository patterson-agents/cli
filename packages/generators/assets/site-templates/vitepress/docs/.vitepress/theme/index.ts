import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import './custom.css';

// Extend the default theme rather than fork it. All Patterson branding lives in
// custom.css as `--vp-*` custom-property overrides, so the theme survives VitePress
// upgrades. Register Vue components here if you later need them in Markdown:
//
//   enhanceApp({ app }) { app.component('MyThing', MyThing); }
export default {
  extends: DefaultTheme,
} satisfies Theme;
