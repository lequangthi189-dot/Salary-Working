import React from 'react'

/* Full-screen boot loader: a bouncing cyan ball with its shadow, plus a plain
   label. The only "personality" animation in the product. From
   src/components/Loader.jsx + Loader.css. */
export function Loader({ label = 'Loading…', overlay = false, style }) {
  const inner = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem', ...style }}>
      <div style={{ position: 'relative', width: 148, height: 100 }}>
        <span style={{ position: 'absolute', top: 0, left: '50%', marginLeft: '-0.5em', width: '1em', height: '1em', borderRadius: '50%', backgroundColor: 'var(--loader-ball)', animation: 'sw-ball 1.2s infinite cubic-bezier(0.3,0.06,0.4,1)' }} />
        <span style={{ position: 'absolute', bottom: 0, left: '50%', marginLeft: '-0.5em', width: '1em', height: '0.25em', borderRadius: '50%', backgroundColor: 'var(--loader-ball)', opacity: 0.3, animation: 'sw-shadow 1.2s infinite cubic-bezier(0.3,0.06,0.4,1)' }} />
      </div>
      <p style={{ margin: 0, fontSize: 'var(--text-md)', color: 'var(--muted)', letterSpacing: '0.02em' }}>{label}</p>
    </div>
  )
  if (!overlay) return inner
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,25,41,0.85)', zIndex: 9999 }}>{inner}</div>
  )
}
