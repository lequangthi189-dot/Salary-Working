import React from 'react'

/* Buttons in Salary-Working are flat, 8px, semibold, full-bleed inside forms.
   Variants are lifted 1:1 from src/styles.css — do not invent new ones.
     primary   button[type=submit] / .btn-addshift — the blue gradient action
     received  .btn-received — animated blue/black, ONLY on payday
     save      .btn-save (accent) / cancel .btn-cancel (danger) — inline row edit
     link      .link — text button (Forgot password, mode switch)
     filter    .shift-filter-btn — chip, use FilterTabs for the group */
const BASE = {
  font: 'inherit',
  fontWeight: 'var(--weight-semibold)',
  cursor: 'pointer',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-on-accent)',
  transition: 'background var(--duration-base) var(--ease-standard), border-color var(--duration-base) var(--ease-standard), opacity var(--duration-base) var(--ease-standard)'
}

const VARIANTS = {
  primary: { background: 'linear-gradient(135deg, var(--sw-blue-500), var(--sw-blue-700))', padding: '0.7rem 1rem' },
  received: {
    background: 'linear-gradient(270deg, #38a0ff, #0a1d38, #1273e6, #0a1d38)',
    backgroundSize: '300% 300%',
    boxShadow: 'var(--shadow-received-glow)',
    padding: '0.7rem 1rem'
  },
  save: { background: 'var(--accent)', borderRadius: 'var(--radius-xs)', padding: '0.4rem 0.9rem' },
  cancel: { background: 'var(--danger)', borderRadius: 'var(--radius-xs)', padding: '0.4rem 0.9rem' },
  link: {
    background: 'none',
    color: 'var(--accent)',
    padding: 0,
    fontWeight: 'var(--weight-regular)',
    fontSize: 'var(--text-base)'
  },
  filter: {
    background: 'var(--panel-2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    padding: '0.4rem 0.85rem',
    fontSize: 'var(--text-base)'
  }
}

export function Button({
  variant = 'primary',
  children,
  fullWidth = false,
  active = false,
  disabled = false,
  style,
  ...rest
}) {
  const activeStyle =
    variant === 'filter' && active
      ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--text-on-accent)' }
      : null
  return (
    <button
      type="button"
      disabled={disabled}
      style={{
        ...BASE,
        ...VARIANTS[variant],
        ...activeStyle,
        ...(fullWidth ? { width: '100%' } : null),
        ...(disabled ? { opacity: variant === 'primary' || variant === 'received' ? 0.45 : 0.6, cursor: 'default' } : null),
        ...style
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
