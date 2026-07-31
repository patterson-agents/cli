/* Patterson storefront header: navy utility bar + white main bar
   (logo, Algolia-style search, account, cart) + category nav with flyout. */
function StoreHeader({ brand, cartCount, onAddDemo }) {
  const DS = window.PattersonCompaniesDesignSystem_3534f9;
  const { Button } = DS;
  const { SSearch, SUser, SCart, SChevron, SPhone } = window;
  const [open, setOpen] = React.useState(null);

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: '#fff', boxShadow: 'var(--shadow-sm)' }} onMouseLeave={() => setOpen(null)}>
      {/* utility bar */}
      <div style={{ background: 'var(--pat-navy)', color: '#fff' }}>
        <div className="pat-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 38 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 'var(--fs-sm)', color: 'rgba(255,255,255,0.85)' }}>
            <SPhone size={15} stroke={2.2} /> {brand.phone}
          </span>
          <nav style={{ display: 'flex', gap: 22 }}>
            {brand.utility.map((u) => (
              <a key={u} href="#" onClick={(e) => e.preventDefault()} style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'var(--fs-sm)', fontWeight: 500 }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#fff'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.85)'}>{u}</a>
            ))}
          </nav>
        </div>
      </div>

      {/* main bar */}
      <div className="pat-container" style={{ display: 'flex', alignItems: 'center', gap: 28, height: 84 }}>
        <a href="#" onClick={(e) => e.preventDefault()} style={{ display: 'inline-flex', alignItems: 'center', gap: 11, flex: 'none' }}>
          <img src="../../assets/brand/patterson-logo-navy.svg" alt="Patterson" style={{ height: 28, width: 'auto', display: 'block' }} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pat-sky)', borderLeft: '1px solid var(--border-default)', paddingLeft: 12 }}>{brand.sub}</span>
        </a>

        {/* search */}
        <form onSubmit={(e) => e.preventDefault()} style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: 16, color: 'var(--text-muted)', display: 'flex' }}><SSearch size={20} /></span>
          <input placeholder={`Search ${brand.sub.toLowerCase()} products, brands and supplies`} style={{
            width: '100%', height: 46, padding: '0 16px 0 46px', fontFamily: 'var(--font-sans)', fontSize: 'var(--fs-body)',
            color: 'var(--text-heading)', background: 'var(--surface-subtle)', border: '1px solid var(--border-field)', borderRadius: 'var(--radius-field)', outline: 'none',
          }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--pat-sky)'; e.target.style.background = '#fff'; e.target.style.boxShadow = 'var(--ring-focus)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.background = 'var(--surface-subtle)'; e.target.style.boxShadow = 'none'; }} />
        </form>

        {/* account + cart */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 'none' }}>
          <a href="#" onClick={(e) => e.preventDefault()} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--pat-navy)', fontWeight: 600, fontSize: 'var(--fs-sm)' }}>
            <SUser size={22} /><span>Sign In<br />or Register</span>
          </a>
          <button onClick={onAddDemo} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pat-navy)', fontWeight: 600, fontSize: 'var(--fs-sm)' }}>
            <span style={{ position: 'relative', display: 'flex' }}>
              <SCart size={24} />
              {cartCount > 0 && <span style={{ position: 'absolute', top: -8, right: -10, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 'var(--radius-pill)', background: 'var(--pat-sky)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cartCount}</span>}
            </span>
            <span>Cart</span>
          </button>
          <Button size="sm" variant="primary">Open an Account</Button>
        </div>
      </div>

      {/* category nav */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', background: '#fff' }}>
        <div className="pat-container" style={{ display: 'flex', gap: 4, height: 48, alignItems: 'stretch' }}>
          {brand.nav.map((n) => {
            const active = open === n;
            return (
              <div key={n} onMouseEnter={() => setOpen(n)} style={{ display: 'flex', alignItems: 'center' }}>
                <a href="#" onClick={(e) => e.preventDefault()} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, height: '100%', padding: '0 16px', fontSize: 'var(--fs-body)', fontWeight: 600,
                  color: active ? 'var(--pat-navy)' : 'var(--text-body)', borderBottom: `3px solid ${active ? 'var(--pat-sky)' : 'transparent'}`,
                }}>{n}<SChevron size={15} stroke={2.4} /></a>
              </div>
            );
          })}
        </div>

        {/* flyout */}
        {open && brand.flyout[open] && (
          <div style={{ position: 'absolute', left: 0, right: 0, background: '#fff', boxShadow: 'var(--shadow-lg)', borderTop: '1px solid var(--border-subtle)' }}>
            <div className="pat-container" style={{ padding: '24px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 32px' }}>
                {brand.flyout[open].map((item) => (
                  <a key={item} href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 'var(--fs-body)', color: 'var(--text-body)', padding: '6px 0' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--pat-sky)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-body)'}>{item}</a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
window.StoreHeader = StoreHeader;
