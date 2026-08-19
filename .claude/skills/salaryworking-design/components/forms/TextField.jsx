import React from 'react'

/* Label above, input below, 0.35rem apart — the app's only field pattern
   (src/styles.css `label`). Label is muted 0.85rem; the input takes the page
   background so it reads as a well, not a card. */
export function TextField({
  label,
  type = 'text',
  value,
  onChange,
  hint,
  error,
  numeric = false,
  style,
  inputStyle,
  ...rest
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: 'var(--text-base)', color: 'var(--muted)', minWidth: 0, ...style }}>
      {label}
      <input
        type={type}
        value={value}
        onChange={onChange}
        style={{
          font: 'inherit',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          background: 'var(--input-bg)',
          border: error ? '1px solid var(--danger)' : 'var(--input-border)',
          boxShadow: 'var(--input-shadow)',
          borderRadius: 'var(--input-radius)',
          padding: '0.6rem',
          color: 'var(--text)',
          fontVariantNumeric: numeric ? 'var(--numeric)' : 'normal',
          transition: 'var(--transition-surface)',
          ...inputStyle
        }}
        {...rest}
      />
      {(error || hint) && (
        <span style={{ fontSize: 'var(--text-base)', color: error ? 'var(--danger)' : 'var(--muted)' }}>{error || hint}</span>
      )}
    </label>
  )
}
