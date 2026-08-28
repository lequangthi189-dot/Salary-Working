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

// Ba mốc dịch ±24h dùng khi so hai ca CÙNG work_date: một mốc giờ (vd 02:00) có
// thể là "sáng sớm cùng đêm" của ca 22:00–06:00, nên phải xét cả bản dịch ±1 ngày.
const DAY_OFFSETS = [-MINUTES_PER_DAY, 0, MINUTES_PER_DAY]

// Số phút GIAO nhau LỚN NHẤT giữa hai khoảng ca cùng ngày (đã xét ±24h).
// 0 = hai ca rời nhau hoàn toàn.
function overlapMinutes(a, b) {
  let best = 0
  for (const off of DAY_OFFSETS) {
    const lo = Math.max(a.start, b.start + off)
    const hi = Math.min(a.end, b.end + off)
    if (hi - lo > best) best = hi - lo
  }
  return best
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
    // Cả hai ca cùng work_date đều có thể vắt qua nửa đêm — overlapMinutes đã xét
    // cả 3 mốc ±24h nên bắt đúng phần đuôi qua đêm, tránh sót như 22:00–06:00 vs
    // 02:00–08:00 (chồng ở 02:00–06:00).
    if (overlapMinutes(cand, other) > 0) {
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

// Map ngày -> DANH SÁCH lịch dự kiến của ngày đó, sắp theo giờ BẮT ĐẦU tăng dần.
// Một ngày có thể có NHIỀU ca rời giờ (vd 06–10, 12–16, 18–22) nên đây là MẢNG chứ
// không phải một mốc duy nhất. Dùng để: (1) form Add shift khoá ô Giờ ra theo ca
// đang chọn, (2) ca thêm tay trong ngày đó VẪN gắn lịch dự kiến làm mốc tính trễ.
// checkedIn = ca đã có giờ thực → view lọc khỏi danh sách đề xuất (lịch đã dùng).
export function buildSchedByDate(shifts) {
  const map = new Map()
  for (const s of shifts) {
    if (!s.scheduled_start) continue
    const list = map.get(s.work_date) || []
    list.push({
      id: s.id,
      start: hhmm(s.scheduled_start),
      end: hhmm(s.scheduled_end),
      checkedIn: !!s.start_time,
    })
    map.set(s.work_date, list)
  }
  // Sắp theo giờ bắt đầu (KHÔNG theo created_at) để thứ tự hiện ra ổn định, không
  // phụ thuộc lúc nào dòng nào được tạo.
  for (const list of map.values()) {
    list.sort((a, b) => parseTime(a.start) - parseTime(b.start))
  }
  return map
}

// Mốc GIỜ VÀO của một ca dạng "HH:MM": ưu tiên giờ thực tế, chưa chấm công thì lấy
// giờ lịch dự kiến, không có gì thì chuỗi rỗng (xếp lên đầu). Chuỗi "HH:MM" so sánh
// từ điển ra đúng thứ tự thời gian nên dùng thẳng làm khoá sắp xếp — cả bảng công
// chính lẫn bảng công chi tiết đều sắp ca trong ngày bằng hàm NÀY để hai nơi không
// bao giờ lệch thứ tự.
export function shiftTimeKey(shift) {
  return hhmm(shift.start_time) || hhmm(shift.scheduled_start) || ''
}

// Ca DỰ KIẾN (chưa chấm công) KHỚP NHẤT với khung giờ đang thêm, hoặc null nếu ngày
// đó không có ca dự kiến nào. Dùng khi "hiện thực hoá" ca: ghi giờ thực vào ĐÚNG
// dòng lịch mà người dùng vừa đi làm, thay vì dòng nào tình cờ đứng đầu mảng nguồn
// (mảng shifts sắp theo created_at nên "đầu tiên" = ca TẠO GẦN NHẤT, không liên
// quan gì tới giờ làm).
//
// Ngày chỉ có ĐÚNG MỘT ca dự kiến → trả luôn ca đó dù không giao phút nào, giữ
// nguyên hành vi cũ cho dữ liệu một-lịch-một-ngày (vd lịch 08–16 mà chấm công
// 18–22 thì vẫn gắn vào chính ca đó).
export function pickPlannedShift(shifts, candidate) {
  const planned = (shifts || []).filter(
    (s) => s.work_date === candidate.work_date && !s.start_time && !s.end_time
  )
  if (planned.length === 0) return null
  if (planned.length === 1) return planned[0]

  // Sắp theo giờ bắt đầu trước khi so: khi mọi tiêu chí hoà nhau, ca SỚM HƠN thắng
  // (deterministic, không phụ thuộc thứ tự mảng nguồn).
  const rows = planned
    .map((s) => ({ shift: s, iv: shiftInterval(s) }))
    .filter((r) => r.iv)
    .sort((a, b) => a.iv.start - b.iv.start)
  if (rows.length === 0) return planned[0]

  const cand = shiftInterval(candidate)
  if (!cand) return rows[0].shift

  // Tiêu chí 1: giao nhiều phút nhất. Tiêu chí 2 (khi không ca nào giao, hoặc giao
  // bằng nhau): giờ bắt đầu gần giờ vào thực tế nhất.
  let best = rows[0]
  let bestOverlap = -1
  let bestGap = Infinity
  for (const r of rows) {
    const ov = overlapMinutes(cand, r.iv)
    const gap = Math.min(
      ...DAY_OFFSETS.map((off) => Math.abs(r.iv.start + off - cand.start))
    )
    if (ov > bestOverlap || (ov === bestOverlap && gap < bestGap)) {
      best = r
      bestOverlap = ov
      bestGap = gap
    }
  }
  return best.shift
}

// ── TÌM CA (search bảng công) ────────────────────────────────────────────────
// Chuẩn hoá chuỗi để so khớp KHÔNG phân biệt hoa/thường & DẤU tiếng Việt: bỏ dấu
// (NFD) + quy 'đ'→'d', về chữ thường, cắt khoảng trắng 2 đầu. Nhờ vậy gõ
// "đêm"/"Đêm"/"dem" đều khớp như nhau, "Ngày" khớp "ngay".
function normalizeSearch(str) {
  return String(str ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '') // bỏ dấu tổ hợp (huyền/sắc/hỏi/ngã/nặng, mũ, móc…)
    .replace(/[đĐ]/g, 'd')
    .trim()
}

// Gom MỌI cách gõ có thể khớp một ca thành 1 "kho" chuỗi (mỗi biểu diễn 1 dòng),
// đã chuẩn hoá — để so bằng .includes(query). `kind` là 'day'|'night' (đã phân loại
// ở view theo cửa sổ đêm). Bao gồm:
//   - NGÀY: ISO 2026-06-10, 10/6, 10/06, 10/6/2026, 10-6, 10.6, và rời 10 / 6 / 2026.
//   - GIỜ (vào & ra; ưu tiên giờ THỰC TẾ, thiếu thì lấy giờ LỊCH): 22:00, 6:00, 22, 6, 2200.
//   - LOẠI CA: song ngữ 'ngay'/'day' hoặc 'dem'/'night'.
// Ngăn cách bằng '\n' để query (không chứa '\n') không thể khớp vắt qua 2 biểu diễn.
// Chi dung noi bo boi matchesShiftSearch ben duoi - khong export.
function shiftSearchHaystack(shift, kind) {
  const parts = []
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(shift.work_date || ''))
  if (m) {
    const [, y, mo, day] = m
    const dd = String(+day) // '10', bỏ số 0 đứng đầu ('05' → '5')
    const mm = String(+mo)
    parts.push(
      `${y}-${mo}-${day}`, // 2026-06-10
      `${dd}/${mm}`, // 10/6
      `${day}/${mo}`, // 10/06
      `${dd}/${mm}/${y}`, // 10/6/2026
      `${day}/${mo}/${y}`, // 10/06/2026
      `${dd}-${mm}`, // 10-6
      `${dd}.${mm}`, // 10.6
      dd, // 10  (ngày)
      mm, // 6   (tháng)
      y // 2026
    )
  } else if (shift.work_date) {
    parts.push(String(shift.work_date))
  }
  const start = hhmm(shift.start_time) || hhmm(shift.scheduled_start)
  const end = hhmm(shift.end_time) || hhmm(shift.scheduled_end)
  for (const tm of [start, end]) {
    if (!tm) continue
    const [hh, mi] = tm.split(':')
    parts.push(
      tm, // 22:00
      `${+hh}:${mi}`, // 6:00 (bỏ số 0 đứng đầu của giờ)
      hh, // 22 / 06
      String(+hh), // 22 / 6
      tm.replace(':', '') // 2200
    )
  }
  if (kind === 'night') parts.push('dem', 'night', 'ca dem', 'night shift')
  else if (kind === 'day') parts.push('ngay', 'day', 'ca ngay', 'day shift')
  return normalizeSearch(parts.join('\n'))
}

// Ca có KHỚP truy vấn tìm kiếm không. `query` là chuỗi thô người dùng gõ; `kind` là
// loại ca đã phân loại ('day'|'night'). Query rỗng → khớp hết (không lọc). So bằng
// .includes trên kho đã chuẩn hoá nên gõ ngày/giờ/loại ca ở nhiều định dạng đều trúng.
export function matchesShiftSearch(shift, kind, query) {
  const q = normalizeSearch(query)
  if (!q) return true
  return shiftSearchHaystack(shift, kind).includes(q)
}

// Có tới hạn nhận lương chưa: đã đặt payday, có kỳ chờ nhận, và hôm nay >= ngày nhận.
export function isSalaryDue(pendingKey, payday, paymentWindowOf) {
  if (!pendingKey || !payday) return false
  const pw = paymentWindowOf(pendingKey)
  const pad2 = (n) => String(n).padStart(2, '0')
  const dueDate = `${pw.year}-${pad2(pw.month)}-${pad2(payday)}`
  return localTodayStr() >= dueDate
}
