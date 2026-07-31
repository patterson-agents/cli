/* Home: hero, four-pillar cards, We-Are-Patterson stats, capabilities, news, CTA. */
function HomeScreen({ onNavigate }) {
  const DS = window.PattersonCompaniesDesignSystem_3534f9;
  const { Button, Card, Stat, Tabs, Badge } = DS;
  const { IconArrow, IconTooth, IconPaw, IconTruck, IconLeaf } = window;
  const [cap, setCap] = React.useState('Service');

  const pillars = [
    { icon: IconTooth, color: 'var(--pat-sky)', title: 'Dental', body: 'Across North America, we supply dentists with everyday essentials and software to run their business.' },
    { icon: IconPaw, color: 'var(--pat-teal)', title: 'Animal Health', body: 'Internationally, we supply veterinarians and producers with the essentials and software to run their operations.' },
    { icon: IconTruck, color: 'var(--pat-navy)', title: 'Logistics', body: 'We reach 98% of customers with 1-to-2-day shipping from 60 state-of-the-art fulfillment centers.' },
    { icon: IconLeaf, color: 'var(--pat-green)', title: 'Sustainability', body: 'Solar-powered fulfillment centers fuel our delivery system and minimize our footprint.' },
  ];

  const capabilities = {
    Service: 'Generations of quality customer service define our business operations and our personal interactions. We are an indispensable partner — not just a distributor.',
    Logistics: 'We reach 98% of our customers with 1-to-2-day shipping from 60 state-of-the-art fulfillment centers strategically located internationally.',
    Products: 'From everyday essentials to advanced technology and practice-management software, we provide everything practices need to run productively.',
  };

  const news = [
    { tag: 'Leadership', date: 'Jan 20, 2026', title: 'Patterson announces Senior Vice President of Dental Software' },
    { tag: 'Corporate', date: 'Jan 12, 2026', title: 'Patterson Companies completes acquisition by Patient Square Capital' },
    { tag: 'Veterinary', date: 'Dec 18, 2025', title: 'Patterson Veterinary and dvmGRO join forces to support independent practices' },
  ];

  return (
    <main>
      {/* HERO */}
      <section style={{ background: 'var(--pat-navy)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        {/* Wave watermark — the brand's only decorative mark. Production uses NO gradients. */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('../../assets/brand/wave-bg-navy.png')", backgroundSize: 'cover', backgroundPosition: 'right top', opacity: 0.5 }} />
        <div className="pat-container" style={{ position: 'relative', paddingTop: 'var(--space-11)', paddingBottom: 'var(--space-11)', maxWidth: 900 }}>
          <div className="pat-eyebrow" style={{ color: 'var(--pat-sky)' }}>Trusted Expertise · Unrivaled Support</div>
          <h1 style={{ color: '#fff', fontSize: 'var(--fs-display)', margin: '14px 0 18px', maxWidth: '14ch', lineHeight: 1.04 }}>
            We strengthen the people who keep us and our animals <span style={{ color: 'var(--pat-sky)' }}>healthy</span>.
          </h1>
          <p style={{ fontSize: 'var(--fs-lead)', color: 'rgba(255,255,255,0.82)', maxWidth: 620 }}>
            Bold solutions and a personal touch for the oral and animal health industries — supporting practices and operations since 1877.
          </p>
          <div style={{ display: 'flex', gap: 14, marginTop: 28, flexWrap: 'wrap' }}>
            <Button variant="secondary" size="lg" iconRight={<IconArrow size={18} />} onClick={() => onNavigate('what-we-do')}>What we do</Button>
            <Button variant="onDark" size="lg" onClick={() => onNavigate('our-company')}>Our company</Button>
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <section className="pat-container" style={{ paddingTop: 'var(--space-9)', paddingBottom: 'var(--space-9)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-5)' }}>
          {pillars.map((p) => {
            const I = p.icon;
            return (
              <Card key={p.title} interactive accent="sky" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--pat-navy-10)', color: p.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <I size={26} />
                </span>
                <h3 style={{ margin: 0, fontSize: 'var(--fs-h4)' }}>{p.title}</h3>
                <p style={{ margin: 0, fontSize: 'var(--fs-sm)', flex: 1 }}>{p.body}</p>
                <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('what-we-do'); }} style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  Learn more <IconArrow size={15} />
                </a>
              </Card>
            );
          })}
        </div>
      </section>

      {/* WE ARE PATTERSON — stats */}
      <section style={{ background: 'var(--surface-subtle)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="pat-container" style={{ paddingTop: 'var(--space-10)', paddingBottom: 'var(--space-10)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-9)', alignItems: 'center' }}>
          <div>
            <div className="pat-eyebrow">We are Patterson</div>
            <h2 style={{ margin: '10px 0 14px' }}>Much more than a distributor — an indispensable partner.</h2>
            <p style={{ fontSize: 'var(--fs-body)' }}>
              Patterson strengthens the oral and animal health markets in North America and the United Kingdom. From small private practices to large group networks and production operations, we guide our customers with bold solutions and a personal touch.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-7)', marginTop: 'var(--space-6)' }}>
              <Stat value="86M" label="U.S. households have pets" tone="sky" />
              <Stat value="90%" label="of adults value keeping their mouth healthy" tone="navy" />
              <Stat value="250M" label="tons of protein needed by 2050" tone="teal" />
            </div>
          </div>
          <div style={{ aspectRatio: '5 / 6', borderRadius: 'var(--radius-xl)', background: 'var(--pat-navy)', boxShadow: 'var(--shadow-lg)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', padding: 'var(--space-6)' }}>
              <div style={{ color: 'rgba(255,255,255,0.92)' }}>
                <div style={{ fontSize: 'var(--fs-h3)', fontWeight: 700, color: '#fff' }}>Trusted Expertise.<br />Unrivaled Support.</div>
                <div style={{ fontSize: 'var(--fs-xs)', marginTop: 10, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono)' }}>[ brand photography placeholder ]</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="pat-container" style={{ paddingTop: 'var(--space-10)', paddingBottom: 'var(--space-10)' }}>
        <div style={{ maxWidth: 720, marginInline: 'auto', textAlign: 'center' }}>
          <div className="pat-eyebrow">What we do</div>
          <h2 style={{ margin: '10px 0 22px' }}>We deliver every day across three capabilities</h2>
        </div>
        <div style={{ maxWidth: 720, marginInline: 'auto' }}>
          <Tabs tabs={['Service', 'Logistics', 'Products']} value={cap} onChange={setCap} style={{ justifyContent: 'center' }} />
          <p style={{ fontSize: 'var(--fs-lead)', textAlign: 'center', marginTop: 'var(--space-6)', color: 'var(--text-body)' }}>{capabilities[cap]}</p>
        </div>
      </section>

      {/* NEWS */}
      <section style={{ background: 'var(--surface-subtle)', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="pat-container" style={{ paddingTop: 'var(--space-9)', paddingBottom: 'var(--space-9)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-6)' }}>
            <h2 style={{ margin: 0 }}>In the news</h2>
            <Button variant="outline" size="sm" onClick={() => onNavigate('newsroom')}>More content</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-5)' }}>
            {news.map((n) => (
              <Card key={n.title} interactive onClick={() => onNavigate('newsroom')} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Badge tone="sky">{n.tag}</Badge>
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{n.date}</span>
                </div>
                <h3 style={{ margin: 0, fontSize: 'var(--fs-h4)', lineHeight: 1.25 }}>{n.title}</h3>
                <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('newsroom'); }} style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 'auto' }}>
                  Read more <IconArrow size={15} />
                </a>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--pat-sky)', color: 'var(--pat-navy)' }}>
        <div className="pat-container" style={{ paddingTop: 'var(--space-9)', paddingBottom: 'var(--space-9)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <h2 style={{ margin: '0 0 6px', color: 'var(--pat-navy)' }}>Work with us</h2>
            <p style={{ margin: 0, color: 'var(--pat-navy)', opacity: 0.85, maxWidth: 560 }}>Together, we are transforming the way care is delivered to people and animals.</p>
          </div>
          <Button variant="primary" size="lg" iconRight={<IconArrow size={18} />} onClick={() => onNavigate('join-us')}>Join us</Button>
        </div>
      </section>
    </main>
  );
}
window.HomeScreen = HomeScreen;
