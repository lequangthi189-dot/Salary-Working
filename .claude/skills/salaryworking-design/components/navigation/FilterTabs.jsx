import React from 'react'

/* Chip row that narrows the shift list (All / Day shifts / Night shifts) or picks a
   week in the period timesheet. Selected chip fills with accent. From
   src/styles.css .shift-filter. */
export function FilterTabs({ options = [], value, onChange, style }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', ...style }}>
      {options.map((opt) => {
        const val = typeof opt === 'string' ? opt : opt.value
        const label = typeof opt === 'string' ? opt : opt.label
        const active = val === value
        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange && onChange(val)}
            style={{
              font: 'inherit',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--weight-semibold)',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              background: active ? 'var(--accent)' : 'var(--panel-2)',
              border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
              color: active ? 'var(--text-on-accent)' : 'var(--text)',
              transition: 'var(--transition-surface)'
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
