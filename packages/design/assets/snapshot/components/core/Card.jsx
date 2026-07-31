import React from 'react';

/**
 * Surface container. Clean white card with soft navy-tinted shadow and a
 * subtle border. Optional accent stripe along the top in a brand color.
 */
export function Card({
  children,
  elevation = 'sm',
  accent = null,
  padding = 'var(--space-5)',
  interactive = false,
  style,
  ...rest
}) {
  const shadows = {
    none: 'none',
    xs: 'var(--shadow-xs)',
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
  };
  const accents = {
    navy: 'var(--pat-navy)', sky: 'var(--pat-sky)', green: 'var(--pat-green)',
    teal: 'var(--pat-teal)', purple: 'var(--pat-purple)',
  };
  return (
    <div
      onMouseEnter={(e) => { if (interactive) { e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; e.currentTarget.style.transform = 'translateY(-3px)'; } }}
      onMouseLeave={(e) => { if (interactive) { e.currentTarget.style.boxShadow = shadows[elevation]; e.currentTarget.style.transform = 'translateY(0)'; } }}
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: shadows[elevation] || shadows.sm,
        borderTop: accent ? `4px solid ${accents[accent] || accent}` : undefined,
        padding,
        transition: 'box-shadow var(--dur-base) var(--ease-standard), transform var(--dur-base) var(--ease-standard)',
        cursor: interactive ? 'pointer' : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
