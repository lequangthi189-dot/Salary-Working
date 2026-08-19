import React from 'react'

/* 24-hour text field. Deliberately NOT type="time": the browser/OS would render
   AM/PM for some locales, and this product's users read rosters in 24h. Value is
   always "HH:MM"; typing is masked, blur normalises. Ported from
   src/components/TimeInput.jsx. */
const pad = (n) => String(n).padStart(2, '0')

function maskTyping(raw) {
  const d = raw.replace(/\D/g, '').slice(0, 4)
  if (d.length === 0) return ''
  if (d.length === 1) return d
  const hourLen = parseInt(d.slice(0, 2), 10) > 23 ? 1 : 2
  const h = d.slice(0, hourLen)
  const m = d.slice(hourLen, hourLen + 2)
  return m.length === 0 ? h : h + ':' + m
}

function normalize(value) {
  if (!value) return ''
  const [hRaw, mRaw] = value.split(':')
  const h = Math.min(23, parseInt(hRaw, 10) || 0)
  const m = Math.min(59, parseInt(mRaw, 10) || 0)
  return pad(h) + ':' + pad(m)
}

const KIND = {
  actual: { color: 'var(--text)', borderColor: 'var(--border)' },
  in: { color: 'var(--time-in)', borderColor: 'var(--time-in)', fontWeight: 'var(--weight-semibold)' },
  out: { color: 'var(--time-out)', borderColor: 'var(--time-out)', fontWeight: 'var(--weight-semibold)' },
  scheduled: { color: 'var(--time-scheduled)', borderColor: 'var(--border)', borderStyle: 'dashed', fontWeight: 'var(--weight-semibold)' }
}

export function TimeInput({ value = '', onChange, kind = 'actual', label, style, ...rest }) {
  const field = (
    <input
      type="text"
      inputMode="numeric"
      placeholder="HH:MM"
      maxLength={5}
      pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
      value={value}
      onChange={(e) => onChange && onChange(maskTyping(e.target.value))}
      onBlur={(e) => onChange && onChange(normalize(e.target.value))}
      style={{
        font: 'inherit',
        width: '5rem',
        textAlign: 'center',
        fontVariantNumeric: 'var(--numeric)',
        background: 'var(--input-bg)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--input-shadow)',
        borderRadius: 'var(--radius-xs)',
        padding: '0.4rem',
        ...KIND[kind],
        ...style
      }}
      {...rest}
    />
  )
  if (!label) return field
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: 'var(--text-2xs)', color: 'var(--muted)' }}>
      <span>{label}</span>
      {field}
    </label>
  )
}
