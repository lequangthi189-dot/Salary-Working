import { useI18n } from '../lib/i18n.jsx'

// Popup "Có cập nhật mới" — liệt kê thay đổi của các bản mới hơn bản người dùng đã xem.
export default function WhatsNewModal({ entries = [], onClose }) {
  const { t, lang } = useI18n()
  const key = lang === 'vi' ? 'vi' : 'en' // en/us/au dùng chung tiếng Anh

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card welcome-card"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{t('whatsnew.title')} 🎉</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>

        {entries.map((e) => (
          <div key={e.version} className="whatsnew-entry">
            <p className="whatsnew-ver">
              v{e.version} · {e.date}
            </p>
            <ul className="whatsnew-list">
              {(e.items[key] || []).map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          </div>
        ))}

        <button
          type="button"
          className="btn-addshift welcome-start"
          onClick={onClose}
        >
          {t('whatsnew.ok')}
        </button>
      </div>
    </div>
  )
}
