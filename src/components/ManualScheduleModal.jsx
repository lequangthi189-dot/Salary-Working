import { useState } from 'react'
import { localTodayStr } from '../lib/payPeriod.js'
import { useI18n } from '../lib/i18n.jsx'
import TimeInput from './TimeInput.jsx'

// Một dòng trống: ngày (mặc định hôm nay) + giờ lịch dự kiến vào/ra.
function blankRow() {
  return { date: localTodayStr(), start: '', end: '' }
}

// Popup nhập LỊCH DỰ KIẾN bằng tay (không cần ảnh). Mở từ "Nhập tay" trong modal
// Nhập lịch tuần. Bắt đầu với đúng 1 dòng; "+" để thêm dòng; "Tạo ca" để lưu.
export default function ManualScheduleModal({ onImport, onClose, onDone }) {
  const { t } = useI18n()
  const [rows, setRows] = useState([blankRow()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  function updateRow(i, patch) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  function addRow() {
    setRows((prev) => [...prev, blankRow()])
  }
  function removeRow(i) {
    setRows((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))
  }

  async function create() {
    const picked = rows.filter((r) => r.date && r.start && r.end)
    if (picked.length === 0) return setError(t('import.errNoShift'))
    setSaving(true)
    setError(null)
    setInfo(null)
    const { created, skipped, errors } = await onImport(picked)
    setSaving(false)
    if (errors && errors.length) {
      setError(t('import.errSome', { errs: errors.join('\n') }))
      return
    }
    // Báo tóm tắt: tạo bao nhiêu ca mới, bỏ qua bao nhiêu ca đã có (chống trùng).
    setInfo(
      created === 0
        ? t('import.allExist')
        : t('import.importSummary', { created, skipped })
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{t('import.manualTitle')}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>

        <div className="msched-list">
          <div className="msched-head">
            <span>{t('import.thDate')}</span>
            <span>{t('tt.schedIn')}</span>
            <span>{t('tt.schedOut')}</span>
            <span className="msched-del-col" />
          </div>
          {rows.map((r, i) => (
            <div className="msched-row" key={i}>
              <input
                type="date"
                title={t('import.thDate')}
                value={r.date}
                onChange={(e) => updateRow(i, { date: e.target.value })}
              />
              <TimeInput
                title={t('tt.schedIn')}
                value={r.start}
                onChange={(v) => updateRow(i, { start: v })}
              />
              <TimeInput
                title={t('tt.schedOut')}
                value={r.end}
                onChange={(v) => updateRow(i, { end: v })}
              />
              {rows.length > 1 ? (
                <button
                  type="button"
                  className="msched-del"
                  onClick={() => removeRow(i)}
                  aria-label={t('import.delRow')}
                >
                  ×
                </button>
              ) : (
                <span className="msched-del-col" />
              )}
            </div>
          ))}
        </div>

        {info && <p className="msg info">{info}</p>}
        {error && (
          <p className="msg error" style={{ whiteSpace: 'pre-wrap' }}>
            {error}
          </p>
        )}

        <div className="import-actions">
          <button
            type="button"
            className="account-btn"
            onClick={addRow}
            aria-label={t('import.addRow')}
          >
            +
          </button>
          <button
            type="button"
            className="btn-addshift"
            onClick={create}
            disabled={saving}
          >
            {saving ? t('import.creating') : t('import.createShifts')}
          </button>
        </div>
      </div>
    </div>
  )
}
