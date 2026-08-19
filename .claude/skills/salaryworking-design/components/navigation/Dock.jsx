import React from 'react'
import { Avatar } from '../data/Avatar.jsx'

/* macOS-style dock, fixed to the bottom centre — the app's only navigation. Thumb
   reach is the whole point: 44px targets, pill surface, icons magnify toward the
   pointer/finger, labels sit permanently under the icons on touch devices. The
   real dock auto-hides 5s after scrolling stops. From src/components/NavBar.jsx +
   NavBar.css. */
const ICON_PROPS = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
export const DOCK_ICONS = {
  payPeriod: (
    <svg {...ICON_PROPS}>
      <path d="M8 2v4M16 2v4M3 10h18" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
    </svg>
  ),
  tools: (
    <svg {...ICON_PROPS}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  account: (
    <svg {...ICON_PROPS}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  guide: (
    <svg {...ICON_PROPS}>
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  )
}

export function Dock({ items = [], active = 0, onSelect, fixed = true, showLabels = true, style }) {
  const [hover, setHover] = React.useState(null)
  return (
    <nav
      aria-label="Main"
      style={{
        ...(fixed ? { position: 'fixed', left: '50%', bottom: 0, transform: 'translateX(-50%)' } : null),
        width: 'max-content',
        maxWidth: 'calc(100vw - 24px)',
        paddingBottom: fixed ? 'max(14px, env(safe-area-inset-bottom))' : 0,
        zIndex: 45,
        ...style
      }}
    >
      <ul
        onMouseLeave={() => setHover(null)}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
          margin: 0,
          padding: '6px 22px',
          listStyle: 'none',
          background: 'linear-gradient(var(--panel), var(--panel)), var(--bg)',
          backgroundImage: 'var(--card-bg-image)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-pill)',
          boxShadow: 'var(--shadow-dock)'
        }}
      >
        {items.map((item, i) => {
          const isActive = active === i
          const scale = hover === i ? 1.6 : hover != null && Math.abs(hover - i) === 1 ? 1.3 : 1
          return (
            <li key={item.key || i} style={{ position: 'relative', listStyle: 'none' }} onMouseEnter={() => setHover(i)}>
              <button
                type="button"
                onClick={() => onSelect && onSelect(i)}
                title={item.label}
                aria-current={isActive ? 'page' : undefined}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 5, minWidth: 44, background: 'none', border: 'none', padding: '0 6px', cursor: 'pointer' }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 26,
                    height: 26,
                    color: isActive ? 'var(--accent)' : 'var(--text)',
                    transform: 'scale(' + scale + ') translateY(' + (scale - 1) * -14 + 'px)',
                    transformOrigin: 'bottom center',
                    transition: 'transform var(--duration-fast) var(--ease-out), color var(--duration-base) var(--ease-standard)'
                  }}
                >
                  {item.avatarUrl || item.initials ? (
                    <Avatar src={item.avatarUrl} name={item.initials} size={26} active={isActive} alt={item.label} />
                  ) : item.icon && DOCK_ICONS[item.icon] ? (
                    DOCK_ICONS[item.icon]
                  ) : (
                    item.icon
                  )}
                </span>
                {showLabels && (
                  <span style={{ fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-semibold)', color: isActive ? 'var(--accent)' : 'var(--muted)', whiteSpace: 'nowrap' }}>{item.label}</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
