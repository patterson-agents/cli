import React from 'react';

/** Checkbox with brand sky fill when checked. Controlled or uncontrolled. */
export function Checkbox({ label, checked, defaultChecked, onChange, disabled = false, id, style, ...rest }) {
  const cbId = id || `cb-${Math.random().toString(36).slice(2, 8)}`;
  const isControlled = checked !== undefined;
  const [internal, setInternal] = React.useState(!!defaultChecked);
  const on = isControlled ? checked : internal;

  const toggle = (e) => {
    if (disabled) return;
    if (!isControlled) setInternal(e.target.checked);
    onChange && onChange(e);
  };

  return (
    <label htmlFor={cbId} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style }}>
      <input id={cbId} type="checkbox" checked={isControlled ? checked : undefined} defaultChecked={!isControlled ? defaultChecked : undefined} onChange={toggle} disabled={disabled} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} {...rest} />
      <span style={{
        width: 20, height: 20, flex: 'none',
        borderRadius: 'var(--radius-sm)',
        border: `2px solid ${on ? 'var(--pat-sky)' : 'var(--border-strong)'}`,
        background: on ? 'var(--pat-sky)' : 'transparent',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all var(--dur-fast) var(--ease-standard)',
      }}>
        {on && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
      </span>
      {label && <span style={{ fontSize: 'var(--fs-body)', color: 'var(--text-body)' }}>{label}</span>}
    </label>
  );
}
