import React from 'react';

/** Radio button in a RadioGroup. Use within Radio.Group for selection state. */
export function Radio({ label, value, checked, onChange, name, disabled = false, id, style, ...rest }) {
  const rId = id || `rd-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <label htmlFor={rId} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style }}>
      <input id={rId} type="radio" name={name} value={value} checked={checked} onChange={onChange} disabled={disabled} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} {...rest} />
      <span style={{
        width: 20, height: 20, flex: 'none', borderRadius: '50%',
        border: `2px solid ${checked ? 'var(--pat-sky)' : 'var(--border-strong)'}`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all var(--dur-fast) var(--ease-standard)',
      }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--pat-sky)', transform: checked ? 'scale(1)' : 'scale(0)', transition: 'transform var(--dur-fast) var(--ease-out)' }} />
      </span>
      {label && <span style={{ fontSize: 'var(--fs-body)', color: 'var(--text-body)' }}>{label}</span>}
    </label>
  );
}

/** Convenience group: renders radios from options and manages selection. */
Radio.Group = function RadioGroup({ name, value, onChange, options = [], direction = 'column', gap = '12px', style }) {
  return (
    <div role="radiogroup" style={{ display: 'flex', flexDirection: direction, gap, ...style }}>
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.value;
        const lbl = typeof o === 'string' ? o : o.label;
        return <Radio key={val} name={name} value={val} label={lbl} checked={value === val} onChange={() => onChange && onChange(val)} />;
      })}
    </div>
  );
};
