import { createPortal } from 'react-dom'
import { useI18n } from '../lib/i18n.jsx'

// Popup CẢNH BÁO/xác nhận dùng chung. onResult(true) = tiếp tục, false = hủy.
//
// RENDER QUA PORTAL vào <body>, KHÔNG render tại chỗ gọi. Lý do: .modal-overlay là
// position:fixed, mà theo spec CSS bất kỳ tổ tiên nào có transform / filter /
// will-change:transform đều trở thành CONTAINING BLOCK cho con cháu position:fixed
// → popup bị nhốt trong hộp của tổ tiên đó thay vì phủ toàn màn hình. ShiftCard rơi
// đúng vào bẫy này vì hiệu ứng focus khi cuộn đặt transform+filter+will-change lên
// .shift-card. Portal đưa popup ra ngoài cây DOM đó nên fixed lại neo theo viewport.
export default function ConfirmModal({ message, onResult }) {
  const { t } = useI18n()
  return createPortal(
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
    </div>,
    document.body
  )
}
