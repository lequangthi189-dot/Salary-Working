import { useState } from 'react'
import { payPeriodLabel } from '../lib/payPeriod.js'
import { useI18n } from '../lib/i18n.jsx'

// Nhắc nhận lương khi đã tới ngày nhận. Hỏi "lương đã về tài khoản chưa?".
// "Đã nhận" → đánh dấu kỳ đã nhận. "Chưa nhận" → đóng, lần đăng nhập sau hỏi lại.
export default function SalaryReminderModal({
  fullName,
  periodKey,
  onReceived,
  onNotYet,
}) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)

  async function received() {
    setBusy(true)
    await onReceived()
    setBusy(false)
  }

  const name = fullName ? fullName : t('common.you')

  return (
    <div className="modal-overlay">
      <div className="modal-card" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{t('reminder.title')}</h2>
        </div>

        <p>
          {t('reminder.question', {
            name,
            period: payPeriodLabel(periodKey),
          })}
        </p>

        <div className="profile-actions">
          <button
            type="button"
            className="account-btn"
            onClick={onNotYet}
            disabled={busy}
          >
            {t('reminder.notYet')}
          </button>
          <button
            type="button"
            className="btn-received"
            onClick={received}
            disabled={busy}
          >
            {busy ? '…' : t('reminder.received')}
          </button>
        </div>
      </div>
    </div>
  )
}
