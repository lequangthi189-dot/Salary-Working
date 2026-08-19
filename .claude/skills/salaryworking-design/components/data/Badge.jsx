import React from 'react'

/* Status chips from the shift list and period list. Each one is a claim about
   truth: planned (amber, from a roster), overdue (red, day passed with no clock-in),
   received (green, user confirmed the money arrived), ocr (machine-read, unverified). */
const KINDS = {
  planned: { color: 'var(--status-planned)', background: 'var(--status-planned-chip)', border: '1px solid var(--status-planned)' },
  overdue: { color: '#fff', background: 'var(--status-overdue)', border: 'none' },
  received: { color: 'var(--status-received)', background: 'transparent', border: 'none', padding: 0 },
  ocr: { color: 'var(--sw-amber-500)', background: 'transparent', border: '1px dashed var(--sw-amber-500)' },
  neutral: { color: 'var(--muted)', background: 'var(--panel-2)', border: '1px solid var(--border)' }
}

export function Badge({ kind = 'neutral', children, style }) {
  return (
    <span
      style={{
        display: 'inline-block',
        marginLeft: '0.4rem',
        padding: '0.05rem 0.45rem',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--weight-bold)',
        borderRadius: 'var(--radius-pill)',
        whiteSpace: 'nowrap',
        ...KINDS[kind],
        ...style
      }}
    >
      {children}
    </span>
  )
}
