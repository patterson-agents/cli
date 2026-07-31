/* ============================================================
   Patterson Docs — VitePress-style shell + MDX-ish renderer
   ============================================================ */
const { useState, useEffect, useMemo, useRef, Fragment } = React;

/* ---------- inline markdown: **bold**, `code`, [text](url) ---------- */
function inline(text) {
  if (text == null) return null;
  const nodes = [];
  const re = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0, m, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] != null) nodes.push(<strong key={k++}>{m[2]}</strong>);
    else if (m[4] != null) nodes.push(<code key={k++} className="inline-code">{m[4]}</code>);
    else if (m[6] != null) {
      const href = m[7], ext = /^https?:/.test(href);
      nodes.push(<a key={k++} href={href} {...(ext ? { target: '_blank', rel: 'noreferrer' } : {})}>{m[6]}{ext && <ExtIcon />}</a>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function ExtIcon() {
  return <svg className="ext-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M17 7H9M17 7v8"/></svg>;
}
function Arrow({ dir }) {
  const d = dir === 'left' ? 'M19 12H5M11 6l-6 6 6 6' : 'M5 12h14M13 6l6 6-6 6';
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
}

/* ---------- block renderer ---------- */
const BLOCK_KIND = { tip: 'TIP', info: 'INFO', warning: 'WARNING', danger: 'DANGER' };

function Block({ b }) {
  const t = b[0];
  if (t === 'h2') return <h2 id={slug(b[1])}>{inline(b[1])}<a className="header-anchor" href={'#' + slug(b[1])} aria-hidden="true">#</a></h2>;
  if (t === 'h3') return <h3 id={slug(b[1])}>{inline(b[1])}</h3>;
  if (t === 'p') return <p>{inline(b[1])}</p>;
  if (t === 'ul') return <ul>{b[1].map((x, i) => <li key={i}>{inline(x)}</li>)}</ul>;
  if (t === 'ol') return <ol>{b[1].map((x, i) => <li key={i}>{inline(x)}</li>)}</ol>;
  if (t === 'compass') return (
    <div className="vp-compass">
      <span className="vp-compass-badge">Diátaxis</span>
      <span>{inline(b[1])}</span>
    </div>
  );
  if (BLOCK_KIND[t]) return (
    <div className={'custom-block ' + t}>
      <p className="custom-block-title">{b[1] || BLOCK_KIND[t]}</p>
      <p>{inline(b[2])}</p>
    </div>
  );
  if (t === 'code') return (
    <div className="vp-code">
      <span className="vp-code-lang">{b[1]}</span>
      <pre><code>{highlight(b[2], b[1])}</code></pre>
    </div>
  );
  if (t === 'table') return (
    <div className="vp-table-wrap"><table>
      <thead><tr>{b[1].map((h, i) => <th key={i}>{inline(h)}</th>)}</tr></thead>
      <tbody>{b[2].map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j}>{inline(c)}</td>)}</tr>)}</tbody>
    </table></div>
  );
  if (t === 'links') return <LinkList heading={b[1]} note={b[2]} items={b[3]} />;
  return null;
}

