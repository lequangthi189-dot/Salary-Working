import { useState } from 'react'

// Hỏi ngày nhận lương khi tài khoản chưa đặt (không bắt buộc).
export default function PaydayPrompt({ onSave, onSkip }) {
  const [day, setDay] = useState(5)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    await onSave(day)
    setBusy(false)
  }

  return (
    <div className="modal-overlay" onClick={onSkip}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>Ngày nhận lương</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onSkip}
            aria-label="Bỏ qua"
          >
            ×
          </button>
        </div>

        <p className="muted">
          Lương được trả vào ngày 1–10 hằng tháng. Bạn thường nhận vào ngày nào?
          (Không bắt buộc — có thể đặt sau trong Tài khoản.)
        </p>

        <label className="inline-day">
          Ngày nhận
          <select value={day} onChange={(e) => setDay(Number(e.target.value))}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <div className="profile-actions">
          <button type="button" className="account-btn" onClick={onSkip}>
            Bỏ qua
          </button>
          <button
            type="button"
            className="account-btn change-pw-btn"
            onClick={save}
            disabled={busy}
          >
            {busy ? '…' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  )
}
