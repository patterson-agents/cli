// templates/file-manager/ds-base.js
// Loads the Patterson Companies design system (styles + component bundle).
// Consuming projects: point `base` at the bound _ds/<folder> tree relative to this page.
(() => {
  const base = '../..';
  for (const p of ['styles.css']) {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = base + '/' + p;
    document.head.appendChild(l);
  }
  const s = document.createElement('script');
  s.src = base + '/_ds_bundle.js';
  s.onerror = () => console.error('ds-base.js: failed to load ' + s.src +
    ' — in a consuming project point the base line at the bound _ds/<folder> tree relative to this page; in this design system itself it just means the bundle has not compiled yet.');
  document.head.appendChild(s);
})();
