import React from 'react'

/* Scrim + centred card, 360px (480 wide), scrolls inside itself on small screens.
   Header is title + × ; actions sit at the bottom of the content, not in a
   sticky bar. From src/styles.css .modal-overlay/.modal-card and ConfirmModal. */
export function Modal({ title, children, onClose, width = 'default', footer, style }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'var(--surface-overlay)', display: 'grid', placeItems: 'safe center', padding: '1rem', overflowY: 'auto', zIndex: 50 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          background: 'var(--card-bg)',
          backgroundImage: 'var(--card-bg-image)',
          border: 'var(--card-border)',
          borderRadius: 'var(--card-radius)',
          boxShadow: 'var(--card-shadow)',
          backdropFilter: 'var(--card-blur)',
          WebkitBackdropFilter: 'var(--card-blur)',
          padding: '1.5rem',
          width: '100%',
          maxWidth: width === 'wide' ? 'var(--modal-max-width-wide)' : 'var(--modal-max-width)',
          maxHeight: 'calc(100dvh - 2rem)',
          overflowY: 'auto',
          color: 'var(--text)',
          ...style
        }}
      >
        {(title || onClose) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)' }}>{title}</h2>
            {onClose && (
              <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.35rem', lineHeight: 1, cursor: 'pointer', padding: '0.1rem 0.3rem' }}>×</button>
            )}
          </div>
        )}
        {children}
        {footer && <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>{footer}</div>}
      </div>
    </div>
  )
}
