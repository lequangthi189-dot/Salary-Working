import { useI18n } from '../lib/i18n.jsx'

// Popup CẢNH BÁO/xác nhận dùng chung. onResult(true) = tiếp tục, false = hủy.
export default function ConfirmModal({ message, onResult }) {
  const { t } = useI18n()
  return (
    <div className="modal-overlay" onClick={() => onResult(false)}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>⚠️ {t('common.warning')}</h2>
        </div>
        <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>
          {message}
        </p>
        <div className="profile-actions">
          <button
            type="button"
            className="account-btn"
            onClick={() => onResult(false)}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="account-btn change-pw-btn"
            onClick={() => onResult(true)}
          >
            {t('common.continue')}
          </button>
        </div>
      </div>
    </div>
  )
}
