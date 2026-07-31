/* Storefront homepage body — hero, quick links, support, products,
   manufacturers, Advantage Rewards, testimonial, account CTA. */
function StoreHome({ brand, onAdd }) {
  const DS = window.PattersonCompaniesDesignSystem_3534f9;
  const { Button, Card, Badge } = DS;
  const { SArrow, SBox, SHeadset, SAward, STag, SSparkle } = window;

  const quickIcons = [SBox, SSparkle, SSparkle, SBox, SHeadset, SAward];

  return (
    <main>
      {/* HERO */}
      <section style={{ background: 'var(--pat-navy)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        {/* Wave watermark — production uses NO gradients. */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('../../assets/brand/wave-bg-navy.png')", backgroundSize: 'cover', backgroundPosition: 'right top', opacity: 0.5 }} />
        <div className="pat-container" style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 'var(--space-8)', alignItems: 'center', paddingTop: 'var(--space-9)', paddingBottom: 'var(--space-9)' }}>
          <div>
            <div className="pat-eyebrow" style={{ color: 'var(--pat-sky)' }}>{brand.heroEyebrow}</div>
            <h1 style={{ color: '#fff', fontSize: 'var(--fs-h1)', margin: '12px 0 14px', maxWidth: '16ch' }}>{brand.heroTitle}</h1>
            <p style={{ fontSize: 'var(--fs-lead)', color: 'rgba(255,255,255,0.84)', maxWidth: 520 }}>{brand.heroBody}</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
              <Button variant="sky" size="lg" iconRight={<SArrow size={18} />}>Shop now</Button>
              <Button variant="onDark" size="lg">Sign in</Button>
            </div>
          </div>
          <div style={{ aspectRatio: '4 / 3', borderRadius: 'var(--radius-xl)', background: 'var(--pat-navy)', boxShadow: 'var(--shadow-xl)', display: 'flex', alignItems: 'flex-end', padding: 'var(--space-6)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'rgba(255,255,255,0.85)' }}>[ {brand.sub.toLowerCase()} hero photography placeholder ]</span>
          </div>
        </div>
      </section>

      {/* QUICK LINKS */}
      <section className="pat-container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-8)' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, marginInline: 'auto', marginBottom: 'var(--space-6)' }}>
          <div className="pat-eyebrow">Here to support your success</div>
          <h2 style={{ margin: '8px 0 0' }}>Where do you want to start?</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
          {brand.quickLinks.map((q, i) => {
            const I = quickIcons[i % quickIcons.length];
            return (
              <Card key={q} interactive onClick={onAdd} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ width: 46, height: 46, flex: 'none', borderRadius: 'var(--radius-md)', background: 'var(--pat-sky-10)', color: 'var(--pat-sky)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><I size={24} /></span>
                <span style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: 'var(--fs-body)' }}>{q}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--pat-sky)', display: 'flex' }}><SArrow size={18} /></span>
              </Card>
            );
          })}
        </div>
      </section>

      {/* SUPPORT BANNER */}
      <section style={{ background: 'var(--pat-sky)', color: 'var(--pat-navy)' }}>
        <div className="pat-container" style={{ display: 'flex', alignItems: 'center', gap: 20, justifyContent: 'space-between', flexWrap: 'wrap', paddingTop: 'var(--space-7)', paddingBottom: 'var(--space-7)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'rgba(0,55,103,0.12)', color: 'var(--pat-navy)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><SHeadset size={30} /></span>
            <div>
              <h3 style={{ margin: '0 0 2px', color: 'var(--pat-navy)' }}>Need service or equipment repair?</h3>
              <p style={{ margin: 0, color: 'var(--pat-navy)', opacity: 0.85, maxWidth: 620 }}>Installation, training, repair or preventive maintenance — our highly-skilled techs are ready to help in person, over the phone or online.</p>
            </div>
          </div>
          <Button variant="primary" size="lg" iconRight={<SArrow size={18} />}>Learn about support</Button>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="pat-container" style={{ paddingTop: 'var(--space-9)', paddingBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-6)' }}>
          <div>
            <div className="pat-eyebrow">Products</div>
            <h2 style={{ margin: '8px 0 0' }}>New &amp; featured products</h2>
          </div>
          <Button variant="outline" size="sm" iconRight={<SArrow size={16} />}>Shop all products</Button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-5)' }}>
          {brand.products.map((p) => (
            <Card key={p.name} interactive style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 0, overflow: 'hidden' }}>
              <div style={{ aspectRatio: '4 / 3', background: 'var(--surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <span style={{ position: 'absolute', top: 12, left: 12 }}><Badge tone={p.tone} solid>{p.tag}</Badge></span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>[ product image ]</span>
              </div>
              <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 'var(--fs-h5)', lineHeight: 1.3 }}>{p.name}</h3>
                <p style={{ margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', flex: 1 }}>{p.note}</p>
                <Button variant="outline" size="sm" fullWidth onClick={onAdd} style={{ marginTop: 6 }}>Add to cart</Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* MANUFACTURERS */}
      <section style={{ background: 'var(--surface-subtle)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="pat-container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-8)' }}>
          <h2 style={{ margin: '0 0 var(--space-5)', textAlign: 'center' }}>Shop featured manufacturers</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
            {brand.manufacturers.map((m) => (
              <Card key={m} interactive style={{ height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: 'var(--fs-h4)', color: 'var(--pat-navy)', letterSpacing: '-0.01em' }}>{m}</span>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ADVANTAGE REWARDS */}
      <section className="pat-container" style={{ paddingTop: 'var(--space-9)', paddingBottom: 'var(--space-9)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 'var(--space-8)', alignItems: 'center' }}>
          <div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Badge tone="sky" solid>Advantage Rewards</Badge></span>
            <h2 style={{ margin: '14px 0 12px' }}>Get rewarded for what you already buy</h2>
            <p style={{ fontSize: 'var(--fs-body)' }}>As a valued customer, you earn Advantage Dollars on everyday purchases — and apply them to equipment, software, support and more.</p>
            <div style={{ marginTop: 'var(--space-5)' }}><Button variant="primary" size="lg" iconRight={<SArrow size={18} />}>Enroll to start saving</Button></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
            {[
              { t: 'Savings', icon: STag, items: ['Technical support savings', 'Exclusive promotions', 'Service discounts'] },
              { t: 'Rewards', icon: SAward, items: ['Earn Advantage Dollars', 'Apply to equipment', 'Apply to software & support'] },
              { t: 'Service', icon: SHeadset, items: ['Priority scheduling', 'Member-only support line', 'Superior response time'] },
            ].map((col) => {
              const I = col.icon;
              return (
                <Card key={col.t} accent="sky" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span style={{ color: 'var(--pat-sky)', display: 'flex' }}><I size={26} /></span>
                  <div style={{ fontWeight: 700, color: 'var(--text-heading)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)', fontSize: 'var(--fs-xs)' }}>{col.t}</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {col.items.map((it) => <li key={it} style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-body)', display: 'flex', gap: 7, alignItems: 'flex-start' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--pat-sky)', marginTop: 7, flex: 'none' }} />{it}</li>)}
                  </ul>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section style={{ background: 'var(--pat-navy)', color: '#fff' }}>
        <div className="pat-container" style={{ paddingTop: 'var(--space-9)', paddingBottom: 'var(--space-9)', textAlign: 'center', maxWidth: 860, marginInline: 'auto' }}>
          <div style={{ fontSize: 'var(--fs-h2)', color: '#fff', lineHeight: 1.3, fontWeight: 600, letterSpacing: 'var(--ls-snug)' }}>
            <span style={{ color: 'var(--pat-sky)' }}>“</span>{brand.testimonial.quote}<span style={{ color: 'var(--pat-sky)' }}>”</span>
          </div>
          <div style={{ marginTop: 'var(--space-5)', color: 'rgba(255,255,255,0.8)' }}>
            <b style={{ color: '#fff' }}>{brand.testimonial.who}</b> · {brand.testimonial.where}
          </div>
        </div>
      </section>

      {/* ACCOUNT CTA */}
      <section className="pat-container" style={{ paddingTop: 'var(--space-9)', paddingBottom: 'var(--space-9)' }}>
        <Card style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-7)', alignItems: 'center', padding: 'var(--space-8)' }}>
          <div>
            <h2 style={{ margin: '0 0 10px' }}>Create an online account for ease and convenience</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Shop thousands of products', 'Get exclusive online promotions and pricing', 'Create your own personalized dashboard', 'Access your account from anywhere'].map((b) => (
                <li key={b} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 'var(--fs-body)', color: 'var(--text-heading)' }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--pat-sky)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </span>{b}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
            <Button variant="primary" size="lg" iconRight={<SArrow size={18} />}>Create my account</Button>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>Already have an account? <a href="#" onClick={(e) => e.preventDefault()} style={{ fontWeight: 600 }}>Sign in</a></span>
          </div>
        </Card>
      </section>
    </main>
  );
}
window.StoreHome = StoreHome;
