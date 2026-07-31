// templates/deck/ds-base.js
// Loads the Patterson Companies design system foundations (tokens + fonts) for
// the deck template. Slides are static HTML styled with the DS custom properties,
// so only the global stylesheet is needed here (no React/bundle required).
//
// Consuming projects: point `base` at the bound _ds/<folder> tree relative to
// this page (e.g. '_ds/<folder>' at the project root, '../_ds/<folder>' one
// level down).
(() => {
  const base = '../..';
  for (const p of ['styles.css']) {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = base + '/' + p;
    document.head.appendChild(l);
  }
  // Slide layout system reversed from the corporate PowerPoint master.
  {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = base + '/assets/deck/patterson-slides.css';
    document.head.appendChild(l);
  }
  // Expose the resolved asset base so slides can reference brand assets.
  window.__PAT_DS_BASE = base;
})();
