import React from 'react'

/* Stats tile from the month block: tone-coloured label on top, white figure under.
   Tone is meaning, not decoration — orange totals, green day, blue night, red late.
   From src/components/StatCard.jsx + MonthStats.css. */
const TONE = { orange: 'var(--tone-orange)', green: 'var(--tone-green)', blue: 'var(--tone-blue)', red: 'var(--tone-red)', none: 'var(--muted)' }
const FILL = { orange: 'var(--tone-orange-fill, var(--sw-slate-900))', green: 'var(--tone-green-fill, var(--sw-slate-900))', blue: 'var(--tone-blue-fill, var(--sw-slate-900))', red: 'var(--tone-red-fill, var(--sw-slate-900))', none: 'var(--sw-slate-900)' }

export function StatCard({ title, value, tone = 'none', style }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.3rem',
        minWidth: 0,
        background: FILL[tone],
        border: '1px solid var(--sw-slate-700)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--card-shadow)',
        padding: '0.85rem 0.5rem',
        textAlign: 'center',
        transition: 'var(--transition-surface)',
        ...style
      }}
    >
      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: TONE[tone], maxWidth: '100%', overflowWrap: 'anywhere' }}>{title}:</span>
      <span style={{ color: 'var(--text-value)', fontWeight: 'var(--weight-heavy)', fontSize: 'var(--text-4xl)', lineHeight: 'var(--leading-tight)', fontVariantNumeric: 'var(--numeric)', maxWidth: '100%', overflowWrap: 'anywhere' }}>{value}</span>
    </div>
  )
}
