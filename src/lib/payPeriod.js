import { getLang, translate } from './i18n.jsx'

// Chu kỳ lương: chốt ngày 25 hằng tháng.
// Công của "tháng M" = từ 26 của tháng (M-1) đến hết 25 của tháng M.
// Lương tháng M trả vào ngày 1–10 của tháng (M+1).
//
// "period key" = "YYYY-MM" của THÁNG KẾT THÚC (tháng chứa ngày 25).
// Mọi phép toán dùng chuỗi "YYYY-MM-DD" để tránh lệch múi giờ.

function pad2(n) {
  return String(n).padStart(2, '0')
}

// Cấu hình kỳ lương THEO TỪNG NGƯỜI (nạp từ hồ sơ qua setPayPeriod). endDay là
// NGÀY CHỐT (kỳ kết thúc); startDay là ngày bắt đầu kỳ (chỉ để hiển thị khoảng).
// Mặc định 26 → 25 (giữ nguyên hành vi cũ). Việc gom ca vào kỳ CHỈ phụ thuộc endDay.
let cfg = { startDay: 26, endDay: 25 }

function clampDay(v, fallback) {
  const n = Math.round(Number(v))
  return Number.isInteger(n) && n >= 1 && n <= 28 ? n : fallback
}

// Nạp cấu hình kỳ lương từ hồ sơ. Giá trị không hợp lệ → mặc định 26/25.
export function setPayPeriod({ startDay, endDay } = {}) {
  cfg = { startDay: clampDay(startDay, 26), endDay: clampDay(endDay, 25) }
}

export function getPayPeriodConfig() {
  return { ...cfg }
}

// Ngày hôm nay theo giờ ĐỊA PHƯƠNG dạng "YYYY-MM-DD".
export function localTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function parts(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number)
  return { y, m, d }
}

// Key kỳ lương cho một ngày làm việc "YYYY-MM-DD".
// Ngày SAU ngày chốt (d > endDay) → thuộc kỳ tháng sau; còn lại → kỳ tháng hiện tại.
export function payPeriodKeyOf(dateStr) {
  const { y, m, d } = parts(dateStr)
  let year = y
  let month = m
  if (d > cfg.endDay) {
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return `${year}-${pad2(month)}`
}

// Khoảng ngày làm việc của kỳ: { start: ngày bắt đầu, end: ngày chốt }. Nếu kỳ vắt
// qua 2 tháng (startDay > endDay, vd 26→25) thì start nằm ở THÁNG TRƯỚC.
export function payPeriodRange(key) {
  const [y, m] = key.split('-').map(Number)
  const end = `${y}-${pad2(m)}-${pad2(cfg.endDay)}`
  let sy = y
  let sm = m
  if (cfg.startDay > cfg.endDay) {
    sm -= 1
    if (sm < 1) {
      sm = 12
      sy -= 1
    }
  }
  const start = `${sy}-${pad2(sm)}-${pad2(cfg.startDay)}`
  return { start, end }
}

// Cửa sổ trả lương: ngày 01–10 của tháng SAU key.
export function paymentWindow(key) {
  const [y, m] = key.split('-').map(Number)
  let py = y
  let pm = m + 1
  if (pm > 12) {
    pm = 1
    py += 1
  }
  return {
    from: `${py}-${pad2(pm)}-01`,
    to: `${py}-${pad2(pm)}-10`,
    year: py,
    month: pm,
  }
}

// "26/04"
function dmShort(dateStr) {
  const { m, d } = parts(dateStr)
  return `${pad2(d)}/${pad2(m)}`
}

// "Lương tháng 5 (26/04 – 25/05)" / "Salary month 5 (26/04 – 25/05)"
export function payPeriodLabel(key) {
  const [, m] = key.split('-').map(Number)
  const { start, end } = payPeriodRange(key)
  return translate(getLang(), 'period.label', {
    m,
    start: dmShort(start),
    end: dmShort(end),
  })
}

// Kỳ đã kết thúc khi đã qua ngày 25 (so sánh chuỗi YYYY-MM-DD là đủ).
export function isPeriodEnded(key, today = localTodayStr()) {
  const { end } = payPeriodRange(key)
  return today > end
}

// Tổng số tiền bị trừ của một danh sách khoản trừ (VND).
export function sumDeductions(list) {
  return (list || []).reduce((acc, d) => acc + Number(d.amount || 0), 0)
}