/* tiny token highlighter for code blocks (comments + strings dimmed/colored) */
function highlight(src, lang) {
  const lines = src.split('\n');
  return lines.map((ln, i) => {
    let cls = null;
    const trimmed = ln.trimStart();
    if (/^(#|\/\/|--)/.test(trimmed)) cls = 'tok-comment';
    else if (/^>/.test(trimmed)) cls = 'tok-prompt';
    return <span key={i} className={cls || undefined}>{ln}{i < lines.length - 1 ? '\n' : ''}</span>;
  });
}

function LinkList({ heading, note, items }) {
  return (
    <div className="vp-linklist">
      {heading && <p className="vp-linklist-h">{heading}</p>}
      {note && <p className="vp-linklist-note">{inline(note)}</p>}
      <div className="vp-linkcards">
        {items.map((it, i) => {
          const [label, href, desc] = it;
          const ext = /^https?:/.test(href);
          return (
            <a key={i} className="vp-linkcard" href={href} {...(ext ? { target: '_blank', rel: 'noreferrer' } : {})}>
              <span className="vp-linkcard-t">{label}{ext && <ExtIcon />}</span>
              {desc && <span className="vp-linkcard-d">{desc}</span>}
              {ext && <span className="vp-linkcard-host">{hostOf(href)}</span>}
            </a>
          );
        })}
      </div>
    </div>
  );
}
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

/* ---------- collection page ---------- */
function CollectionView({ id }) {
  const c = window.DOCS_COLLECTIONS[id];
  if (!c) return null;
  return (
    <Fragment>
      {c.note && <div className="custom-block info"><p className="custom-block-title">IMPORTED</p><p>{inline(c.note)}</p></div>}
      {c.groups.map((g, i) => (
        <LinkList key={i} heading={g.heading} note={null} items={g.items} />
      ))}
      <p className="vp-source">Source: <a href={c.source} target="_blank" rel="noreferrer">{hostOf(c.source)}<ExtIcon /></a></p>
    </Fragment>
  );
}

/* ---------- flat page order per section (for prev/next) ---------- */
function sectionOrder(section) {
  const sb = window.DOCS_SIDEBARS[section] || [];
  const out = [];
  sb.forEach(group => (group.items || []).forEach(it => { if (it.id) out.push(it.id); }));
  return out;
}

/* ---------- doc page ---------- */
function DocPage({ id }) {
  const page = window.DOCS_PAGES[id];
  const section = window.DOCS_PAGE_SECTION[id];
  const toc = useMemo(() => {
    if (!page || !page.blocks) return [];
    return page.blocks.filter(b => b[0] === 'h2').map(b => ({ text: b[1], id: slug(b[1]) }));
  }, [id]);

  const order = section ? sectionOrder(section) : [];
  const idx = order.indexOf(id);
  const prev = idx > 0 ? order[idx - 1] : null;
  const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;

  useEffect(() => { document.querySelector('.vp-doc-wrap').scrollTop = 0; window.scrollTo(0, 0); }, [id]);

  if (!page) return <div className="vp-doc"><h1>Not found</h1><p>No page with id <code className="inline-code">{id}</code>.</p></div>;

  return (
    <div className="vp-doc-layout">
      <div className="vp-doc">
        <p className="vp-breadcrumb">{page.group}</p>
        <h1>{page.title}{page.badge && <span className="vp-badge">{page.badge}</span>}</h1>
        {page.lead && <p className="vp-lead">{inline(page.lead)}</p>}
        {page.collection ? <CollectionView id={page.collection} /> : (page.blocks || []).map((b, i) => <Block key={i} b={b} />)}

        <div className="vp-doc-footer">
          {prev ? <a className="vp-pager prev" href={'#/' + prev}><span className="vp-pager-k">Previous</span><span className="vp-pager-t"><Arrow dir="left" />{window.DOCS_PAGES[prev].title}</span></a> : <span />}
          {next ? <a className="vp-pager next" href={'#/' + next}><span className="vp-pager-k">Next</span><span className="vp-pager-t">{window.DOCS_PAGES[next].title}<Arrow /></span></a> : <span />}
        </div>
      </div>

      <aside className="vp-aside">
        {toc.length > 0 && <div className="vp-aside-inner">
          <p className="vp-aside-title">On this page</p>
          <ul>{toc.map(h => <li key={h.id}><a href={'#' + h.id}>{h.text}</a></li>)}</ul>
        </div>}
      </aside>
    </div>
  );
}

/* ---------- home ---------- */
function Home() {
  const features = [
    ['Tutorials', 'Learning-oriented lessons that take a newcomer by the hand — Claude Code quickstarts and the Copilot CLI course.', '#/tutorials', 'M12 6.5C10.5 5 8 4.5 5.5 4.5V17c2.5 0 5 .5 6.5 2M12 6.5C13.5 5 16 4.5 18.5 4.5V17c-2.5 0-5 .5-6.5 2M12 6.5V19'],
    ['How-to guides', 'Task-oriented recipes for real goals — install in VS Code, run in a dev container, wire up hooks and MCP.', '#/how-to', 'M4 7h11M4 12h16M4 17h9M19 15l3 3-3 3'],
    ['Reference', 'Information-oriented descriptions — plugin schemas, the prompt library, SDK and API specs, Copilot catalogs.', '#/reference', 'M5 4h11l3 3v13H5zM9 4v4h7'],
    ['Explanation', 'Understanding-oriented discussion — how Claude Code works, the agent loop, why MCP Apps exist.', '#/explanation', 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 8v.5M11 12h1v4'],
  ];
  return (
    <div className="vp-home">
      <section className="vp-hero">
        <div className="vp-hero-text">
          <p className="vp-hero-eyebrow">Patterson · Developer Documentation</p>
          <h1 className="vp-hero-title">Patterson <span className="brand">Docs</span></h1>
          <p className="vp-hero-tagline">A documentation system built on VitePress + MDX and organised with Diátaxis — four modes, one clear map for every reader.</p>
          <div className="vp-hero-actions">
            <a className="vp-btn brand" href="#/tutorials">Get started<Arrow /></a>
            <a className="vp-btn alt" href="#/foundations">Why Diátaxis?</a>
            <a className="vp-btn alt" href="#/reference">Reference</a>
          </div>
        </div>
        <div className="vp-hero-figure" aria-hidden="true">
          <div className="vp-compass-graphic">
            <div className="q q1"><span>Tutorials</span><em>learning</em></div>
            <div className="q q2"><span>How-to</span><em>goals</em></div>
            <div className="q q3"><span>Explanation</span><em>understanding</em></div>
            <div className="q q4"><span>Reference</span><em>information</em></div>
            <div className="axis ax-x"><span>action</span><span>cognition</span></div>
            <div className="axis ax-y"><span>study</span><span>work</span></div>
          </div>
        </div>
      </section>
      <section className="vp-features">
        {features.map((f, i) => (
          <a key={i} className="vp-feature" href={f[2]}>
            <span className="vp-feature-ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={f[3]}/></svg></span>
            <span className="vp-feature-t">{f[0]}</span>
            <span className="vp-feature-d">{f[1]}</span>
          </a>
        ))}
      </section>
      <section className="vp-home-note">
        <p>Content imported from <a href="https://code.claude.com/docs/llms.txt" target="_blank" rel="noreferrer">Claude Code docs</a>, <a href="https://awesome-copilot.github.com/llms.txt" target="_blank" rel="noreferrer">Awesome Copilot</a>, <a href="https://agentskills.io/llms.txt" target="_blank" rel="noreferrer">Agent Skills</a>, <a href="https://docs.github.com/llms.txt" target="_blank" rel="noreferrer">GitHub Docs</a> and <a href="https://github.com/modelcontextprotocol/ext-apps" target="_blank" rel="noreferrer">MCP ext-apps</a>.</p>
      </section>
    </div>
  );
}

/* ---------- sidebar ---------- */
function Sidebar({ section, current, onNav }) {
  const groups = window.DOCS_SIDEBARS[section] || [];
  return (
    <nav className="vp-sidebar">
      {groups.map((g, i) => (
        <div className="vp-sb-group" key={i}>
          <p className="vp-sb-title">{g.text}</p>
          <ul>
            {(g.items || []).map((it, j) => {
              const ext = !!it.href;
              const active = it.id && it.id === current;
              return (
                <li key={j}>
                  <a className={'vp-sb-link' + (active ? ' active' : '')}
                     href={ext ? it.href : '#/' + it.id}
                     {...(ext ? { target: '_blank', rel: 'noreferrer' } : {})}>
                    {it.text}
                    {it.badge && <span className="vp-sb-badge">{it.badge}</span>}
                    {ext && <ExtIcon />}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/* ---------- search index + modal ---------- */
function buildIndex() {
  const out = [];
  Object.keys(window.DOCS_PAGES).forEach(id => {
    const p = window.DOCS_PAGES[id];
    out.push({ title: p.title, sub: p.group, to: '#/' + id, ext: false });
  });
  Object.keys(window.DOCS_SIDEBARS).forEach(sec => {
    window.DOCS_SIDEBARS[sec].forEach(g => (g.items || []).forEach(it => {
      if (it.href) out.push({ title: it.text, sub: g.text, to: it.href, ext: true });
    }));
  });
  Object.keys(window.DOCS_COLLECTIONS).forEach(cid => {
    window.DOCS_COLLECTIONS[cid].groups.forEach(g => g.items.forEach(it => {
      out.push({ title: it[0], sub: g.heading, to: it[1], ext: /^https?:/.test(it[1]) });
    }));
  });
  // de-dupe by title+to
  const seen = new Set();
  return out.filter(x => { const k = x.title + x.to; if (seen.has(k)) return false; seen.add(k); return true; });
}

function Search({ open, onClose }) {
  const [q, setQ] = useState('');
  const idx = useMemo(buildIndex, []);
  const inputRef = useRef(null);
  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); if (open) setQ(''); }, [open]);
  if (!open) return null;
  const ql = q.trim().toLowerCase();
  const results = ql ? idx.filter(x => x.title.toLowerCase().includes(ql) || x.sub.toLowerCase().includes(ql)).slice(0, 40) : [];
  return (
    <div className="vp-search-mask" onClick={onClose}>
      <div className="vp-search-box" onClick={e => e.stopPropagation()}>
        <div className="vp-search-head">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search docs, references and imported links…" />
          <button className="vp-kbd" onClick={onClose}>esc</button>
        </div>
        <div className="vp-search-results">
          {ql && results.length === 0 && <p className="vp-search-empty">No results for “{q}”.</p>}
          {results.map((r, i) => (
            <a key={i} className="vp-search-hit" href={r.to} target={r.ext ? '_blank' : undefined} rel={r.ext ? 'noreferrer' : undefined} onClick={() => { if (!r.ext) onClose(); }}>
              <span className="vp-search-hit-t">{r.title}{r.ext && <ExtIcon />}</span>
              <span className="vp-search-hit-s">{r.sub}</span>
            </a>
          ))}
          {!ql && <p className="vp-search-empty">Type to search across every page and imported link.</p>}
        </div>
      </div>
    </div>
  );
}

/* ---------- top nav ---------- */
function TopNav({ activeSection, theme, onTheme, onSearch, onToggleSidebar }) {
  return (
    <header className="vp-nav">
      <div className="vp-nav-inner">
        <button className="vp-hamburger" onClick={onToggleSidebar} aria-label="Menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
        <a className="vp-logo" href="#/">
          <span className="vp-logo-mark">P</span>
          <span className="vp-logo-text">Patterson <b>Docs</b></span>
        </a>
        <nav className="vp-nav-links">
          {window.DOCS_NAV.map(n => (
            <a key={n.section} href={n.to} className={'vp-nav-link' + (n.section === activeSection ? ' active' : '')}>{n.text}</a>
          ))}
        </nav>
        <div className="vp-nav-actions">
          <button className="vp-search-btn" onClick={onSearch}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
            <span>Search</span>
            <span className="vp-kbd sm">⌘K</span>
          </button>
          <a className="vp-icon-btn" href="https://github.com/modelcontextprotocol/ext-apps" target="_blank" rel="noreferrer" aria-label="GitHub">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49v-1.7c-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.3 9.3 0 015 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9v2.81c0 .27.18.59.69.49A10.03 10.03 0 0022 12.25C22 6.58 17.52 2 12 2z"/></svg>
          </a>
          <button className="vp-icon-btn" onClick={onTheme} aria-label="Toggle theme">
            {theme === 'dark'
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>}
          </button>
        </div>
      </div>
    </header>
  );
}

/* ---------- app ---------- */
function useHashRoute() {
  const [hash, setHash] = useState(location.hash || '#/');
  useEffect(() => {
    const on = () => setHash(location.hash || '#/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

function App() {
  const hash = useHashRoute();
  const [theme, setTheme] = useState(() => localStorage.getItem('pat-docs-theme') || 'light');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sbOpen, setSbOpen] = useState(false);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('pat-docs-theme', theme); }, [theme]);
  useEffect(() => {
    const on = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true); } if (e.key === 'Escape') setSearchOpen(false); };
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on);
  }, []);
  useEffect(() => { setSbOpen(false); }, [hash]);

  // route
  const path = hash.replace(/^#\//, '').split('#')[0];  // strip in-page anchor
  const pageId = path === '' ? 'home' : path;
  const isHome = pageId === 'home';
  const section = isHome ? null : window.DOCS_PAGE_SECTION[pageId];

  return (
    <Fragment>
      <TopNav activeSection={section} theme={theme} onTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} onSearch={() => setSearchOpen(true)} onToggleSidebar={() => setSbOpen(o => !o)} />
      {isHome ? (
        <main className="vp-content home"><Home /></main>
      ) : (
        <div className={'vp-shell' + (sbOpen ? ' sb-open' : '')}>
          <div className="vp-sidebar-wrap">
            <Sidebar section={section} current={pageId} />
          </div>
          <div className="vp-sidebar-scrim" onClick={() => setSbOpen(false)} />
          <main className="vp-content">
            <div className="vp-doc-wrap">
              <DocPage id={pageId} />
              <footer className="vp-page-foot">
                <span>Patterson Companies · Developer Documentation</span>
                <span>Built with VitePress conventions · organised by Diátaxis</span>
              </footer>
            </div>
          </main>
        </div>
      )}
      <Search open={searchOpen} onClose={() => setSearchOpen(false)} />
    </Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
