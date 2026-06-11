import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { localTodayStr } from '../lib/payPeriod.js'
import { useI18n, getLang, translate } from '../lib/i18n.jsx'
import ConfirmModal from './ConfirmModal.jsx'
import ManualScheduleModal from './ManualScheduleModal.jsx'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function pad2(n) {
  return String(n).padStart(2, '0')
}

// Cộng n ngày vào "YYYY-MM-DD" (tính theo UTC để tránh lệch múi giờ).
function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(
    dt.getUTCDate()
  )}`
}

// Thứ 2 của tuần chứa "today" (theo giờ địa phương).
function mondayOfThisWeek() {
  const today = localTodayStr()
  const [y, m, d] = today.split('-').map(Number)
  const dow = new Date(y, m - 1, d).getDay() // 0=CN..6=T7
  const offset = dow === 0 ? -6 : 1 - dow // về Thứ 2
  return addDays(today, offset)
}

// Đọc File ảnh -> { base64, mediaType }
function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      resolve({ base64: dataUrl.split(',')[1], mediaType: file.type })
    }
    reader.onerror = () =>
      reject(new Error(translate(getLang(), 'import.errReadImage')))
    reader.readAsDataURL(file)
  })
}

// Modal: tải ảnh lịch → AI đọc theo mã nhân viên (lấy từ hồ sơ) → xem trước & sửa
// → tạo ca cả tuần.
export default function ScheduleImportModal({
  employeeCode = '',
  fullName = '',
  phone = '',
  onImport,
  onClose,
}) {
  const { t } = useI18n()
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  // Tuần hiện tại làm DỰ PHÒNG khi ảnh không ghi ngày (không hiện trên UI).
  const weekStart = mondayOfThisWeek()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [rows, setRows] = useState(null) // [{weekday,date,start,end,off}]
  const [showManual, setShowManual] = useState(false) // popup nhập tay
  const [saving, setSaving] = useState(false)
  const [confirmState, setConfirmState] = useState(null) // { message, resolve }

  // Hỏi xác nhận bằng popup cảnh báo riêng (thay window.confirm).
  function askConfirm(message) {
    return new Promise((resolve) => setConfirmState({ message, resolve }))
  }

  function pickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setRows(null)
    setError(null)
    setInfo(null)
  }

  async function readSchedule() {
    setError(null)
    setInfo(null)
    if (!file) return setError(t('import.errPickImage'))
    if (![employeeCode, fullName, phone].some((v) => String(v || '').trim()))
      return setError(t('import.errNoCode'))
    setLoading(true)
    try {
      const { base64, mediaType } = await readImage(file)
      const { data, error: fnErr } = await supabase.functions.invoke(
        'extract-schedule',
        {
          body: {
            image: base64,
            mediaType,
            employeeCode: employeeCode.trim(),
            fullName,
            phone,
            weekStart,
          },
        }
      )
      if (fnErr) {
        // Lỗi non-2xx: thông điệp thật nằm trong error.context (Response).
        let detail = fnErr.message
        try {
          const ctx = fnErr.context
          if (ctx && typeof ctx.json === 'function') {
            const b = await ctx.json()
            if (b?.error) detail = b.error
          }
        } catch {
          /* ignore */
        }
        throw new Error(detail)
      }
      if (data?.error) throw new Error(data.error)
      if (data?.is_roster === false) {
        setError(t('import.errNotRoster'))
        setRows(null)
        return
      }
      // Nhầm loại: ảnh là bảng công nhưng đang ở Nhập lịch tuần → hỏi xác nhận.
      if (data?.doc_type === 'timesheet') {
        const ok = await askConfirm(t('import.warnTimesheet'))
        if (!ok) {
          setRows(null)
          return
        }
      }
      if (!data?.found) {
        setError(t('import.errNotFound', { code: employeeCode }))
        setRows(null)
        return
      }
      // Map theo thứ -> ngày dựa trên tuần bắt đầu (Thứ 2).
      const byDay = new Map((data.days || []).map((d) => [d.weekday, d]))
      const isoRe = /^\d{4}-\d{2}-\d{2}$/
      const mapped = WEEKDAYS.map((wd, i) => {
        const d = byDay.get(wd) || { off: true, start: '', end: '', raw: '' }
        // Ưu tiên NGÀY đọc từ ảnh; nếu ảnh không có ngày thì mới tính theo tuần.
        const date = isoRe.test(d.date || '') ? d.date : addDays(weekStart, i)
        return {
          weekday: wd,
          date,
          start: d.off ? '' : d.start || '',
          end: d.off ? '' : d.end || '',
          off: !!d.off || !d.start || !d.end,
        }
      })
      setRows(mapped)
      setInfo(
        t('import.infoRead', { code: data.matched_code || employeeCode })
      )
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setLoading(false)
    }
  }

  function updateRow(i, patch) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  async function createShifts() {
    const picked = rows.filter((r) => !r.off && r.start && r.end)
    if (picked.length === 0) return setError(t('import.errNoShift'))
    setSaving(true)
    setError(null)
    const errs = await onImport(picked)
    setSaving(false)
    if (errs && errs.length) {
      setError(t('import.errSome', { errs: errs.join('\n') }))
    } else {
      onClose()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card wide"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{t('import.title')}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>

        <div className="import-fields">
          <label className="import-file">
            <span>{t('import.image')}</span>
            <input type="file" accept="image/*" onChange={pickFile} />
          </label>
        </div>
        <p className="import-empcode">
          {t('import.empcodeFrom')}
          <strong>{employeeCode || t('import.none')}</strong>
        </p>

        {previewUrl && (
          <img
            className="import-preview"
            src={previewUrl}
            alt={t('import.previewAlt')}
          />
        )}

        <div className="import-actions">
          <button
            type="button"
            className="account-btn"
            onClick={readSchedule}
            disabled={loading}
          >
            {loading ? t('import.reading') : t('import.readAI')}
          </button>
          <button
            type="button"
            className="account-btn"
            onClick={() => setShowManual(true)}
            disabled={loading}
          >
            {t('import.enterManual')}
          </button>
        </div>

        {info && <p className="msg info">{info}</p>}
        {error && <p className="msg error" style={{ whiteSpace: 'pre-wrap' }}>{error}</p>}

        {rows && (
          <>
            <div className="import-table-wrap">
            <table className="import-table">
              <thead>
                <tr>
                  <th>{t('import.thWeekday')}</th>
                  <th>{t('import.thDate')}</th>
                  <th>{t('import.thIn')}</th>
                  <th>{t('import.thOut')}</th>
                  <th>{t('import.thOff')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.weekday} className={r.off ? 'off' : ''}>
                    <td>{t(`wd.${r.weekday}`)}</td>
                    <td className="muted">{r.date}</td>
                    <td>
                      <input
                        type="time"
                        value={r.start}
                        disabled={r.off}
                        onChange={(e) => updateRow(i, { start: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        value={r.end}
                        disabled={r.off}
                        onChange={(e) => updateRow(i, { end: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={r.off}
                        onChange={(e) => updateRow(i, { off: e.target.checked })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            <div className="import-actions">
              <button
                type="button"
                className="btn-addshift"
                onClick={createShifts}
                disabled={saving}
              >
                {saving ? t('import.creating') : t('import.createAll')}
              </button>
            </div>
          </>
        )}
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

      {showManual && (
        <ManualScheduleModal
          onImport={onImport}
          onClose={() => setShowManual(false)}
          onDone={onClose}
        />
      )}
    </div>
  )
}
