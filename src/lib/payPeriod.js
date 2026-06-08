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
// d >= 26 → thuộc kỳ tháng sau; d <= 25 → thuộc kỳ tháng hiện tại.
export function payPeriodKeyOf(dateStr) {
  const { y, m, d } = parts(dateStr)
  let year = y
  let month = m
  if (d >= 26) {
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return `${year}-${pad2(month)}`
}

// Khoảng ngày làm việc của kỳ: { start: (tháng-1)-26, end: tháng-25 }.
export function payPeriodRange(key) {
  const [y, m] = key.split('-').map(Number)
  const end = `${y}-${pad2(m)}-25`
  let sy = y
  let sm = m - 1
  if (sm < 1) {
    sm = 12
    sy -= 1
  }
  const start = `${sy}-${pad2(sm)}-26`
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
