/* Storefront footer — multi-column link groups + HQ + legal. */
function StoreFooter({ brand }) {
  const cols = [
    { h: 'About Us', items: ['Patterson Companies', 'Patterson Foundation', 'Careers', 'Data Security', 'Contact Us'] },
    { h: 'Get Help', items: ['Locate a Branch', 'Subscribe to Newsletters', 'Request Service', 'Reset Password'] },
    { h: 'Quick Links', items: ['Open an Account', 'Track an Order', 'Search SDS', 'Start a Return', 'FAQs'] },
    { h: 'Services', items: ['Repair and Support', 'Office Design', 'Financial Services', 'Practice Transitions'] },
  ];
  const link = { color: 'rgba(255,255,255,0.78)', fontSize: 'var(--fs-sm)', display: 'block', padding: '4px 0' };
  return (
    <footer style={{ background: 'var(--pat-navy)', color: '#fff' }}>
      <div className="pat-container" style={{ paddingTop: 'var(--space-9)', paddingBottom: 'var(--space-7)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) 1.1fr', gap: 'var(--space-6)' }}>
        {cols.map((c) => (
          <div key={c.h}>
            <div className="pat-eyebrow" style={{ color: 'var(--pat-sky)', marginBottom: 10 }}>{c.h}</div>
            {c.items.map((it) => (
              <a key={it} href="#" onClick={(e) => e.preventDefault()} style={link}
                onMouseEnter={(e) => e.currentTarget.style.color = '#fff'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.78)'}>{it}</a>
            ))}
          </div>
        ))}
        <div>
          <div className="pat-eyebrow" style={{ color: 'var(--pat-sky)', marginBottom: 10 }}>Connect</div>
          <div style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.7, color: 'rgba(255,255,255,0.85)' }}>
            <b style={{ color: '#fff' }}>Headquarters</b><br />1031 Mendota Heights Rd<br />Saint Paul, MN 55120
          </div>
          <div style={{ marginTop: 12 }}>
            <img src="../../assets/brand/patterson-logo-white.svg" alt="Patterson" style={{ height: 24, width: 'auto', display: 'block' }} />
          </div>
        </div>
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.14)' }}>
        <div className="pat-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingTop: 18, paddingBottom: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px' }}>
            {['Terms of Use', 'Privacy Policy', 'Sunshine Act', 'Returns', 'Payment Options'].map((l) => (
              <a key={l} href="#" onClick={(e) => e.preventDefault()} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'var(--fs-xs)' }}>{l}</a>
            ))}
          </div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'rgba(255,255,255,0.6)' }}>{brand.legal}</div>
        </div>
      </div>
    </footer>
  );
}
window.StoreFooter = StoreFooter;
