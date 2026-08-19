import React from 'react'

/* Placeholder block with a slow sheen. Loading here is about NOT moving the
   layout: skeletons copy the exact shape of the content that is about to land,
   and they only appear on the first load of a screen. From
   src/components/Skeleton.jsx + Skeleton.css. */
export function Skeleton({ variant = 'block', width = '100%', height, lines = 1, size = 40, radius, style }) {
  const base = {
    display: 'block',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'var(--skeleton-base)',
    borderRadius: radius != null ? radius : 'var(--radius-sm)',
    lineHeight: 1
  }
  const sheen = (
    <span
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(90deg, transparent, var(--skeleton-sheen), transparent)',
        animation: 'sw-skeleton-shimmer var(--shimmer-duration) ease-in-out infinite'
      }}
    />
  )
  if (variant === 'circle') {
    return (
      <span aria-hidden="true" style={{ ...base, width: size, height: size, borderRadius: '50%', flex: 'none', ...style }}>{sheen}</span>
    )
  }
  if (variant === 'text' && lines > 1) {
    return (
      <span aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: '0.5em', ...style }}>
        {Array.from({ length: lines }, (_, i) => (
          <span key={i} style={{ ...base, height: '0.85em', borderRadius: 'var(--radius-xs)', width: i === lines - 1 ? '60%' : width }}>{sheen}</span>
        ))}
      </span>
    )
  }
  return (
    <span aria-hidden="true" style={{ ...base, width, height: variant === 'text' ? '0.85em' : height, borderRadius: variant === 'text' ? 'var(--radius-xs)' : base.borderRadius, ...style }}>{sheen}</span>
  )
}
