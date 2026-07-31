import React from 'react';

/**
 * Horizontal tabs with a sky underline indicator. Controlled via `value`
 * or uncontrolled via `defaultValue`.
 */
export function Tabs({ tabs = [], value, defaultValue, onChange, style }) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue ?? (tabs[0] && (typeof tabs[0] === 'string' ? tabs[0] : tabs[0].value)));
  const active = isControlled ? value : internal;

  const select = (val) => {
    if (!isControlled) setInternal(val);
    onChange && onChange(val);
  };

  return (
    <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-subtle)', ...style }}>
      {tabs.map((t) => {
        const val = typeof t === 'string' ? t : t.value;
        const lbl = typeof t === 'string' ? t : t.label;
        const on = active === val;
        return (
          <button
            key={val}
            onClick={() => select(val)}
            onMouseEnter={(e) => { if (!on) e.currentTarget.style.color = 'var(--pat-navy)'; }}
            onMouseLeave={(e) => { if (!on) e.currentTarget.style.color = 'var(--text-muted)'; }}
            style={{
              appearance: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '12px 16px',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--fs-body)',
              fontWeight: on ? 'var(--fw-bold)' : 'var(--fw-medium)',
              color: on ? 'var(--pat-navy)' : 'var(--text-muted)',
              borderBottom: `3px solid ${on ? 'var(--pat-sky)' : 'transparent'}`,
              marginBottom: '-1px',
              transition: 'color var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)',
            }}
          >
            {lbl}
          </button>
        );
      })}
    </div>
  );
}
