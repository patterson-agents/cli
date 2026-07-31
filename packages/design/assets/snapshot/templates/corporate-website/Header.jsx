/* Sticky brand header: product-switch bar + main nav. */
function Header({ route, onNavigate }) {
  const { IconSearch, IconMenu, IconExternal } = window;
  const nav = ['Our Company', 'What We Do', 'How We Do It', 'Community Strong', 'Join Us', 'Newsroom'];
  const products = ['Patterson Dental', 'Patterson Veterinary', 'Animal Health International', 'Patterson Logistics'];
  const routeOf = (label) => label.toLowerCase().replace(/\s+/g, '-');

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: '#fff', boxShadow: 'var(--shadow-sm)' }}>
      {/* product switch bar */}
      <div style={{ background: 'var(--pat-navy)', color: '#fff' }}>
        <div className="pat-container" style={{ display: 'flex', justifyContent: 'flex-end', gap: '26px', height: 40, alignItems: 'center' }}>
          {products.map((p) => (
            <a key={p} href="#" onClick={(e) => e.preventDefault()}
              style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'var(--fs-sm)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 5 }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.85)'}>
              {p}<IconExternal size={13} stroke={2.2} />
            </a>
          ))}
        </div>
      </div>
      {/* main bar */}
      <div className="pat-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 76 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('home'); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: 'var(--pat-navy)' }}>
          <img src="../../assets/brand/patterson-logo-navy.svg" alt="Patterson" style={{ height: 26, width: 'auto', display: 'block' }} />
        </a>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {nav.map((label) => {
            const r = routeOf(label);
            const active = route === r;
            return (
              <a key={label} href="#" onClick={(e) => { e.preventDefault(); onNavigate(r); }}
                style={{
                  fontSize: 'var(--fs-sm)', fontWeight: active ? 700 : 500,
                  color: active ? 'var(--pat-navy)' : 'var(--text-body)',
                  padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                  borderBottom: `2px solid ${active ? 'var(--pat-sky)' : 'transparent'}`,
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--pat-navy)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'var(--text-body)'; }}>
                {label}
              </a>
            );
          })}
          <span style={{ width: 1, height: 24, background: 'var(--border-default)', margin: '0 8px' }} />
          <button aria-label="Search" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pat-navy)', display: 'flex', padding: 8 }}>
            <IconSearch size={20} />
          </button>
        </nav>
      </div>
    </header>
  );
}
window.Header = Header;
