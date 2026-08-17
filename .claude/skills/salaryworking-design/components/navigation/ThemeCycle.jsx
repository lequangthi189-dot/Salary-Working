import React from 'react'

/* One-knob cycler used for both the theme (dark → glass → neumorph) and the
   language (vi → en → us → au): swatch/flag + the name, tap to advance. Theme
   names are always in English, whatever the app language. From
   src/components/ThemeToggle.jsx / LangCycle.jsx. */
const SWATCH = {
  dark: { background: 'linear-gradient(135deg, #14293c, #0a1929)' },
  glass: { background: 'linear-gradient(135deg, #a855f7, #22d3ee 55%, #ec4899)' },
  neumorph: { background: '#e0e5ec', boxShadow: 'inset 2px 2px 3px #bcc3ce, inset -2px -2px 3px #ffffff' }
}
const THEME_NAMES = { dark: 'Sleek Dark', glass: 'Glassmorphism', neumorph: 'Soft UI' }

export function ThemeCycle({ value = 'dark', onChange, order = ['dark', 'glass', 'neumorph'], label, swatch, icon, showLabel = true, style }) {
  const next = () => onChange && onChange(order[(order.indexOf(value) + 1) % order.length])
  return (
    <button
      type="button"
      onClick={next}
      title={label || THEME_NAMES[value] || value}
      aria-label={label || THEME_NAMES[value] || value}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        font: 'inherit',
        fontSize: 'var(--text-base)',
        fontWeight: 'var(--weight-semibold)',
        color: 'var(--text)',
        background: 'var(--panel-2)',
        backgroundImage: 'var(--card-bg-image)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        boxShadow: 'var(--button-shadow)',
        padding: showLabel ? '0.4rem 0.7rem' : '0.4rem',
        cursor: 'pointer',
        ...style
      }}
    >
      {icon || (
        <span style={{ display: 'inline-block', width: 20, height: 20, borderRadius: 'var(--radius-xs)', border: '1px solid rgba(127,127,127,0.3)', flex: 'none', ...(swatch || SWATCH[value] || null) }} />
      )}
      {showLabel && <span style={{ whiteSpace: 'nowrap' }}>{label || THEME_NAMES[value] || value}</span>}
    </button>
  )
}
