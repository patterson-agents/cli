import React from 'react';

/** Styled native select with brand chevron and focus ring. */
export function Select({ label, id, value, defaultValue, onChange, options = [], disabled = false, style, ...rest }) {
  const [focused, setFocused] = React.useState(false);
  const selId = id || `sel-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', ...style }}>
      {label && <label htmlFor={selId} style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-heading)' }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <select
          id={selId}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
            width: '100%',
            height: 'var(--control-h-md)',
            padding: '0 40px 0 14px',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--fs-body)',
            color: 'var(--text-heading)',
            background: disabled ? 'var(--surface-muted)' : 'var(--surface-card)',
            border: `1.5px solid ${focused ? 'var(--pat-sky)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-md)',
            outline: 'none',
            boxShadow: focused ? 'var(--ring-focus)' : 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'border-color var(--dur-fast) var(--ease-standard), box-shadow var(--dur-fast) var(--ease-standard)',
          }}
          {...rest}
        >
          {options.map((o) => {
            const val = typeof o === 'string' ? o : o.value;
            const lbl = typeof o === 'string' ? o : o.label;
            return <option key={val} value={val}>{lbl}</option>;
          })}
        </select>
        <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--pat-navy)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </span>
      </div>
    </div>
  );
}
