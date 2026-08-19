import React from 'react'

/* One day = one card. Header carries date · totals · money, then the shift rows.
   From src/components/Timesheet.jsx + .date-group/.date-header. */
const money = (n, locale = 'vi-VN') => new Intl.NumberFormat(locale).format(Math.round(n || 0))
const hours = (n) => (Math.round((n || 0) * 100) / 100).toFixed(2).replace(/\.00$/, '')

export function DateGroup({ date, totalHours, dayHours = 0, nightHours = 0, lostHours = 0, pay, currencyLocale = 'vi-VN', children, style }) {
  return (
    <section
      style={{
        marginBottom: '1.25rem',
        background: 'var(--card-bg)',
        backgroundImage: 'var(--card-bg-image)',
        border: 'var(--card-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--card-shadow)',
        padding: '0.75rem 0.85rem',
        ...style
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', padding: '0.4rem 0.25rem', borderBottom: '1px solid var(--border)', marginBottom: '0.6rem' }}>
        <span style={{ fontWeight: 'var(--weight-bold)', fontVariantNumeric: 'var(--numeric)' }}>{date}</span>
        <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 'var(--text-base)', fontVariantNumeric: 'var(--numeric)' }}>
          {hours(totalHours)} h
          {dayHours > 0 && ' · Day ' + hours(dayHours) + 'h'}
          {nightHours > 0 && ' · Night ' + hours(nightHours) + 'h'}
          {lostHours > 0 && <span style={{ color: 'var(--pay-negative)', fontWeight: 'var(--weight-semibold)' }}>{' · Late ' + hours(lostHours) + 'h'}</span>}
        </span>
        <span style={{ color: 'var(--pay-positive)', fontWeight: 'var(--weight-bold)', fontVariantNumeric: 'var(--numeric)' }}>{money(pay, currencyLocale)}</span>
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>{children}</div>
    </section>
  )
}
