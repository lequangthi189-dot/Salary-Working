import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { localTodayStr } from '../lib/payPeriod.js'
import { durationHours, formatHours, MAX_HOURS_PER_DAY } from '../lib/shiftMath.js'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WD_VI = {
  Mon: 'T2',
  Tue: 'T3',
  Wed: 'T4',
  Thu: 'T5',
  Fri: 'T6',
  Sat: 'T7',
  Sun: 'CN',
}

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
    reader.onerror = () => reject(new Error('Không đọc được ảnh'))
    reader.readAsDataURL(file)
  })
}

// Modal: tải ảnh lịch → AI đọc theo mã nhân viên (lấy từ hồ sơ) → xem trước & sửa
// → tạo ca cả tuần.
export default function ScheduleImportModal({
  employeeCode = '',
  onImport,
  onClose,
}) {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [weekStart, setWeekStart] = useState(mondayOfThisWeek())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [rows, setRows] = useState(null) // [{weekday,date,start,end,off}]
  const [saving, setSaving] = useState(false)

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
    if (!file) return setError('Hãy chọn ảnh lịch.')
    if (!/^\d{9}$/.test(String(employeeCode).trim()))
      return setError(
        'Tài khoản chưa có mã nhân viên 9 số. Hãy cập nhật mã trong hồ sơ rồi thử lại.'
      )
    setLoading(true)
    try {
      const { base64, mediaType } = await readImage(file)
      const { data, error: fnErr } = await supabase.functions.invoke(
        'extract-schedule',
        { body: { image: base64, mediaType, employeeCode: employeeCode.trim() } }
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
      if (!data?.found) {
        setError(
          `Không tìm thấy mã "${employeeCode}" trong ảnh. Kiểm tra lại mã hoặc ảnh.`
        )
        setRows(null)
        return
      }
      // Map theo thứ -> ngày dựa trên tuần bắt đầu (Thứ 2).
      const byDay = new Map((data.days || []).map((d) => [d.weekday, d]))
      const mapped = WEEKDAYS.map((wd, i) => {
        const d = byDay.get(wd) || { off: true, start: '', end: '', raw: '' }
        return {
          weekday: wd,
          date: addDays(weekStart, i),
          start: d.off ? '' : d.start || '',
          end: d.off ? '' : d.end || '',
          off: !!d.off || !d.start || !d.end,
        }
      })
      setRows(mapped)
      setInfo(
        `Đã đọc lịch cho mã "${data.matched_code || employeeCode}". Kiểm tra/sửa rồi bấm Tạo ca.`
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
    if (picked.length === 0) return setError('Không có ca nào để tạo.')
    // Lịch dự kiến: mỗi ca không được quá 8 giờ.
    const tooLong = picked.filter(
      (r) => durationHours(r.start, r.end) > MAX_HOURS_PER_DAY + 1e-9
    )
    if (tooLong.length) {
      return setError(
        `Lịch dự kiến không được quá ${MAX_HOURS_PER_DAY} giờ/ca. Sửa lại: ${tooLong
          .map(
            (r) =>
              `${WD_VI[r.weekday]} ${r.start}-${r.end} (${formatHours(
                durationHours(r.start, r.end)
              )}h)`
          )
          .join(', ')}`
      )
    }
    setSaving(true)
    setError(null)
    const errs = await onImport(picked)
    setSaving(false)
    if (errs && errs.length) {
      setError(`Một số ca không tạo được:\n${errs.join('\n')}`)
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
          <h2>Nhập lịch tuần từ ảnh</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        <div className="import-fields">
          <label className="import-file">
            <span>Ảnh lịch</span>
            <input type="file" accept="image/*" onChange={pickFile} />
          </label>
          <label className="import-week">
            <span>Tuần bắt đầu (Thứ 2)</span>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
            />
          </label>
        </div>
        <p className="import-empcode">
          Mã nhân viên (từ hồ sơ):{' '}
          <strong>{employeeCode || '— chưa có —'}</strong>
        </p>

        {previewUrl && (
          <img className="import-preview" src={previewUrl} alt="Xem trước ảnh lịch" />
        )}

        <div className="import-actions">
          <button
            type="button"
            className="account-btn"
            onClick={readSchedule}
            disabled={loading}
          >
            {loading ? 'Đang đọc…' : 'Đọc lịch bằng AI'}
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
                  <th>Thứ</th>
                  <th>Ngày</th>
                  <th>Vào</th>
                  <th>Ra</th>
                  <th>Nghỉ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.weekday} className={r.off ? 'off' : ''}>
                    <td>{WD_VI[r.weekday]}</td>
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
                {saving ? 'Đang tạo…' : 'Tạo ca cả tuần'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
