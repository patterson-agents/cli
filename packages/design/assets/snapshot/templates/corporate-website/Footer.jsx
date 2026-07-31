/* Footer: visit-our-sites, connect, contact, brand-promise lockup, legal. */
function Footer() {
  const { IconPin, IconExternal } = window;
  const sites = ['Patterson Dental', 'Patterson Veterinary', 'Animal Health International', 'Kane Veterinary Supplies', 'NVS Group', 'Patterson Foundation', 'Investor Relations'];
  const legal = ['Home', 'Terms', 'Privacy', 'Cookies Policy', 'Site Map', 'ACA Notice', 'Careers'];
  const linkStyle = { color: 'rgba(255,255,255,0.78)', fontSize: 'var(--fs-sm)', display: 'inline-flex', alignItems: 'center', gap: 5 };

  return (
    <footer style={{ background: 'var(--pat-navy)', color: '#fff' }}>
      <div className="pat-container" style={{ paddingTop: 'var(--space-9)', paddingBottom: 'var(--space-7)', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 'var(--space-8)' }}>
        <div>
          <div className="pat-eyebrow" style={{ color: 'var(--pat-sky)' }}>Visit our websites</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 22px', marginTop: 14, maxWidth: 460 }}>
            {sites.map((s) => (
              <a key={s} href="#" onClick={(e) => e.preventDefault()} style={linkStyle}
                onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.78)'}>
                {s}<IconExternal size={12} stroke={2.2} />
              </a>
            ))}
          </div>
        </div>
        <div>
          <div className="pat-eyebrow" style={{ color: 'var(--pat-sky)' }}>Connect with us</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            <a href="#" onClick={(e) => e.preventDefault()} style={linkStyle}>Facebook</a>
            <a href="#" onClick={(e) => e.preventDefault()} style={linkStyle}>YouTube</a>
            <a href="#" onClick={(e) => e.preventDefault()} style={linkStyle}>LinkedIn</a>
          </div>
        </div>
        <div>
          <div className="pat-eyebrow" style={{ color: 'var(--pat-sky)' }}>Contact us</div>
          <div style={{ marginTop: 14, fontSize: 'var(--fs-sm)', lineHeight: 1.7, color: 'rgba(255,255,255,0.85)' }}>
            <div style={{ display: 'flex', gap: 6 }}><IconPin size={16} /><span><b style={{ color: '#fff' }}>1031 Mendota Heights Road</b><br />Saint Paul, MN 55120</span></div>
            <div style={{ marginTop: 10 }}>1.800.328.5536<br />info@pattersoncompanies.com</div>
          </div>
        </div>
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.14)' }}>
        <div className="pat-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, paddingTop: 20, paddingBottom: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px' }}>
            {legal.map((l) => (
              <a key={l} href="#" onClick={(e) => e.preventDefault()} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'var(--fs-xs)' }}>{l}</a>
            ))}
          </div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'rgba(255,255,255,0.6)' }}>© 2026 Patterson Companies, Inc. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}
window.Footer = Footer;
