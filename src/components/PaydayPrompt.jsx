import { useState } from 'react'
import { useI18n } from '../lib/i18n.jsx'

// Hỏi ngày nhận lương khi tài khoản chưa đặt (không bắt buộc).
export default function PaydayPrompt({ onSave, onSkip }) {
  const { t } = useI18n()
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
          <h2>{t('payday.title')}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onSkip}
            aria-label={t('payday.skip')}
          >
            ×
          </button>
        </div>

        <p className="muted">{t('payday.prompt')}</p>

        <label className="inline-day">
          {t('payday.receiveDay')}
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
            {t('payday.skip')}
          </button>
          <button
            type="button"
            className="account-btn change-pw-btn"
            onClick={save}
            disabled={busy}
          >
            {busy ? '…' : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
