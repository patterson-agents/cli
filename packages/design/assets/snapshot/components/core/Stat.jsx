import React from 'react';

/**
 * Big-number statistic, as used across Patterson marketing ("86,000,000
 * U.S. households have pets"). Number in sky or navy, label beneath.
 */
export function Stat({ value, label, tone = 'sky', align = 'left', style, ...rest }) {
  const colors = { sky: 'var(--pat-sky)', navy: 'var(--pat-navy)', teal: 'var(--pat-teal)', green: 'var(--pat-green)' };
  return (
    <div style={{ textAlign: align, ...style }} {...rest}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--fs-stat)',
        fontWeight: 'var(--fw-bold)',
        letterSpacing: 'var(--ls-tight)',
        lineHeight: 1,
        color: colors[tone] || colors.sky,
      }}>{value}</div>
      <div style={{
        marginTop: '10px',
        fontSize: 'var(--fs-body)',
        lineHeight: 'var(--lh-snug)',
        color: 'var(--text-body)',
        maxWidth: '22ch',
        marginInline: align === 'center' ? 'auto' : undefined,
      }}>{label}</div>
    </div>
  );
}
