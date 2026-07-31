import React from 'react';

/**
 * Patterson action button — production-accurate.
 *
 * Verified against the live theme (theme-styles.min.css):
 *   .btn            border-radius 5px, 15px/30px padding, 15px/600
 *   .btn-primary    navy #003767 → hover #315D83 (a LIGHTER NAVY, not sky)
 *   .btn-secondary  filled light blue #6DCFF6 with a navy label → #96DBF6
 * `pill` opts into this design system's rounder convention, which does
 * not exist in production. `outline` / `ghost` / `onDark` are system
 * additions for surfaces production does not cover.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  pill = false,
  fullWidth = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  type = 'button',
  onClick,
  style,
  ...rest
}) {
  const sizes = {
    sm: { padding: '9px 20px', font: 'var(--fs-sm)' },
    md: { padding: 'var(--btn-pad-y) var(--btn-pad-x)', font: 'var(--pt-btn-size)' },
    lg: { padding: '18px 36px', font: 'var(--fs-h5)' },
  };
  const s = sizes[size] || sizes.md;

  const variants = {
    primary: {
      background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-fg)',
      border: '0', hover: 'var(--btn-primary-bg-hover)',
      disabledBg: 'var(--btn-primary-bg-disabled)',
    },
    secondary: {
      background: 'var(--btn-secondary-bg)', color: 'var(--btn-secondary-fg)',
      border: '0', hover: 'var(--btn-secondary-bg-hover)',
      disabledBg: 'var(--btn-secondary-bg-disabled)',
    },
    sky: {
      background: 'var(--pat-sky)', color: '#fff', border: '0',
      hover: 'var(--pat-sky-80)', disabledBg: 'var(--pat-sky-40)',
    },
    outline: {
      background: 'transparent', color: 'var(--pat-navy)',
      border: 'var(--border-w-thick) solid var(--pat-navy)',
      hover: 'var(--pat-navy)', hoverFg: '#fff',
    },
    ghost: {
      background: 'transparent', color: 'var(--pat-navy)',
      border: 'var(--border-w-thick) solid transparent',
      hover: 'var(--pat-navy-10)',
    },
    onDark: {
      background: '#fff', color: 'var(--pat-navy)', border: '0',
      hover: 'var(--pat-blue-light)',
    },
  };
  const v = variants[variant] || variants.primary;

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: s.padding,
    width: fullWidth ? '100%' : 'auto',
    fontFamily: 'var(--font-sans)',
    fontSize: s.font,
    fontWeight: 'var(--pt-btn-weight)',
    lineHeight: 'var(--pt-btn-lh)',
    letterSpacing: 'var(--ls-normal)',
    textAlign: 'center',
    textDecoration: 'none',
    borderRadius: pill ? 'var(--radius-pill)' : 'var(--radius-btn)',
    background: disabled && v.disabledBg ? v.disabledBg : v.background,
    color: v.color,
    border: v.border,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled && !v.disabledBg ? 0.45 : 1,
    transition: 'background-color var(--dur-prod-base) var(--ease-prod), border-color var(--dur-prod-base) var(--ease-prod), color var(--dur-prod-base) var(--ease-prod)',
    whiteSpace: 'nowrap',
    ...style,
  };

  const hoverIn = (e) => {
    if (disabled) return;
    const el = e.currentTarget;
    el.style.background = v.hover;
    if (v.hoverFg) el.style.color = v.hoverFg;
    if (variant === 'outline') el.style.borderColor = 'var(--pat-navy)';
  };
  const hoverOut = (e) => {
    if (disabled) return;
    const el = e.currentTarget;
    el.style.background = v.background;
    el.style.color = v.color;
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={base}
      onMouseEnter={hoverIn}
      onMouseLeave={hoverOut}
      onFocus={(e) => { e.currentTarget.style.boxShadow = 'var(--ring-focus)'; }}
      onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
      {...rest}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}
