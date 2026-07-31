import React from 'react';

/** Toggle switch; sky track when on. Controlled or uncontrolled. */
export function Switch({ label, checked, defaultChecked, onChange, disabled = false, id, style, ...rest }) {
  const swId = id || `sw-${Math.random().toString(36).slice(2, 8)}`;
  const isControlled = checked !== undefined;
  const [internal, setInternal] = React.useState(!!defaultChecked);
  const on = isControlled ? checked : internal;

  const toggle = (e) => {
    if (disabled) return;
    if (!isControlled) setInternal(e.target.checked);
    onChange && onChange(e);
  };

  return (
    <label htmlFor={swId} style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style }}>
      <input id={swId} type="checkbox" checked={isControlled ? checked : undefined} defaultChecked={!isControlled ? defaultChecked : undefined} onChange={toggle} disabled={disabled} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} {...rest} />
      <span style={{
        width: 46, height: 26, flex: 'none', borderRadius: 'var(--radius-pill)',
        background: on ? 'var(--pat-sky)' : 'var(--border-strong)',
        padding: 3, boxSizing: 'border-box',
        transition: 'background var(--dur-base) var(--ease-standard)',
      }}>
        <span style={{
          display: 'block', width: 20, height: 20, borderRadius: '50%', background: '#fff',
          boxShadow: 'var(--shadow-sm)',
          transform: on ? 'translateX(20px)' : 'translateX(0)',
          transition: 'transform var(--dur-base) var(--ease-out)',
        }} />
      </span>
      {label && <span style={{ fontSize: 'var(--fs-body)', color: 'var(--text-body)' }}>{label}</span>}
    </label>
  );
}
