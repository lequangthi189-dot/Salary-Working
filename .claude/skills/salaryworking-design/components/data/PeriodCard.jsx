import React from 'react'

/* A pay period in the list: label, span, hours, money, and whether it landed.
   Whole card is a button — tapping it opens that period's charts and timesheet.
   From src/styles.css .period-card / .period-total / .received-badge. */
const money = (n, locale = 'vi-VN') => new Intl.NumberFormat(locale).format(Math.round(n || 0))
const hours = (n) => (Math.round((n || 0) * 100) / 100).toFixed(2).replace(/\.00$/, '')

export function PeriodCard({ label, dateRange, meta, pay, received = false, receivedOn, currencyLocale = 'vi-VN', onClick, style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.3rem',
        width: '100%',
        textAlign: 'left',
        font: 'inherit',
        background: 'var(--card-bg)',
        backgroundImage: 'var(--card-bg-image)',
        border: 'var(--card-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--card-shadow)',
        padding: '0.75rem 0.85rem',
        marginBottom: '0.6rem',
        color: 'var(--text)',
        cursor: 'pointer',
        transition: 'var(--transition-surface)',
        ...style
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <span style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-md)' }}>{label}</span>
        {received ? (
          <span style={{ color: 'var(--status-received)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-base)', whiteSpace: 'nowrap' }}>✓ Received</span>
        ) : (
          <span style={{ fontWeight: 'var(--weight-bold)', fontVariantNumeric: 'var(--numeric)' }}>{money(pay, currencyLocale)}</span>
        )}
      </span>
      {meta && <span style={{ color: 'var(--muted)', fontSize: 'var(--text-base)', fontVariantNumeric: 'var(--numeric)' }}>{meta}</span>}
      <span style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', fontVariantNumeric: 'var(--numeric)' }}>
        {dateRange}
        {received && receivedOn ? ' · Received on ' + receivedOn : ''}
      </span>
    </button>
  )
}
