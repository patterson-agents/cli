import React from 'react';

/**
 * Circular icon-only button. Pass an icon (SVG / glyph) as children.
 * Sized to meet the 44px hit-target minimum at md.
 */
export function IconButton({
  children,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  label,
  onClick,
  style,
  ...rest
}) {
  const dims = { sm: 34, md: 44, lg: 54 };
  const d = dims[size] || dims.md;

  const variants = {
    solid:   { background: 'var(--pat-navy)', color: '#fff' },
    sky:     { background: 'var(--pat-sky)', color: '#fff' },
    ghost:   { background: 'transparent', color: 'var(--pat-navy)' },
    subtle:  { background: 'var(--pat-navy-10)', color: 'var(--pat-navy)' },
  };
  const v = variants[variant] || variants.ghost;

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={(e) => { if (!disabled && variant === 'ghost') e.currentTarget.style.background = 'var(--pat-navy-10)'; }}
      onMouseLeave={(e) => { if (variant === 'ghost') e.currentTarget.style.background = 'transparent'; }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: d,
        height: d,
        borderRadius: 'var(--radius-pill)',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'background var(--dur-fast) var(--ease-standard)',
        ...v,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
