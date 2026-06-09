// Logic NGHIỆP VỤ thuần cho ca làm việc (không phụ thuộc React/Supabase).
// Tách khỏi component để Controller (hooks) tái dùng và dễ test.
import { hhmm } from './shiftMath.js'
import {
  payPeriodKeyOf,
  isPeriodEnded,
  localTodayStr,
} from './payPeriod.js'

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

// Ca hiển thị dưới board: chỉ bỏ ca thuộc kỳ ĐÃ NHẬN lương.
// (Không còn ẩn theo tuần/hide_at nữa — ca nhập từ ảnh luôn hiển thị.)
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
