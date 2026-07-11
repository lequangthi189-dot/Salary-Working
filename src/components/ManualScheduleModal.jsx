import { useState } from 'react'
import { localTodayStr } from '../lib/payPeriod.js'
import { addDays } from '../lib/scheduleExtract.js'
import { useI18n } from '../lib/i18n.jsx'
import TimeInput from './TimeInput.jsx'
import ConfirmModal from './ConfirmModal.jsx'

// Một dòng trống: ngày (mặc định hôm nay) + giờ lịch dự kiến vào/ra.
function blankRow() {
  return { date: localTodayStr(), start: '', end: '' }
}

// Popup nhập LỊCH DỰ KIẾN bằng tay (không cần ảnh). Mở từ "Nhập tay" trong modal
// Nhập lịch tuần. Bắt đầu với đúng 1 dòng; "+" để thêm dòng; "Tạo ca" để lưu.
// Thành công → gọi onSuccess(tóm tắt) để parent đóng cả stack modal + hiện flash.
export default function ManualScheduleModal({ onImport, onClose, onSuccess }) {
  const { t } = useI18n()
  const [rows, setRows] = useState([blankRow()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [confirmState, setConfirmState] = useState(null) // { message, resolve }

  // Hỏi xác nhận bằng popup cảnh báo riêng (thay window.confirm).
  function askConfirm(message) {
    return new Promise((resolve) => setConfirmState({ message, resolve }))
  }

  function updateRow(i, patch) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  function addRow() {
    // Dòng mới NỐI TIẾP ngày của dòng cuối (+1) — nhập lịch cả tuần khỏi phải sửa
    // ngày từng dòng. Giờ vẫn ĐỂ TRỐNG, không tự chép từ dòng trước: tự điền giờ mà
    // user quên sửa sẽ tạo ca sai âm thầm (dữ liệu lương, thà bắt gõ còn hơn đoán).
    setRows((prev) => {
      const last = prev[prev.length - 1]
      const next = last?.date
        ? { ...blankRow(), date: addDays(last.date, 1) }
        : blankRow()
      return [...prev, next]
    })
  }
  function removeRow(i) {
    setRows((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))
  }

  async function create() {
    setError(null)
    setInfo(null)
    // Dòng trống hoàn toàn (chưa đụng tới) thì bỏ qua; dòng ĐIỀN DỞ (thiếu 1-2
    // trường) thì BÁO RÕ số dòng thay vì âm thầm bỏ — tránh mất ca mà không biết.
    const filled = (r) => r.date && r.start && r.end
    const empty = (r) => !r.start && !r.end
    const incomplete = rows
      .map((r, i) => (!filled(r) && !empty(r) ? i + 1 : null))
      .filter((x) => x !== null)
    if (incomplete.length)
      return setError(
        t('import.errRowIncomplete', { rows: incomplete.join(', ') })
      )
    const picked = rows.filter(filled)
    if (picked.length === 0) return setError(t('import.errNoShift'))
    // Giờ vào = giờ ra nghĩa là ca 24h (quy ước qua nửa đêm) → hỏi xác nhận.
    // KHÔNG chặn end < start: ca qua đêm là hợp lệ.
    const equalRows = rows
      .map((r, i) => (filled(r) && r.start === r.end ? i + 1 : null))
      .filter((x) => x !== null)
    if (equalRows.length) {
      const ok = await askConfirm(
        t('import.warnEqualTimes', { rows: equalRows.join(', ') })
      )
      if (!ok) return
    }
    // Ngày trùng trong chính lượt nhập → cảnh báo (dễ là gõ nhầm).
    const dupDates = [
      ...new Set(
        picked
          .map((r) => r.date)
          .filter((d, i, arr) => arr.indexOf(d) !== i)
      ),
    ]
    if (dupDates.length) {
      const ok = await askConfirm(
        t('import.warnDupDates', { dates: dupDates.join(', ') })
      )
      if (!ok) return
    }
    setSaving(true)
    const { created, skipped, errors } = await onImport(picked)
    setSaving(false)
    if (errors && errors.length) {
      setError(t('import.errSome', { errs: errors.join('\n') }))
      return
    }
    // Tóm tắt: tạo bao nhiêu ca mới, bỏ qua bao nhiêu ca đã có (chống trùng).
    const summary =
      created === 0
        ? t('import.allExist')
        : t('import.importSummary', { created, skipped })
    // Thành công → đóng cả stack modal + flash ở trang chính (giống luồng AI);
    // thiếu onSuccess → giữ thông báo tại chỗ như cũ.
    if (onSuccess) onSuccess(summary)
    else setInfo(summary)
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

      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          onResult={(ok) => {
            confirmState.resolve(ok)
            setConfirmState(null)
          }}
        />
      )}
    </div>
  )
}
