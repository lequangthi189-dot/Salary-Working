import React from 'react'

/* One shift row: times · what was lost · pay · actions. Four-column grid so the
   money column always lines up down the list. Three states carry a frame:
   normal, planned (amber, future roster entry), missing (red, day passed with no
   clock-in). From src/components/ShiftCard.jsx + src/styles.css .shift-card. */
const money = (n, locale = 'vi-VN') => new Intl.NumberFormat(locale).format(Math.round(n || 0))
const hours = (n) => (Math.round((n || 0) * 100) / 100).toFixed(2).replace(/\.00$/, '')

export function ShiftCard({
  start,
  end,
  scheduledStart,
  scheduledEnd,
  pay,
  lostHours = 0,
  lateInHours = 0,
  earlyOutHours = 0,
  state = 'normal',
  currencyLocale = 'vi-VN',
  onEdit,
  onDelete,
  style
}) {
  const noActual = !start || !end
  const frame =
    state === 'planned'
      ? { borderColor: 'var(--status-planned)', background: 'var(--status-planned-fill)' }
      : state === 'missing'
        ? { borderColor: 'var(--status-missing)', borderWidth: 'var(--border-width-emphasis)', background: 'var(--status-missing-fill)', boxShadow: 'var(--shadow-warning-missing)' }
        : null
  const iconBtn = {
    background: 'none',
    border: 'none',
    color: 'var(--muted)',
    fontSize: '1rem',
    lineHeight: 1,
    padding: '0.25rem 0.35rem',
    cursor: 'pointer'
  }
  return (
    <div
      style={{
        background: 'var(--panel-2)',
        backgroundImage: 'var(--card-bg-image)',
        border: '1px solid var(--border)',
        borderLeft: state === 'normal' ? 'var(--shift-card-accent-edge, 1px solid var(--border))' : undefined,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--card-shadow)',
        padding: 'var(--shift-card-padding)',
        display: 'grid',
        gridTemplateColumns: '1.3fr 1.4fr auto auto',
        alignItems: 'center',
        gap: '0.75rem',
        ...frame,
        ...style
      }}
    >
      <div style={{ fontVariantNumeric: 'var(--numeric)', fontWeight: 'var(--weight-semibold)' }}>
        {noActual ? (
          <>
            <span style={{ color: 'var(--muted)' }}>{scheduledStart || '—'}</span>
            <span style={{ color: 'var(--muted)' }}> – </span>
            <span style={{ color: 'var(--muted)' }}>{scheduledEnd || '—'}</span>
          </>
        ) : (
          <>
            <span style={{ color: 'var(--time-in)' }}>{start}</span>
            <span style={{ color: 'var(--muted)' }}> – </span>
            <span style={{ color: 'var(--time-out)' }}>{end}</span>
          </>
        )}
      </div>
      <div style={{ fontSize: 'var(--text-base)' }}>
        {lostHours > 0 && (
          <span style={{ color: 'var(--pay-negative)', fontWeight: 'var(--weight-semibold)' }}>
            Late {hours(lostHours)}h
            {(lateInHours > 0 || earlyOutHours > 0) && (
              <span style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)', opacity: 0.9 }}>
                {lateInHours > 0 && ' · late in ' + hours(lateInHours) + 'h'}
                {earlyOutHours > 0 && ' · left early ' + hours(earlyOutHours) + 'h'}
              </span>
            )}
          </span>
        )}
      </div>
      <div style={{ fontWeight: 'var(--weight-bold)', fontVariantNumeric: 'var(--numeric)', textAlign: 'right' }}>{money(pay, currencyLocale)}</div>
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        <button type="button" aria-label="Edit shift" onClick={onEdit} style={iconBtn}>✎</button>
        <button type="button" aria-label="Delete shift" onClick={onDelete} style={{ ...iconBtn, fontSize: '1.15rem' }}>×</button>
      </div>
    </div>
  )
}
