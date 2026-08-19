import React from 'react'

/* Progress indicator shaped like a button (it is disabled — it reports, it does not
   act). Accent fill sweeps to the percentage, a 3px bar tracks it at the bottom,
   and completion turns green. Indeterminate mode hides the number and sweeps.
   From src/components/ProgressButton.jsx + ProgressButton.css. */
export function ProgressButton({ value = 0, label, indeterminate = false, style }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  const done = !indeterminate && pct >= 100
  return (
    <button
      type="button"
      disabled
      role="status"
      aria-live="polite"
      aria-valuenow={indeterminate ? undefined : pct}
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 220,
        padding: '0.7rem 1.25rem',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--progress-track)',
        backgroundImage: 'var(--card-bg-image)',
        color: 'var(--text)',
        font: 'inherit',
        fontSize: 'var(--text-md)',
        fontWeight: 'var(--weight-semibold)',
        cursor: 'default',
        opacity: 1,
        ...style
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: (indeterminate ? 45 : pct) + '%',
          background: done ? 'color-mix(in srgb, var(--green) 28%, transparent)' : 'var(--progress-fill)',
          transition: 'width var(--duration-progress) var(--ease-standard)',
          pointerEvents: 'none'
        }}
      />
      <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: '0.5rem', lineHeight: 1 }}>
        <span aria-hidden="true" style={{ display: 'inline-flex', fontSize: '1rem', color: done ? 'var(--green)' : 'inherit' }}>{done ? '✓' : '⟳'}</span>
        {label && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
        {!indeterminate && !done && <span style={{ fontVariantNumeric: 'var(--numeric)', opacity: 0.95 }}>{pct}%</span>}
      </span>
      <span aria-hidden="true" style={{ position: 'absolute', left: 0, bottom: 0, height: 3, width: (indeterminate ? 45 : pct) + '%', background: done ? 'var(--green)' : 'var(--progress-bar)', transition: 'width var(--duration-progress) var(--ease-standard)' }} />
    </button>
  )
}
