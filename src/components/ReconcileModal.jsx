import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  localTodayStr,
  payPeriodKeyOf,
  payPeriodRange,
  payPeriodLabel,
} from '../lib/payPeriod.js'
import {
  hhmm,
  durationHours,
  formatHours,
  computeEffective,
} from '../lib/shiftMath.js'
import { useI18n, getLang, translate } from '../lib/i18n.jsx'
import { resolveWeek, weekSpanWarning } from '../lib/reconcileDates.js'
import ConfirmModal from './ConfirmModal.jsx'
import ProgressButton from './ProgressButton.jsx'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const isoRe = /^\d{4}-\d{2}-\d{2}$/

function pad2(n) {
  return String(n).padStart(2, '0')
}
function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`
}
// Thứ 2 của tuần chứa dateStr ("YYYY-MM-DD").
function mondayOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dow = new Date(y, m - 1, d).getDay()
  const offset = dow === 0 ? -6 : 1 - dow
  return addDays(dateStr, offset)
}
function mondayOfThisWeek() {
  return mondayOf(localTodayStr())
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
  // Danh sách ảnh đã chọn. Chế độ tuần/tháng dùng 1 ảnh; chế độ nhiều tuần dùng N.
  const [files, setFiles] = useState([])
  const [previewUrls, setPreviewUrls] = useState([])
  // Chế độ đối chiếu: 'week' (1 tuần) | 'weeks' (nhiều tuần) | 'month' (cả tháng).
  const [scope, setScope] = useState('week')
  // Tuần bắt đầu (Thứ 2). Chế độ nhiều tuần: ảnh thứ i ứng với tuần weekStart+7*i.
  const [weekStart, setWeekStart] = useState(mondayOfThisWeek())
  // KỲ LƯƠNG cần đối chiếu. Giá trị = KHÓA kỳ ("YYYY-MM" của tháng KẾT THÚC kỳ),
  // trùng định dạng <input type="month">. Mặc định kỳ hiện tại. Khoảng ngày thực
  // (bắt đầu/chốt) suy từ cấu hình hồ sơ qua payPeriodRange.
  const [month, setMonth] = useState(payPeriodKeyOf(localTodayStr()))
  const [loading, setLoading] = useState(false)
  // Tiến độ thật. indeterminate khi chờ Gemini; ẩn trong finally để không kẹt khi lỗi.
  const [progress, setProgress] = useState({ pct: 0, label: '', indeterminate: false })
  const [error, setError] = useState(null)
  // Kết quả gom theo NHÓM: mỗi nhóm { weekStart, rows, error? }. Chế độ tuần/tháng
  // chỉ có 1 nhóm (weekStart=null cho tháng → không hiện tiêu đề nhóm).
  const [groups, setGroups] = useState(null)
  // Cảnh báo (không chặn) khi các tuần suy ra có dấu hiệu sai mốc "Tuần đầu".
  const [warn, setWarn] = useState(null)
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

  // Tạo dòng đối chiếu cho một tập ngày: gộp giờ ảnh / thực tế / dự kiến theo ngày.
  function compareDates(imgByDate, dateList) {
    return dateList.map((date) => {
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
  }

  // Một ảnh tuần (data.days) + mảng NGÀY ĐẦY ĐỦ theo cột Mon..Sun (do resolveWeek
  // suy ra) → các dòng đối chiếu 7 ngày.
  function buildWeekRows(data, dates) {
    const byDay = new Map((data.days || []).map((d) => [d.weekday, d]))
    const imgByDate = new Map()
    const dateList = WEEKDAYS.map((wd, i) => {
      const d = byDay.get(wd) || { off: true, start: '', end: '', raw: '' }
      const date = dates[i]
      imgByDate.set(date, imageHours(d))
      return date
    })
    return compareDates(imgByDate, dateList)
  }
  // Suy ngày + weekStart cho 1 ảnh tuần; fallback theo wkStart khi ảnh không có
  // cả ngày lẫn số ngày (resolveWeek trả null).
  function weekDatesOf(data, wkStart) {
    const r = resolveWeek(data, weekStart)
    const ws = r ? r.weekStart : wkStart
    const dates = r ? r.dates : WEEKDAYS.map((_, i) => addDays(ws, i))
    return { ws, dates, resolved: !!r }
  }

  // Một ảnh KỲ LƯƠNG (data.entries) → các dòng đối chiếu cho mọi ngày NẰM TRONG kỳ.
  // Khoảng [start, end] lấy theo cấu hình kỳ lương của hồ sơ (payPeriodRange), nên
  // kỳ có thể vắt qua 2 tháng (vd 26/05–25/06). So sánh chuỗi "YYYY-MM-DD" là đủ.
  function buildMonthRows(data) {
    const { start, end } = payPeriodRange(month)
    const imgByDate = new Map()
    for (const e of data.entries || []) {
      if (!isoRe.test(e.date || '') || e.date < start || e.date > end) continue
      imgByDate.set(e.date, (imgByDate.get(e.date) || 0) + imageHours(e))
    }
    const shiftDates = shifts
      .map((s) => s.work_date)
      .filter((d) => d >= start && d <= end)
    const dateList = [...new Set([...imgByDate.keys(), ...shiftDates])].sort()
    return compareDates(imgByDate, dateList)
  }

  function pickFile(e) {
    const list = Array.from(e.target.files || [])
    if (!list.length) return
    // Cho chọn nhiều ảnh ở MỌI chế độ; nếu chọn nhiều mà scope là Tuần/Tháng thì
    // chặn ở bước đối chiếu (xem tooManyForScope) chứ không tự ý cắt bớt ảnh.
    setFiles(list)
    setPreviewUrls(list.map((f) => URL.createObjectURL(f)))
    setGroups(null)
    setError(null)
    setWarn(null)
  }

  // Gọi Edge Function đọc 1 ảnh; ném lỗi nếu function trả lỗi.
  async function extractOne(base64, mediaType, opts) {
    const { data, error: fnErr } = await supabase.functions.invoke(
      'extract-schedule',
      {
        body: {
          image: base64,
          mediaType,
          employeeCode: employeeCode.trim(),
          fullName,
          phone,
          ...opts,
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
    return data
  }

  // Lý do BỎ QUA một ảnh (không phải bảng công / không tìm thấy NV) → text hiển thị.
  function dataIssue(data) {
    if (data?.is_roster === false) return t('import.errNotRoster')
    if (!data?.found) return t('import.errNotFound', { code: employeeCode })
    return null
  }

  async function readAndCompare() {
    setError(null)
    setWarn(null)
    if (!files.length) return setError(t('import.errPickImage'))
    // Chọn nhiều ảnh nhưng đang đối chiếu theo Tuần/Tháng (1 ảnh) → chặn, bắt chọn lại.
    if (scope !== 'weeks' && files.length > 1)
      return setError(t('reconcile.errScopeMulti'))
    if (![employeeCode, fullName, phone].some((v) => String(v || '').trim()))
      return setError(t('import.errNoCode'))
    setLoading(true)
    setProgress({ pct: 10, label: t('import.stageUpload'), indeterminate: false })
    try {
      if (scope === 'weeks') {
        // NHIỀU TUẦN: đọc hết ảnh; KHÔNG phụ thuộc thứ tự chọn file.
        // Giai đoạn 1 — đọc hết ảnh. AI chỉ đọc SỐ NGÀY trần (day) + tháng ở tiêu đề
        // (sheet_month/year) nếu có; KHÔNG suy ngày. Việc ghép số ngày → ngày đầy đủ
        // do client làm (resolveWeek) dựa trên tháng-trong-ảnh hoặc ô "Tuần đầu".
        const raw = []
        let scheduleConfirmed = false
        for (let i = 0; i < files.length; i++) {
          setProgress({
            pct: Math.round((i / files.length) * 90) + 5,
            label: `${t('import.stageAI')} (${i + 1}/${files.length})`,
            indeterminate: true,
          })
          const { base64, mediaType } = await readImage(files[i])
          const data = await extractOne(base64, mediaType, {})
          // Nhầm loại (ảnh lịch dự kiến) → hỏi xác nhận MỘT lần cho cả lượt.
          if (data?.doc_type === 'schedule' && !scheduleConfirmed) {
            const ok = await askConfirm(t('reconcile.warnSchedule'))
            if (!ok) {
              setGroups(null)
              return
            }
            scheduleConfirmed = true
          }
          raw.push({ data, issue: dataIssue(data) })
        }
        // Giai đoạn 2 — gán tuần. TỰ SORT NGÀY: ảnh suy được ngày (resolveWeek) → lấy
        // tuần thật từ chính SỐ NGÀY trong ảnh, bất kể vị trí chọn. Ảnh KHÔNG có cả
        // ngày lẫn số ngày → fallback theo THỨ TỰ CHỌN FILE, đếm RIÊNG trong nhóm ảnh
        // thiếu ngày (bắt đầu từ ô "Tuần đầu") để ảnh có ngày không chiếm mất khe tuần.
        let datelessRank = 0
        const result = raw.map(({ data, issue }) => {
          const r = data ? resolveWeek(data, weekStart) : null
          const realWeek = r ? r.weekStart : addDays(weekStart, 7 * datelessRank++)
          if (issue) return { weekStart: realWeek, rows: [], error: issue }
          const dates = r ? r.dates : WEEKDAYS.map((_, i) => addDays(realWeek, i))
          return { weekStart: realWeek, rows: buildWeekRows(data, dates) }
        })
        // Sắp xếp các nhóm theo tuần (tăng dần) để hiển thị đúng trình tự thời gian
        // dù người dùng chọn ảnh lộn xộn.
        result.sort((a, b) => a.weekStart.localeCompare(b.weekStart))
        // Chặn giới hạn "nhảy tháng": nếu các tuần cách xa bất thường hoặc trải ≥3
        // tháng → cảnh báo (không chặn) để người dùng soát lại ô "Tuần đầu".
        setWarn(weekSpanWarning(result.map((g) => g.weekStart)))
        setProgress({ pct: 100, label: t('import.stageDone'), indeterminate: false })
        setGroups(result)
        return
      }

      // MỘT ẢNH (tuần hoặc tháng).
      setProgress({ pct: 25, label: t('import.stageUpload'), indeterminate: false })
      const { base64, mediaType } = await readImage(files[0])
      setProgress({ pct: 25, label: t('import.stageAI'), indeterminate: true })
      const data = await extractOne(
        base64,
        mediaType,
        scope === 'month'
          ? {
              scope: 'month',
              month,
              periodStart: payPeriodRange(month).start,
              periodEnd: payPeriodRange(month).end,
            }
          : {}
      )
      setProgress({ pct: 75, label: t('import.stageProcessing'), indeterminate: false })
      if (data?.is_roster === false) {
        setError(t('import.errNotRoster'))
        setGroups(null)
        return
      }
      // Nhầm loại: ảnh là lịch dự kiến nhưng đang Đối chiếu công → hỏi xác nhận.
      if (data?.doc_type === 'schedule') {
        const ok = await askConfirm(t('reconcile.warnSchedule'))
        if (!ok) {
          setGroups(null)
          return
        }
      }
      if (!data?.found) {
        setError(t('import.errNotFound', { code: employeeCode }))
        setGroups(null)
        return
      }
      setProgress({ pct: 85, label: t('reconcile.stageCompare'), indeterminate: false })
      let rows
      let groupWeek = null
      if (scope === 'month') {
        rows = buildMonthRows(data)
      } else {
        const { ws, dates } = weekDatesOf(data, weekStart)
        rows = buildWeekRows(data, dates)
        groupWeek = ws // dùng tuần suy được (theo số ngày/ISO trong ảnh) cho tiêu đề
      }
      setProgress({ pct: 100, label: t('import.stageDone'), indeterminate: false })
      // Tuần → có tiêu đề nhóm theo weekStart; tháng → không tiêu đề (weekStart=null).
      setGroups([{ weekStart: groupWeek, rows }])
    } catch (e) {
      // Lỗi (Gemini quota/timeout…) → báo lỗi; finally ẩn vòng tròn, không kẹt.
      setError(String(e.message || e))
    } finally {
      setLoading(false)
    }
  }

  // Chỉ bỏ ngày HOÀN TOÀN trống (ảnh, thực tế, dự kiến đều 0 giờ).
  function visibleOf(rows) {
    return rows.filter((r) => r.imgHours || r.actualHours || r.schedHours)
  }
  // Chuẩn bị dữ liệu render: từng nhóm + tổng kết, cộng tổng kết toàn bộ.
  const view = groups
    ? groups.map((g) => {
        const visible = visibleOf(g.rows)
        return {
          ...g,
          visible,
          match: visible.filter((r) => r.statusActual === 'match').length,
        }
      })
    : []
  const showGroupTitles = view.length > 1
  const grandTotal = view.reduce((acc, g) => acc + g.visible.length, 0)
  const grandMatch = view.reduce((acc, g) => acc + g.match, 0)
  // Chọn nhiều ảnh nhưng scope là Tuần/Tháng (mỗi cái chỉ 1 ảnh) → không hợp lệ.
  const tooManyForScope = scope !== 'weeks' && files.length > 1

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
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={pickFile}
            />
          </label>
          <label className="import-week">
            <span>{t('reconcile.scope')}</span>
            <select
              value={scope}
              onChange={(e) => {
                // Giữ nguyên ảnh đã chọn ở mọi chế độ; việc khớp số ảnh ↔ scope do
                // tooManyForScope kiểm tra. Chỉ xoá kết quả/cảnh báo cũ.
                setScope(e.target.value)
                setGroups(null)
                setWarn(null)
                setError(null)
              }}
            >
              <option value="week">{t('reconcile.scopeWeek')}</option>
              <option value="weeks">{t('reconcile.scopeWeeks')}</option>
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
              {month && (
                <small className="import-empcode">{payPeriodLabel(month)}</small>
              )}
            </label>
          ) : (
            <label className="import-week">
              <span>
                {scope === 'weeks'
                  ? t('reconcile.firstWeekStart')
                  : t('import.weekStart')}
              </span>
              <input
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
              />
            </label>
          )}
        </div>
        {scope === 'weeks' && (
          <p className="import-empcode">{t('reconcile.weeksHint')}</p>
        )}
        {tooManyForScope && (
          <p className="msg error">
            {t('reconcile.errScopeMulti', { count: files.length })}
          </p>
        )}
        <p className="import-empcode">
          {t('import.empcodeFrom')}
          <strong>{employeeCode || t('import.none')}</strong>
        </p>

        {previewUrls.length > 0 && (
          <div className="import-preview-row">
            {previewUrls.map((url, i) => (
              <img
                key={url}
                className="import-preview"
                src={url}
                alt={`${t('import.previewAlt')} ${i + 1}`}
              />
            ))}
          </div>
        )}

        <div className="import-actions">
          <button
            type="button"
            className="account-btn"
            onClick={readAndCompare}
            disabled={loading || tooManyForScope}
          >
            {loading ? t('import.reading') : t('reconcile.check')}
          </button>
        </div>

        {loading && (
          <div className="import-progress">
            <ProgressButton
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

        {warn && (
          <p className="msg error">
            {t('reconcile.spanWarn', { months: warn.months.join(', ') })}
          </p>
        )}

        {groups && (
          <>
            <p
              className={`msg ${
                grandMatch === grandTotal ? 'info' : 'error'
              }`}
            >
              {t('reconcile.summary', { match: grandMatch, total: grandTotal })}
            </p>
            {view.map((g) => (
              <div key={g.weekStart || 'single'} className="reconcile-group">
                {showGroupTitles && (
                  <h3 className="reconcile-group-title">
                    {g.weekStart
                      ? t('reconcile.weekLabel', {
                          start: dmShort(g.weekStart),
                          end: dmShort(addDays(g.weekStart, 6)),
                        })
                      : ''}
                    {g.error ? null : (
                      <span className="reconcile-group-sub">
                        {t('reconcile.summary', {
                          match: g.match,
                          total: g.visible.length,
                        })}
                      </span>
                    )}
                  </h3>
                )}
                {g.error ? (
                  <p className="msg error">{g.error}</p>
                ) : (
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
                        {g.visible.map((r) => (
                          <tr key={r.date}>
                            <td>{dmShort(r.date)}</td>
                            <td
                              className={`rec-${r.statusActual}`}
                              title={t(`reconcile.${r.statusActual}`)}
                            >
                              {r.actualHours
                                ? `${formatHours(r.actualHours)}h`
                                : '—'}
                            </td>
                            <td>
                              {r.imgHours ? `${formatHours(r.imgHours)}h` : '—'}
                            </td>
                            <td>
                              {r.schedHours
                                ? `${formatHours(r.schedHours)}h`
                                : '—'}
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
                )}
              </div>
            ))}
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
