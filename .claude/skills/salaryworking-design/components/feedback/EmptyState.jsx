import React from 'react'

/* Empty states state the next action in one sentence. No illustration, no mascot,
   no "Let's get started!". From src/styles.css .empty. */
export function EmptyState({ children, action, style }) {
  return (
    <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem', fontSize: 'var(--text-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem', ...style }}>
      <p style={{ margin: 0 }}>{children}</p>
      {action}
    </div>
  )
}
