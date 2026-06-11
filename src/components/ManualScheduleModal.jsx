import { useState } from 'react'
import { localTodayStr } from '../lib/payPeriod.js'
import { useI18n } from '../lib/i18n.jsx'

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
    const errs = await onImport(picked)
    setSaving(false)
    if (errs && errs.length) {
      setError(t('import.errSome', { errs: errs.join('\n') }))
    } else {
      onClose()
      onDone?.()
    }
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

        <div className="import-table-wrap">
          <table className="import-table">
            <thead>
              <tr>
                <th>{t('import.thDate')}</th>
                <th>{t('tt.schedIn')}</th>
                <th>{t('tt.schedOut')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>
                    <input
                      type="date"
                      value={r.date}
                      onChange={(e) => updateRow(i, { date: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="time"
                      value={r.start}
                      onChange={(e) => updateRow(i, { start: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="time"
                      value={r.end}
                      onChange={(e) => updateRow(i, { end: e.target.value })}
                    />
                  </td>
                  <td>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        className="modal-close"
                        onClick={() => removeRow(i)}
                        aria-label={t('import.delRow')}
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
