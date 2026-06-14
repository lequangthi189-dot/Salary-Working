import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { localTodayStr } from '../lib/payPeriod.js'
import {
  hhmm,
  durationHours,
  formatHours,
  computeEffective,
} from '../lib/shiftMath.js'
import { useI18n, getLang, translate } from '../lib/i18n.jsx'
import ConfirmModal from './ConfirmModal.jsx'
import CircularProgress from './CircularProgress.jsx'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function pad2(n) {
  return String(n).padStart(2, '0')
}
function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`
}
function mondayOfThisWeek() {
  const today = localTodayStr()
  const [y, m, d] = today.split('-').map(Number)
  const dow = new Date(y, m - 1, d).getDay()
  const offset = dow === 0 ? -6 : 1 - dow
  return addDays(today, offset)
}

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

// "05/06"
function dmShort(date) {
  const [, m, d] = String(date).split('-')
  return `${d}/${m}`
}

// Đọc số giờ từ chuỗi thô trong ảnh (vd "7.55", "7,55", "8h") → số thập phân.
function parseHours(raw) {
  if (!raw) return 0
  const n = parseFloat(String(raw).replace(',', '.').replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

// Số giờ "theo ảnh" cho một entry/ngày. ƯU TIÊN tổng giờ in sẵn trên ảnh (đã trừ
// nghỉ giải lao) khi nó là số hợp lý (0–24h). Chỉ khi ảnh KHÔNG có cột tổng mới
// suy từ khoảng giờ vào–ra (durationHours) — vốn gồm cả giờ nghỉ nên dễ dư ~1h.
function imageHours(rec) {
  if (rec.off) return 0
  const total = parseHours(rec.raw)
  if (total > 0 && total <= 24) return total
  return rec.start && rec.end ? durationHours(rec.start, rec.end) : 0
}

// Modal ĐỐI CHIẾU CÔNG: tải ảnh bảng phân ca → AI đọc theo mã NV → so với các ca
// đang có trong bảng công (workshift cards) để xem có đúng công không.
export default function ReconcileModal({
  employeeCode = '',
  fullName = '',
  phone = '',
  shifts = [],
  onClose,
}) {
  const { t } = useI18n()
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  // Chế độ đối chiếu: 'week' (1 tuần) | 'month' (cả tháng).
  const [scope, setScope] = useState('week')
  // Tuần bắt đầu (Thứ 2) cho chế độ tuần — dùng khi ảnh không ghi ngày cụ thể.
  const [weekStart, setWeekStart] = useState(mondayOfThisWeek())
  // Tháng cần đối chiếu ("YYYY-MM", mặc định tháng này) cho chế độ tháng.
  const [month, setMonth] = useState(localTodayStr().slice(0, 7))
  const [loading, setLoading] = useState(false)
  // Tiến độ thật. indeterminate khi chờ Gemini; ẩn trong finally để không kẹt khi lỗi.
  const [progress, setProgress] = useState({ pct: 0, label: '', indeterminate: false })
  const [error, setError] = useState(null)
  const [rows, setRows] = useState(null)
  const [confirmState, setConfirmState] = useState(null) // { message, resolve }

  function askConfirm(message) {
    return new Promise((resolve) => setConfirmState({ message, resolve }))
  }

  // Map ngày -> giờ THỰC TẾ (đã check-in) và giờ DỰ KIẾN (lịch) trong bảng công.
  // Hai loại có thể nằm ở hai dòng ca khác nhau cùng ngày.
  const actualByDate = new Map()
  const schedByDate = new Map()
  for (const s of shifts) {
    if (s.start_time && s.end_time && !actualByDate.has(s.work_date))
      actualByDate.set(s.work_date, s)
    if (s.scheduled_start && s.scheduled_end && !schedByDate.has(s.work_date))
      schedByDate.set(s.work_date, s)
  }

  // Đối chiếu theo TỔNG GIỜ CÔNG: chỉ cần giờ bằng nhau là khớp.
  function cmpHours(imgH, appH) {
    const imgHas = imgH > 0
    const appHas = appH > 0
    if (imgHas && appHas) return Math.abs(imgH - appH) < 0.02 ? 'match' : 'diff'
    if (imgHas && !appHas) return 'missing'
    if (!imgHas && appHas) return 'extra'
    return 'off'
  }

  function pickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setRows(null)
    setError(null)
  }

  async function readAndCompare() {
    setError(null)
    if (!file) return setError(t('import.errPickImage'))
    if (![employeeCode, fullName, phone].some((v) => String(v || '').trim()))
      return setError(t('import.errNoCode'))
    setLoading(true)
    setProgress({ pct: 10, label: t('import.stageUpload'), indeterminate: false })
    try {
      // 1) Đọc & mã hoá ảnh.
      const { base64, mediaType } = await readImage(file)
      setProgress({ pct: 25, label: t('import.stageUpload'), indeterminate: false })
      // 2) Gọi Gemini đọc bảng công — indeterminate (không biết bao lâu).
      setProgress({ pct: 25, label: t('import.stageAI'), indeterminate: true })
      const { data, error: fnErr } = await supabase.functions.invoke(
        'extract-schedule',
        {
          body: {
            image: base64,
            mediaType,
            employeeCode: employeeCode.trim(),
            fullName,
            phone,
            // Tháng → gửi scope:'month'+month; Tuần → để mặc định + weekStart.
            ...(scope === 'month' ? { scope: 'month', month } : { weekStart }),
          },
        }
      )
      // 3) Có phản hồi → chuẩn bị đối chiếu.
      setProgress({ pct: 75, label: t('import.stageProcessing'), indeterminate: false })
      if (fnErr) {
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
      // Nhầm loại: ảnh là lịch dự kiến nhưng đang Đối chiếu công → hỏi xác nhận.
      if (data?.doc_type === 'schedule') {
        const ok = await askConfirm(t('reconcile.warnSchedule'))
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
      // 4) Đối chiếu công (planned/actual vs ảnh) — mốc thật, tính ở client.
      setProgress({ pct: 85, label: t('reconcile.stageCompare'), indeterminate: false })
      const isoRe = /^\d{4}-\d{2}-\d{2}$/
      // Giờ công theo ẢNH gom theo NGÀY + danh sách ngày cần đối chiếu (tuỳ chế độ).
      const imgByDate = new Map()
      let dateList = []
      if (scope === 'month') {
        // Tháng: đọc mảng entries; mỗi ngày một entry, nhiều ca/ngày → cộng dồn.
        for (const e of data.entries || []) {
          if (!isoRe.test(e.date || '') || e.date.slice(0, 7) !== month) continue
          imgByDate.set(e.date, (imgByDate.get(e.date) || 0) + imageHours(e))
        }
        // Tập ngày = ngày có trong ảnh ∪ ngày có ca trong tháng.
        const shiftDates = shifts
          .map((s) => s.work_date)
          .filter((d) => String(d).slice(0, 7) === month)
        dateList = [...new Set([...imgByDate.keys(), ...shiftDates])].sort()
      } else {
        // Tuần: đọc 7 thứ; ngày ưu tiên đọc từ ảnh, thiếu thì suy theo weekStart.
        const byDay = new Map((data.days || []).map((d) => [d.weekday, d]))
        dateList = WEEKDAYS.map((wd, i) => {
          const d = byDay.get(wd) || { off: true, start: '', end: '', raw: '' }
          const date = isoRe.test(d.date || '') ? d.date : addDays(weekStart, i)
          imgByDate.set(date, imageHours(d))
          return date
        })
      }
      const compared = dateList.map((date) => {
        const imgHours = imgByDate.get(date) || 0
        // Giờ THỰC TẾ = giờ công hiệu dụng như thẻ workshift (kẹp theo lịch dự kiến).
        const aS = actualByDate.get(date)
        const actualHours = aS
          ? computeEffective(
              hhmm(aS.scheduled_start),
              hhmm(aS.scheduled_end),
              hhmm(aS.start_time),
              hhmm(aS.end_time),
              !!aS.is_holiday
            ).decimalHours
          : 0
        const sS = schedByDate.get(date)
        const schedHours = sS
          ? durationHours(hhmm(sS.scheduled_start), hhmm(sS.scheduled_end))
          : 0
        return {
          date,
          imgHours,
          actualHours,
          schedHours,
          // Kết quả CHỈ dựa trên Thực tế vs Theo ảnh; Dự kiến không ảnh hưởng.
          statusActual: cmpHours(imgHours, actualHours),
        }
      })
      setProgress({ pct: 100, label: t('import.stageDone'), indeterminate: false })
      setRows(compared)
    } catch (e) {
      // Lỗi (Gemini quota/timeout…) → báo lỗi; finally ẩn vòng tròn, không kẹt.
      setError(String(e.message || e))
    } finally {
      setLoading(false)
    }
  }

  // Chỉ bỏ ngày HOÀN TOÀN trống (ảnh, thực tế, dự kiến đều 0 giờ).
  const visibleRows = rows
    ? rows.filter((r) => r.imgHours || r.actualHours || r.schedHours)
    : []
  const matchActual = visibleRows.filter((r) => r.statusActual === 'match').length

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card wide"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{t('reconcile.title')}</h2>
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
          <label className="import-week">
            <span>{t('reconcile.scope')}</span>
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="week">{t('reconcile.scopeWeek')}</option>
              <option value="month">{t('reconcile.scopeMonth')}</option>
            </select>
          </label>
          {scope === 'month' ? (
            <label className="import-week">
              <span>{t('reconcile.month')}</span>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </label>
          ) : (
            <label className="import-week">
              <span>{t('import.weekStart')}</span>
              <input
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
              />
            </label>
          )}
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
            onClick={readAndCompare}
            disabled={loading}
          >
            {loading ? t('import.reading') : t('reconcile.check')}
          </button>
        </div>

        {loading && (
          <div className="import-progress">
            <CircularProgress
              value={progress.pct}
              label={progress.label}
              indeterminate={progress.indeterminate}
            />
          </div>
        )}

        {error && (
          <p className="msg error" style={{ whiteSpace: 'pre-wrap' }}>
            {error}
          </p>
        )}

        {rows && (
          <>
            <p
              className={`msg ${
                matchActual === visibleRows.length ? 'info' : 'error'
              }`}
            >
              {t('reconcile.summary', {
                match: matchActual,
                total: visibleRows.length,
              })}
            </p>
            <div className="import-table-wrap">
              <table className="import-table reconcile-table">
                <thead>
                  <tr>
                    <th>{t('import.thDate')}</th>
                    <th>{t('reconcile.colActual')}</th>
                    <th>{t('reconcile.colImage')}</th>
                    <th>{t('reconcile.colSched')}</th>
                    <th>{t('reconcile.colResult')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((r) => (
                    <tr key={r.date}>
                      <td>{dmShort(r.date)}</td>
                      <td
                        className={`rec-${r.statusActual}`}
                        title={t(`reconcile.${r.statusActual}`)}
                      >
                        {r.actualHours ? `${formatHours(r.actualHours)}h` : '—'}
                      </td>
                      <td>{r.imgHours ? `${formatHours(r.imgHours)}h` : '—'}</td>
                      <td>{r.schedHours ? `${formatHours(r.schedHours)}h` : '—'}</td>
                      <td
                        className={`rec-${
                          r.statusActual === 'match' ? 'match' : 'diff'
                        }`}
                      >
                        {t(
                          r.statusActual === 'match'
                            ? 'reconcile.matchYes'
                            : 'reconcile.matchNo'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
    </div>
  )
}
