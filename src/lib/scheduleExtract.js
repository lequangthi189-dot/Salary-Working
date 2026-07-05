// Hàm DÙNG CHUNG cho việc đọc ảnh lịch/bảng công qua Edge Function `extract-schedule`.
// Trích ra khỏi ScheduleImportModal + ReconcileModal để CẢ HAI lối vào (modal cũ và
// chatbot) gọi cùng một chỗ — sửa 1 nơi là cả hai cùng đúng. KHÔNG chứa logic UI.
//
// LƯU Ý: đây chỉ là nơi GOM lại đúng code đọc/xử lý hiện có (không đổi hành vi). Bug
// "ảnh đọc không ra" của luồng lịch nằm ở tầng đọc (Gemini/extract-schedule) nên
// vẫn giữ nguyên ở đây — xử lý riêng ở nhánh chẩn đoán.
import { supabase } from './supabase.js'
import { getLang, translate } from './i18n.jsx'
import { localTodayStr } from './payPeriod.js'
import { hhmm, durationHours, computeEffective } from './shiftMath.js'
import { resolveWeek } from './reconcileDates.js'

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const isoRe = /^\d{4}-\d{2}-\d{2}$/

export function pad2(n) {
  return String(n).padStart(2, '0')
}

// Cộng n ngày vào "YYYY-MM-DD" (tính theo UTC để tránh lệch múi giờ).
export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`
}

// Thứ 2 của tuần chứa dateStr ("YYYY-MM-DD"), theo giờ địa phương.
export function mondayOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dow = new Date(y, m - 1, d).getDay() // 0=CN..6=T7
  const offset = dow === 0 ? -6 : 1 - dow
  return addDays(dateStr, offset)
}

export function mondayOfThisWeek() {
  return mondayOf(localTodayStr())
}

// Đọc File ảnh -> { base64, mediaType }.
export function readImage(file) {
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

// Gọi Edge Function đọc 1 ảnh; unwrap thông điệp lỗi non-2xx nằm trong error.context
// (Response). Ném Error nếu function lỗi hoặc trả { error }. Trả về object THÔ của AI.
// opts: { weekStart, scope, month, periodStart, periodEnd, ... } tuỳ luồng.
export async function extractSchedule({
  base64,
  mediaType,
  employeeCode = '',
  fullName = '',
  phone = '',
  ...opts
}) {
  const { data, error: fnErr } = await supabase.functions.invoke(
    'extract-schedule',
    {
      body: {
        image: base64,
        mediaType,
        employeeCode: String(employeeCode || '').trim(),
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

// Object THÔ AI trả về + tuần bắt đầu (Thứ 2) → 7 dòng {weekday,date,start,end,off}
// cho bảng Nhập lịch tuần. Ưu tiên NGÀY đọc từ ảnh; ảnh không có ngày → tính theo tuần.
export function mapScheduleRows(data, weekStart) {
  const byDay = new Map((data?.days || []).map((d) => [d.weekday, d]))
  return WEEKDAYS.map((wd, i) => {
    const d = byDay.get(wd) || { off: true, start: '', end: '', raw: '' }
    const date = isoRe.test(d.date || '') ? d.date : addDays(weekStart, i)
    // `off` theo ĐÚNG AI báo (nguồn thẩm quyền). KHÔNG tự coi là nghỉ chỉ vì thiếu
    // một đầu giờ — làm vậy sẽ GIẤU luôn ngày AI đọc-ra-có-công khỏi bảng, người dùng
    // tưởng "đọc không ra". Ngày làm nhưng thiếu start/end → vẫn hiện (off=false) để
    // sửa tay; pickImportRows vẫn lọc ra ngày đủ start+end trước khi tạo ca.
    return {
      weekday: wd,
      date,
      start: d.off ? '' : d.start || '',
      end: d.off ? '' : d.end || '',
      off: !!d.off,
    }
  })
}

// Các dòng THỰC SỰ tạo ca: bỏ ngày OFF / thiếu giờ vào-ra.
export function pickImportRows(rows) {
  return (rows || []).filter((r) => !r.off && r.start && r.end)
}

// Đọc số giờ từ chuỗi thô trong ảnh ("7.55", "7,55", "8h") → số thập phân.
export function parseHours(raw) {
  if (!raw) return 0
  const n = parseFloat(String(raw).replace(',', '.').replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

// Số giờ "theo ảnh" cho một entry/ngày. ƯU TIÊN tổng giờ in sẵn (đã trừ nghỉ) khi
// hợp lý (0–24h); chỉ khi ảnh không có cột tổng mới suy từ khoảng giờ vào–ra.
export function imageHours(rec) {
  if (rec.off) return 0
  const total = parseHours(rec.raw)
  if (total > 0 && total <= 24) return total
  return rec.start && rec.end ? durationHours(rec.start, rec.end) : 0
}

// Đối chiếu theo TỔNG GIỜ CÔNG: chỉ cần giờ bằng nhau là khớp.
export function cmpHours(imgH, appH) {
  const imgHas = imgH > 0
  const appHas = appH > 0
  if (imgHas && appHas) return Math.abs(imgH - appH) < 0.02 ? 'match' : 'diff'
  if (imgHas && !appHas) return 'missing'
  if (!imgHas && appHas) return 'extra'
  return 'off'
}

// Map ngày -> TỔNG giờ THỰC TẾ hiệu dụng trong bảng công. Một ngày có thể có NHIỀU ca
// → CỘNG DỒN. Giờ thực tế dùng computeEffective (kẹp theo lịch dự kiến) để khớp cách
// công ty ghi công.
export function actualHoursByDate(shifts = []) {
  const map = new Map()
  for (const s of shifts) {
    if (s.start_time && s.end_time) {
      const h = computeEffective(
        hhmm(s.scheduled_start),
        hhmm(s.scheduled_end),
        hhmm(s.start_time),
        hhmm(s.end_time),
        !!s.is_holiday
      ).decimalHours
      map.set(s.work_date, (map.get(s.work_date) || 0) + h)
    }
  }
  return map
}

// Đối chiếu MỘT ảnh tuần với bảng công (dùng cho lối vào chatbot: không sửa tay).
// Trả { rows:[{date,imgHours,actualHours,status}], match, total } — chỉ giữ ngày có giờ.
export function reconcileWeek(data, weekStart, shifts) {
  const r = resolveWeek(data, weekStart)
  const dates = r ? r.dates : WEEKDAYS.map((_, i) => addDays(weekStart, i))
  const byDay = new Map((data?.days || []).map((d) => [d.weekday, d]))
  const actual = actualHoursByDate(shifts)
  const rows = WEEKDAYS.map((wd, i) => {
    const rec = byDay.get(wd) || { off: true, start: '', end: '', raw: '' }
    const date = dates[i]
    return { date, imgHours: imageHours(rec), actualHours: actual.get(date) || 0 }
  })
    .filter((row) => row.imgHours || row.actualHours)
    .map((row) => ({ ...row, status: cmpHours(row.imgHours, row.actualHours) }))
  return {
    rows,
    match: rows.filter((row) => row.status === 'match').length,
    total: rows.length,
  }
}
