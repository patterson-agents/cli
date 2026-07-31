/* Newsroom: filterable list of press releases. */
function NewsroomScreen() {
  const DS = window.PattersonCompaniesDesignSystem_3534f9;
  const { Card, Badge, Tabs, Button } = DS;
  const { IconArrow } = window;
  const [filter, setFilter] = React.useState('All');

  const items = [
    { tag: 'Leadership', date: 'Jan 20, 2026', title: 'Patterson announces Senior Vice President of Dental Software' },
    { tag: 'Leadership', date: 'Jan 14, 2026', title: 'Patterson announces Dental President' },
    { tag: 'Corporate', date: 'Jan 12, 2026', title: 'Patterson Companies completes acquisition by Patient Square Capital' },
    { tag: 'Corporate', date: 'Dec 20, 2025', title: 'Shareholders approve acquisition by Patient Square Capital for $31.35 per share in cash' },
    { tag: 'Veterinary', date: 'Dec 18, 2025', title: 'Patterson Veterinary and dvmGRO join forces to support independently owned practices' },
    { tag: 'Dental', date: 'Dec 02, 2025', title: 'Patterson Dental extends strategic relationship with PDS Health' },
    { tag: 'Dental', date: 'Nov 19, 2025', title: 'Patterson Dental announces Eaglesoft and Pearl Second Opinion integration' },
    { tag: 'Corporate', date: 'Nov 05, 2025', title: 'Patterson Companies releases 2024 Corporate Responsibility Report' },
    { tag: 'Veterinary', date: 'Oct 22, 2025', title: 'Patterson Veterinary puts customers first by connecting with new IT service' },
  ];
  const tones = { Leadership: 'purple', Corporate: 'navy', Veterinary: 'teal', Dental: 'sky' };
  const filters = ['All', 'Corporate', 'Dental', 'Veterinary', 'Leadership'];
  const shown = filter === 'All' ? items : items.filter((i) => i.tag === filter);
  const [feature, ...rest] = shown;

  return (
    <main>
      <section style={{ background: 'var(--pat-navy)', color: '#fff' }}>
        <div className="pat-container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-8)' }}>
          <div className="pat-eyebrow" style={{ color: 'var(--pat-sky)' }}>Newsroom</div>
          <h1 style={{ color: '#fff', margin: '12px 0 0' }}>In the news</h1>
        </div>
      </section>

      <div className="pat-container" style={{ paddingTop: 'var(--space-7)', paddingBottom: 'var(--space-10)' }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <Tabs tabs={filters} value={filter} onChange={setFilter} />
        </div>

        {feature && (
          <Card interactive style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 0, overflow: 'hidden', padding: 0, marginBottom: 'var(--space-6)' }}>
            <div style={{ background: 'var(--pat-navy)', minHeight: 240, display: 'flex', alignItems: 'flex-end', padding: 'var(--space-6)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'rgba(255,255,255,0.8)' }}>[ featured image placeholder ]</span>
            </div>
            <div style={{ padding: 'var(--space-7)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Badge tone={tones[feature.tag]}>{feature.tag}</Badge>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{feature.date}</span>
              </div>
              <h2 style={{ margin: 0, fontSize: 'var(--fs-h3)' }}>{feature.title}</h2>
              <a href="#" onClick={(e) => e.preventDefault()} style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>Read the release <IconArrow size={15} /></a>
            </div>
          </Card>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-5)' }}>
          {rest.map((n) => (
            <Card key={n.title} interactive style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Badge tone={tones[n.tag]}>{n.tag}</Badge>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{n.date}</span>
              </div>
              <h3 style={{ margin: 0, fontSize: 'var(--fs-h5)', lineHeight: 1.3, flex: 1 }}>{n.title}</h3>
              <a href="#" onClick={(e) => e.preventDefault()} style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>Read more <IconArrow size={15} /></a>
            </Card>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
          <Button variant="outline">Load more news</Button>
        </div>
      </div>
    </main>
  );
}
window.NewsroomScreen = NewsroomScreen;
