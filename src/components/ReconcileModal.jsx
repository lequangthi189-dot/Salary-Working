import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { localTodayStr } from '../lib/payPeriod.js'
import { hhmm, durationHours, formatHours } from '../lib/shiftMath.js'
import { useI18n, getLang, translate } from '../lib/i18n.jsx'

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
  const [weekStart, setWeekStart] = useState(mondayOfThisWeek())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [rows, setRows] = useState(null)

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
        setError(t('import.errNotFound', { code: employeeCode }))
        setRows(null)
        return
      }
      const byDay = new Map((data.days || []).map((d) => [d.weekday, d]))
      const compared = WEEKDAYS.map((wd, i) => {
        const d = byDay.get(wd) || { off: true, start: '', end: '', raw: '' }
        // Ngày = theo TUẦN BẮT ĐẦU người dùng chọn (Thứ 2 + offset).
        const date = addDays(weekStart, i)

        // Giờ công theo ẢNH: nếu có giờ vào–ra thì lấy thời lượng, nếu ảnh ghi giờ
        // thô (vd "7.55") thì đọc trực tiếp. Ngày nghỉ → 0.
        const imgHours = d.off
          ? 0
          : d.start && d.end
            ? durationHours(d.start, d.end)
            : parseHours(d.raw)

        const aS = actualByDate.get(date)
        const actualHours = aS
          ? durationHours(hhmm(aS.start_time), hhmm(aS.end_time))
          : 0
        const sS = schedByDate.get(date)
        const schedHours = sS
          ? durationHours(hhmm(sS.scheduled_start), hhmm(sS.scheduled_end))
          : 0

        return {
          weekday: wd,
          date,
          imgHours,
          actualHours,
          schedHours,
          statusActual: cmpHours(imgHours, actualHours),
          statusSched: cmpHours(imgHours, schedHours),
        }
      })
      setRows(compared)
    } catch (e) {
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
  const matchSched = visibleRows.filter((r) => r.statusSched === 'match').length

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
            <span>{t('import.weekStart')}</span>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
            />
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
            onClick={readAndCompare}
            disabled={loading}
          >
            {loading ? t('import.reading') : t('reconcile.check')}
          </button>
        </div>

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
              {t('reconcile.summary2', {
                a: matchActual,
                s: matchSched,
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
                    <tr key={r.weekday}>
                      <td>{dmShort(r.date)}</td>
                      <td
                        className={`rec-${r.statusActual}`}
                        title={t(`reconcile.${r.statusActual}`)}
                      >
                        {r.actualHours ? `${formatHours(r.actualHours)}h` : '—'}
                      </td>
                      <td>{r.imgHours ? `${formatHours(r.imgHours)}h` : '—'}</td>
                      <td
                        className={`rec-${r.statusSched}`}
                        title={t(`reconcile.${r.statusSched}`)}
                      >
                        {r.schedHours ? `${formatHours(r.schedHours)}h` : '—'}
                      </td>
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
    </div>
  )
}
