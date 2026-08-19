import React from 'react'

/* The single most important object in the product: "this is what the period owes
   me". Centred, uppercase green label, 2.2rem figure, then the arithmetic that
   produced it in one muted line. From src/components/MonthStats.jsx + MonthStats.css. */
const money = (n, locale = 'vi-VN') => new Intl.NumberFormat(locale).format(Math.round(n || 0))
const hours = (n) => (Math.round((n || 0) * 100) / 100).toFixed(2).replace(/\.00$/, '')

export function SalaryHero({
  label = 'Salary this month:',
  expectedLabel = 'Expected',
  lateLabel = 'Late',
  deductionLabel = 'Compensation',
  net,
  expected,
  latePenalty,
  deduction,
  fxNote,
  currencyLocale = 'vi-VN',
  style
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.25rem',
        background: 'var(--hero-fill, var(--sw-slate-900))',
        backgroundImage: 'var(--glass-hero-gradient, none)',
        border: 'var(--border-width-emphasis) solid var(--pay-positive)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.15rem 1.3rem',
        textAlign: 'center',
        boxShadow: 'var(--card-shadow)',
        ...style
      }}
    >
      <span style={{ color: 'var(--pay-positive)', fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-sm)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-hero)' }}>
        {label}
      </span>
      <span style={{ color: 'var(--text-value)', fontWeight: 'var(--weight-heavy)', fontSize: 'var(--text-5xl)', lineHeight: 'var(--leading-tight)', fontVariantNumeric: 'var(--numeric)', overflowWrap: 'anywhere' }}>
        {money(net, currencyLocale)}
      </span>
      <span style={{ marginTop: '0.1rem', color: 'var(--sw-slate-350)', fontSize: 'var(--text-sm)', fontVariantNumeric: 'var(--numeric)' }}>
        ({expectedLabel}: {money(expected, currencyLocale)}
        {latePenalty > 0 && (
          <>
            <span style={{ opacity: 0.5 }}> | </span>
            <span style={{ color: 'var(--pay-negative)' }}>{lateLabel}: −{money(latePenalty, currencyLocale)}</span>
          </>
        )}
        {deduction > 0 && (
          <>
            <span style={{ opacity: 0.5 }}> | </span>
            <span style={{ color: 'var(--pay-negative)' }}>{deductionLabel}: −{money(deduction, currencyLocale)}</span>
          </>
        )}
        )
      </span>
      {fxNote && <span style={{ marginTop: '0.2rem', color: 'var(--sw-slate-400)', fontSize: 'var(--text-2xs)' }}>{fxNote}</span>}
    </div>
  )
}
