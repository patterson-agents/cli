import React from 'react';

/** Inline message banner. Tone sets accent + tint; optional title & dismiss. */
export function Alert({ children, tone = 'info', title, onClose, icon, style, ...rest }) {
  const tones = {
    info:    { fg: 'var(--pat-info)', bg: 'var(--pat-info-bg)', bar: 'var(--pat-info)' },
    success: { fg: 'var(--pat-success)', bg: 'var(--pat-success-bg)', bar: 'var(--pat-success)' },
    warning: { fg: 'var(--pat-warning)', bg: 'var(--pat-warning-bg)', bar: 'var(--pat-warning)' },
    danger:  { fg: 'var(--pat-danger)', bg: 'var(--pat-danger-bg)', bar: 'var(--pat-danger)' },
    brand:   { fg: 'var(--pat-navy)', bg: 'var(--pat-navy-10)', bar: 'var(--pat-sky)' },
  };
  const t = tones[tone] || tones.info;
  return (
    <div role="status" style={{
      display: 'flex', gap: '12px', alignItems: 'flex-start',
      background: t.bg,
      borderLeft: `4px solid ${t.bar}`,
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4)',
      ...style,
    }} {...rest}>
      {icon && <span style={{ color: t.fg, display: 'flex', flex: 'none', marginTop: '1px' }}>{icon}</span>}
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: 'var(--fw-bold)', color: 'var(--text-heading)', fontSize: 'var(--fs-body)', marginBottom: children ? '2px' : 0 }}>{title}</div>}
        {children && <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-body)', lineHeight: 'var(--lh-body)' }}>{children}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0, marginTop: '1px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      )}
    </div>
  );
}
