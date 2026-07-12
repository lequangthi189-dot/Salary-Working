// Logic NGHIỆP VỤ thuần cho ca làm việc (không phụ thuộc React/Supabase).
// Tách khỏi component để Controller (hooks) tái dùng và dễ test.
import { hhmm, parseTime } from './shiftMath.js'
import {
  payPeriodKeyOf,
  isPeriodEnded,
  localTodayStr,
} from './payPeriod.js'

const MINUTES_PER_DAY = 1440

// Hai mốc giờ "HH:MM" của một ca: ưu tiên GIỜ THỰC TẾ (start_time/end_time),
// nếu thiếu thì dùng GIỜ DỰ KIẾN (scheduled_*). Trả {start,end} dạng "HH:MM"
// hoặc null nếu không đủ mốc để so.
function shiftTimes(shift) {
  let start = hhmm(shift.start_time)
  let end = hhmm(shift.end_time)
  if (!start || !end) {
    start = hhmm(shift.scheduled_start)
    end = hhmm(shift.scheduled_end)
  }
  if (!start || !end) return null
  return { start, end }
}

// Khoảng phút [start, end) của một ca, ĐÃ CHUẨN HOÁ ca qua đêm: nếu end <= start
// (vd 22:00–06:00) thì end thuộc ngày hôm sau → cộng 24h. Trả null nếu thiếu mốc.
function shiftInterval(shift) {
  const tm = shiftTimes(shift)
  if (!tm) return null
  const start = parseTime(tm.start)
  let end = parseTime(tm.end)
  if (end <= start) end += MINUTES_PER_DAY
  return { start, end }
}

function dmLabel(workDate) {
  const [, m, d] = String(workDate).split('-')
  return d && m ? `${d}/${m}` : workDate
}

function rangeLabel(shift) {
  const tm = shiftTimes(shift)
  return tm ? `${tm.start}–${tm.end}` : ''
}

// Kiểm tra ca đang THÊM/SỬA có TRÙNG KHÍT hoặc CHỒNG LẤN giờ với ca khác trong
// CÙNG work_date không. `candidate` là ca đang lưu (có work_date + start/end hoặc
// scheduled_*). `existing` là danh sách ca hiện có; `excludeId` để bỏ qua chính ca
// đang sửa. Hai ca chồng lấn khi: startA < endB AND startB < endA (sau khi đã
// chuẩn hoá ca qua đêm) — trùng khít là trường hợp con của chồng lấn.
// Trả chuỗi lỗi rõ ràng nếu chồng lấn, ngược lại null.
export function overlapError(candidate, existing, excludeId = null) {
  const cand = shiftInterval(candidate)
  if (!cand) return null // chưa đủ mốc giờ để kiểm tra
  for (const s of existing || []) {
    if (excludeId != null && s.id === excludeId) continue
    if (s.work_date !== candidate.work_date) continue
    const other = shiftInterval(s)
    if (!other) continue
    // Cả hai ca cùng work_date đều có thể vắt qua nửa đêm, nên một mốc giờ (vd
    // 02:00) có thể là "sáng sớm cùng đêm" với ca 22:00–06:00. So overlap ở cả 3
    // mốc dịch ±24h để bắt đúng phần đuôi qua đêm, tránh sót như 22:00–06:00 vs
    // 02:00–08:00 (chồng ở 02:00–06:00).
    const hit = [-MINUTES_PER_DAY, 0, MINUTES_PER_DAY].some(
      (off) =>
        cand.start < other.end + off && other.start + off < cand.end
    )
    if (hit) {
      return `Ca ${rangeLabel(candidate)} trùng/chồng giờ với ca ${rangeLabel(
        s
      )} đã có trong ngày ${dmLabel(candidate.work_date)}.`
    }
  }
  return null
}

// Phân loại các ca chuẩn bị NHẬP (từ lịch tuần đọc bằng ảnh / nhập tay) thành:
//   - toCreate: ca CHƯA CÓ → cần insert.
//   - skipped: ca ĐÃ CÓ (trùng/chồng giờ trong cùng work_date với ca có sẵn) → bỏ qua.
// Dùng ĐÚNG định nghĩa trùng của overlapError (đã xử lý ca qua đêm end<=start), KHÔNG
// định nghĩa lại. Bắt cả trùng GIỮA CÁC DÒNG trong cùng lượt nhập: ca vừa nhận được
// gộp vào mốc so cho các ca sau (giống cách importWeekShifts cũ gộp `accepted`).
export function partitionImportShifts(candidates, existing) {
  const toCreate = []
  const skipped = []
  const accepted = [...(existing || [])]
  for (const cand of candidates || []) {
    if (overlapError(cand, accepted)) {
      skipped.push(cand)
    } else {
      toCreate.push(cand)
      accepted.push(cand)
    }
  }
  return { toCreate, skipped }
}

// Chặn nhập công cho kỳ lương ĐÃ CHỐT (đã qua ngày 25 của kỳ chứa ngày làm).
// Trả về chuỗi lỗi nếu kỳ đã đóng, ngược lại null.
export function periodClosedError(workDate) {
  if (isPeriodEnded(payPeriodKeyOf(workDate))) {
    return `Kỳ lương của ngày ${workDate} đã chốt (qua ngày 25). Không thể nhập công cho kỳ cũ.`
  }
  return null
}

// Kỳ lương ĐÃ KẾT THÚC, gần nhất mà CHƯA được đánh dấu đã nhận (kỳ đang chờ nhận).
export function pendingPeriodKey(shifts, payrolls) {
  const received = new Set((payrolls || []).map((p) => p.period_key))
  const keys = [...new Set(shifts.map((s) => payPeriodKeyOf(s.work_date)))]
  return (
    keys
      .filter((k) => isPeriodEnded(k) && !received.has(k))
      .sort()
      .pop() || null
  )
}

// Ca hiển thị dưới board: chỉ bỏ ca thuộc kỳ ĐÃ NHẬN lương; ca nhập từ ảnh
// luôn hiển thị như ca thường.
export function visibleBoardShifts(shifts, payrolls) {
  const receivedKeys = new Set((payrolls || []).map((p) => p.period_key))
  return shifts.filter(
    (s) => !receivedKeys.has(payPeriodKeyOf(s.work_date))
  )
}

// Map ngày -> lịch dự kiến (vd nhập từ ảnh tuần). Dùng để: (1) form Add shift ẩn ô
// Sched, (2) ca thêm tay trong ngày đó VẪN gắn lịch dự kiến làm mốc tính trễ.
export function buildSchedByDate(shifts) {
  const map = new Map()
  for (const s of shifts) {
    if (s.scheduled_start && !map.has(s.work_date)) {
      map.set(s.work_date, {
        start: hhmm(s.scheduled_start),
        end: hhmm(s.scheduled_end),
      })
    }
  }
  return map
}

// Có tới hạn nhận lương chưa: đã đặt payday, có kỳ chờ nhận, và hôm nay >= ngày nhận.
export function isSalaryDue(pendingKey, payday, paymentWindowOf) {
  if (!pendingKey || !payday) return false
  const pw = paymentWindowOf(pendingKey)
  const pad2 = (n) => String(n).padStart(2, '0')
  const dueDate = `${pw.year}-${pad2(pw.month)}-${pad2(payday)}`
  return localTodayStr() >= dueDate
}
