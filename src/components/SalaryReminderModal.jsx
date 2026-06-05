import { useState } from 'react'
import { payPeriodLabel } from '../lib/payPeriod.js'

// Nhắc nhận lương khi đã tới ngày nhận. Hỏi "lương đã về tài khoản chưa?".
// "Đã nhận" → đánh dấu kỳ đã nhận. "Chưa nhận" → đóng, lần đăng nhập sau hỏi lại.
export default function SalaryReminderModal({
  fullName,
  periodKey,
  onReceived,
  onNotYet,
}) {
  const [busy, setBusy] = useState(false)

  async function received() {
    setBusy(true)
    await onReceived()
    setBusy(false)
  }

  const name = fullName ? fullName : 'Bạn'

  return (
    <div className="modal-overlay">
      <div className="modal-card" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>Nhận lương</h2>
        </div>

        <p>
          <strong>{name}</strong>, lương kỳ <strong>{payPeriodLabel(periodKey)}</strong>{' '}
          đã về tài khoản chưa?
        </p>

        <div className="profile-actions">
          <button
            type="button"
            className="account-btn"
            onClick={onNotYet}
            disabled={busy}
          >
            Chưa nhận
          </button>
          <button
            type="button"
            className="btn-received"
            onClick={received}
            disabled={busy}
          >
            {busy ? '…' : 'Đã nhận'}
          </button>
        </div>
      </div>
    </div>
  )
}
