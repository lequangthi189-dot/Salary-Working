import React from 'react'

/* Compact summary tile (.stat in src/styles.css): uppercase muted label under a
   1.25rem value. Used in the period summary grid, not in the month block. */
const VALUE_COLOR = { default: 'var(--text)', total: 'var(--accent)', pay: 'var(--green)', negative: 'var(--danger)' }
const BORDER = { default: 'var(--border)', total: 'var(--accent)', pay: 'var(--green)', negative: 'var(--border)' }

export function StatTile({ label, value, variant = 'default', style }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.15rem',
        background: 'var(--panel-2)',
        border: '1px solid ' + BORDER[variant],
        borderRadius: 'var(--radius-md)',
        padding: '0.7rem 0.85rem',
        boxShadow: 'var(--card-shadow)',
        ...style
      }}
    >
      <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', lineHeight: 'var(--leading-tight)', color: VALUE_COLOR[variant], fontVariantNumeric: 'var(--numeric)' }}>{value}</span>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>{label}</span>
    </div>
  )
}
