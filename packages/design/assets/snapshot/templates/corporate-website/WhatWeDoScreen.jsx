/* What We Do: page header + three capability sections. */
function WhatWeDoScreen({ onNavigate }) {
  const DS = window.PattersonCompaniesDesignSystem_3534f9;
  const { Button, Card, Stat, Badge } = DS;
  const { IconArrow, IconUsers, IconTruck, IconTooth } = window;

  const sections = [
    {
      id: 'service', eyebrow: 'Service', icon: IconUsers,
      title: 'A personal touch, backed by generations of expertise',
      body: 'Generations of quality customer service define our business operations and our personal interactions. Our representatives know their customers and their markets — guiding practices of every size as an indispensable partner.',
      points: ['Dedicated territory representatives', 'Practice-management software & training', 'Equipment service & technology support'],
    },
    {
      id: 'logistics', eyebrow: 'Logistics', icon: IconTruck,
      title: 'We reach 98% of customers in 1–2 days',
      body: 'From 60 state-of-the-art fulfillment centers located strategically across North America and the United Kingdom, we deliver the everyday essentials practices depend on — quickly, reliably and sustainably.',
      points: ['60 fulfillment centers', 'Solar-powered facilities', '1-to-2-day standard shipping'],
    },
    {
      id: 'products', eyebrow: 'Products', icon: IconTooth,
      title: 'Everything a practice needs to run productively',
      body: 'From consumable essentials to advanced equipment and software, we provide the technology, products, expertise and solutions needed to deliver exceptional care and drive profitability.',
      points: ['Everyday consumables & essentials', 'Diagnostic & imaging technology', 'Business & clinical software'],
    },
  ];

  return (
    <main>
      <section style={{ background: 'var(--pat-navy)', color: '#fff' }}>
        <div className="pat-container" style={{ paddingTop: 'var(--space-9)', paddingBottom: 'var(--space-9)' }}>
          <div className="pat-eyebrow" style={{ color: 'var(--pat-sky)' }}>What we do</div>
          <h1 style={{ color: '#fff', margin: '12px 0 12px', maxWidth: '18ch' }}>Service, logistics and products — delivered every day.</h1>
          <p style={{ fontSize: 'var(--fs-lead)', color: 'rgba(255,255,255,0.82)', maxWidth: 640 }}>
            We are an international distributor of products, technologies, services and business solutions for the animal and oral health industries.
          </p>
        </div>
      </section>

      {sections.map((s, i) => {
        const I = s.icon;
        const reversed = i % 2 === 1;
        return (
          <section key={s.id} style={{ background: reversed ? 'var(--surface-subtle)' : '#fff', borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="pat-container" style={{ paddingTop: 'var(--space-10)', paddingBottom: 'var(--space-10)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-9)', alignItems: 'center', direction: reversed ? 'rtl' : 'ltr' }}>
              <div style={{ direction: 'ltr' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <span style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--pat-sky-10)', color: 'var(--pat-sky)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><I size={26} /></span>
                  <span className="pat-eyebrow">{s.eyebrow}</span>
                </div>
                <h2 style={{ margin: '0 0 14px' }}>{s.title}</h2>
                <p style={{ fontSize: 'var(--fs-body)' }}>{s.body}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '18px 0 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {s.points.map((pt) => (
                    <li key={pt} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--fs-body)', color: 'var(--text-heading)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--pat-sky)', flex: 'none' }} />{pt}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ direction: 'ltr', aspectRatio: '4 / 3', borderRadius: 'var(--radius-xl)', background: 'var(--pat-navy)', boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'flex-end', padding: 'var(--space-6)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'rgba(255,255,255,0.85)' }}>[ {s.eyebrow.toLowerCase()} photography placeholder ]</span>
              </div>
            </div>
          </section>
        );
      })}

      <section className="pat-container" style={{ paddingTop: 'var(--space-9)', paddingBottom: 'var(--space-9)', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 18px' }}>Ready to partner with Patterson?</h2>
        <Button variant="primary" size="lg" iconRight={<IconArrow size={18} />} onClick={() => onNavigate('join-us')}>Join us</Button>
      </section>
    </main>
  );
}
window.WhatWeDoScreen = WhatWeDoScreen;
