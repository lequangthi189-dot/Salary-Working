import React from 'react'

/* Excel-shaped read-only view — the metaphor users already know from the roster
   taped to the wall. 0.72rem, hairline grid, sticky header, right-aligned tabular
   money, bold footer totals. From src/components/TimesheetTable.jsx. */
const money = (n, locale = 'vi-VN') => new Intl.NumberFormat(locale).format(Math.round(n || 0))
const hours = (n) => (Math.round((n || 0) * 100) / 100).toFixed(2).replace(/\.00$/, '')

export function TimesheetTable({ rows = [], totalHours, totalPay, currencyLocale = 'vi-VN', style }) {
  const cell = { border: '1px solid var(--border)', padding: '0.18rem 0.3rem', textAlign: 'left', whiteSpace: 'nowrap' }
  const payCell = { ...cell, textAlign: 'right', fontVariantNumeric: 'var(--numeric)' }
  return (
    <div style={{ overflowX: 'auto', ...style }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
        <thead>
          <tr>
            <th style={{ ...cell, position: 'sticky', top: 0, background: 'var(--panel)', color: 'var(--muted)', fontWeight: 'var(--weight-semibold)' }}>Date</th>
            <th style={{ ...cell, position: 'sticky', top: 0, background: 'var(--panel)', color: 'var(--muted)', fontWeight: 'var(--weight-semibold)' }}>Actual (in–out)</th>
            <th style={{ ...payCell, position: 'sticky', top: 0, background: 'var(--panel)', color: 'var(--muted)', fontWeight: 'var(--weight-semibold)' }}>Pay</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id != null ? r.id : i} style={i % 2 === 1 ? { background: 'rgba(255,255,255,0.03)' } : null}>
              <td style={{ ...cell, fontVariantNumeric: 'var(--numeric)' }}>{r.date}</td>
              <td style={{ ...cell, fontVariantNumeric: 'var(--numeric)' }}>{r.start}–{r.end || '—'}</td>
              <td style={payCell}>{money(r.pay, currencyLocale)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ ...cell, background: 'var(--panel-2)', fontWeight: 'var(--weight-bold)' }}>Total</td>
            <td style={{ ...cell, background: 'var(--panel-2)', fontWeight: 'var(--weight-bold)', fontVariantNumeric: 'var(--numeric)' }}>{hours(totalHours)} h</td>
            <td style={{ ...payCell, background: 'var(--panel-2)', fontWeight: 'var(--weight-bold)' }}>{money(totalPay, currencyLocale)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
