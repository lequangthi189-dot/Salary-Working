import React from 'react'

/* Inline form message: 0.85rem, no icon, no box — danger red for errors, accent
   blue for information. From src/styles.css .msg.error / .msg.info. */
export function Message({ tone = 'error', children, style }) {
  return (
    <p style={{ margin: '0.75rem 0 0', fontSize: 'var(--text-base)', color: tone === 'error' ? 'var(--danger)' : 'var(--accent)', ...style }}>
      {children}
    </p>
  )
}
