import React from 'react'

/* Hidden native input (still tabbable) + drawn 20px box. Ticked = accent fill and
   a white check that scales in over 0.2s. Ported from src/components/Checkbox.jsx
   (.ui-check in src/styles.css). */
export function Checkbox({ checked = false, onChange, label = null, disabled = false, style, ...rest }) {
  return (
    <label
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: 'var(--text-base)',
        color: 'var(--text)',
        cursor: disabled ? 'default' : 'pointer',
        ...style
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, margin: 0, padding: 0, border: 0 }}
        {...rest}
      />
      <span
        aria-hidden="true"
        style={{
          flex: '0 0 auto',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
          borderRadius: 'var(--radius-xs)',
          border: '1px solid ' + (checked ? 'var(--accent)' : 'var(--border)'),
          background: checked ? 'var(--accent)' : 'color-mix(in srgb, var(--text) 8%, transparent)',
          opacity: disabled ? 0.45 : 1,
          transition: 'background var(--duration-base) var(--ease-standard), border-color var(--duration-base) var(--ease-standard)'
        }}
      >
        <svg
          viewBox="0 0 24 24"
          style={{
            width: 13,
            height: 13,
            fill: 'none',
            stroke: 'var(--text-on-accent)',
            strokeWidth: 3.4,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            opacity: checked ? 1 : 0,
            transform: checked ? 'scale(1)' : 'scale(0.6)',
            transition: 'opacity var(--duration-base) var(--ease-standard), transform var(--duration-base) var(--ease-standard)'
          }}
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      {label != null && <span>{label}</span>}
    </label>
  )
}
