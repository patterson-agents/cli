import React from 'react';

/**
 * Small status/label badge. Tone draws from the brand + semantic palette.
 */
export function Badge({ children, tone = 'navy', solid = false, style, ...rest }) {
  const tones = {
    navy:    { fg: 'var(--pat-navy)', bg: 'var(--pat-navy-10)', solidBg: 'var(--pat-navy)' },
    sky:     { fg: 'var(--pat-blue)', bg: 'var(--pat-sky-10)', solidBg: 'var(--pat-sky)' },
    green:   { fg: '#3d7a1f', bg: '#eef6e6', solidBg: 'var(--pat-green)' },
    teal:    { fg: 'var(--pat-teal)', bg: 'var(--pat-success-bg)', solidBg: 'var(--pat-teal)' },
    purple:  { fg: 'var(--pat-purple)', bg: '#efe9f6', solidBg: 'var(--pat-purple)' },
    gray:    { fg: 'var(--pat-gray-600)', bg: 'var(--pat-gray-100)', solidBg: 'var(--pat-gray-600)' },
    warning: { fg: 'var(--pat-warning)', bg: 'var(--pat-warning-bg)', solidBg: 'var(--pat-warning)' },
    danger:  { fg: 'var(--pat-danger)', bg: 'var(--pat-danger-bg)', solidBg: 'var(--pat-danger)' },
  };
  const t = tones[tone] || tones.navy;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--fs-xs)',
        fontWeight: 'var(--fw-bold)',
        letterSpacing: 'var(--ls-wide)',
        textTransform: 'uppercase',
        padding: '4px 10px',
        borderRadius: 'var(--radius-pill)',
        color: solid ? '#fff' : t.fg,
        background: solid ? t.solidBg : t.bg,
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
