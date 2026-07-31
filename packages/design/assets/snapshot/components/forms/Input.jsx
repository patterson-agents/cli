import React from 'react';

/**
 * Text input with label, optional helper/error text and sky focus ring.
 */
export function Input({
  label,
  id,
  type = 'text',
  placeholder,
  value,
  defaultValue,
  onChange,
  helper,
  error,
  disabled = false,
  required = false,
  iconLeft = null,
  style,
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const inputId = id || `inp-${Math.random().toString(36).slice(2, 8)}`;
  const borderColor = error ? 'var(--pat-danger)' : focused ? 'var(--pat-sky)' : 'var(--border-default)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', ...style }}>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-heading)' }}>
          {label}{required && <span style={{ color: 'var(--pat-danger)' }}> *</span>}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {iconLeft && <span style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)', display: 'flex' }}>{iconLeft}</span>}
        <input
          id={inputId}
          type={type}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          disabled={disabled}
          required={required}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            height: 'var(--control-h-md)',
            padding: iconLeft ? '0 14px 0 42px' : '0 14px',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--fs-body)',
            color: 'var(--text-heading)',
            background: disabled ? 'var(--surface-muted)' : 'var(--surface-card)',
            border: `1.5px solid ${borderColor}`,
            borderRadius: 'var(--radius-md)',
            outline: 'none',
            boxShadow: focused && !error ? 'var(--ring-focus)' : 'none',
            transition: 'border-color var(--dur-fast) var(--ease-standard), box-shadow var(--dur-fast) var(--ease-standard)',
            boxSizing: 'border-box',
          }}
          {...rest}
        />
      </div>
      {(helper || error) && (
        <span style={{ fontSize: 'var(--fs-xs)', color: error ? 'var(--pat-danger)' : 'var(--text-muted)' }}>{error || helper}</span>
      )}
    </div>
  );
}
