import { useEffect } from 'react'
import './ToolsSheet.css'
import { useI18n } from '../lib/i18n.jsx'

// Icon SVG nội tuyến (stroke currentColor) cho 4 công cụ.
const ICONS = {
  calendarPlus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" />
    </svg>
  ),
  clipboardCheck: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="4" width="14" height="18" rx="2" />
      <path d="M9 4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1H9z" />
      <path d="M9 13l2 2 4-4" />
    </svg>
  ),
  coin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9a2.5 2 0 0 0-2.5-1.5c-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2A2.5 2 0 0 1 9.5 16M12 6v1.5M12 16.5V18" />
    </svg>
  ),
  briefcase: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" />
    </svg>
  ),
}

// Bottom sheet trượt lên từ đáy: nền ĐẶC (var(--bg)), bo góc trên, thanh kéo nhỏ.
// Chứa lưới 2×2 các công cụ. Đóng khi: bấm ra ngoài / nút X / chọn xong 1 công cụ.
export default function ToolsSheet({ tools, onClose }) {
  const { t } = useI18n()

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div
        className="tools-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.tools')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-head">
          <h2>{t('nav.tools')}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>
        <div className="tools-grid">
          {tools.map((tool) => (
            <button
              key={tool.key}
              type="button"
              className="tool-tile"
              onClick={() => {
                tool.onClick()
                onClose()
              }}
            >
              <span className="tool-icon">{ICONS[tool.icon]}</span>
              <span className="tool-label">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
