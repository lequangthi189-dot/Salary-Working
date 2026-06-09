import { useEffect } from 'react'
import DeductionsCard from './DeductionsCard.jsx'
import { useI18n } from '../lib/i18n.jsx'

// Popup Tiền bồi thường: overlay/Esc để đóng, hiệu ứng fade-in + scale khi mở.
export default function CompensationModal({
  periodKey,
  deductions,
  grossPay,
  onAdd,
  onDelete,
  onClose,
}) {
  const { t } = useI18n()

  // Phím Esc → đóng modal.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-overlay comp-fade" onClick={onClose}>
      <div
        className="modal-card wide deduction-modal comp-pop"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{t('nav.deductions')}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>
        <DeductionsCard
          periodKey={periodKey}
          deductions={deductions}
          grossPay={grossPay}
          onAdd={onAdd}
          onDelete={onDelete}
          embedded
        />
      </div>
    </div>
  )
}
