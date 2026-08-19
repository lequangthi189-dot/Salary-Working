import React from 'react'

/* Profile photo. Falls back to initials on a raised surface — never to a generic
   person glyph, because in the dock the avatar IS the account button and a stock
   silhouette reads as "not signed in". Upstream: src/components/AvatarUpload.jsx
   and the .dock-avatar rule in NavBar.css (accent border when that item is open). */
function initialsOf(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({ src, name = '', size = 40, active = false, alt = 'Profile photo', style }) {
  const border = '1px solid ' + (active ? 'var(--accent)' : 'var(--border)')
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block', border, flex: 'none', ...style }}
      />
    )
  }
  return (
    <span
      aria-label={alt}
      role="img"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--panel-2)',
        backgroundImage: 'var(--card-bg-image)',
        border,
        boxShadow: 'var(--card-shadow)',
        color: active ? 'var(--accent)' : 'var(--muted)',
        fontWeight: 'var(--weight-bold)',
        fontSize: Math.max(10, Math.round(size * 0.36)) + 'px',
        letterSpacing: '0.02em',
        flex: 'none',
        ...style
      }}
    >
      {initialsOf(name)}
    </span>
  )
}
