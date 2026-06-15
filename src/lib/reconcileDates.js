// reconcileDates — helper THUẦN (không phụ thuộc React) cho Đối chiếu công.
//
// Bối cảnh: header bảng công thật thường chỉ ghi SỐ NGÀY TRẦN cho mỗi cột
// (vd "8 T2 Mon", "9 T3 Tue"… dải 8–14), KHÔNG có tháng, KHÔNG có năm. Vì vậy
// không thể dựa vào chuỗi "YYYY-MM-DD" để biết ảnh thuộc tuần nào. Module này nhận
// SỐ NGÀY TRẦN theo cột (Mon..Sun) + một MỐC tháng/năm (ô "Tuần đầu") rồi ghép ra
// ngày đầy đủ, có xử lý GIÁP THÁNG, và suy ra Thứ 2 (weekStart) thật của ảnh.
//
// Quy ước đầu vào:
//  - dayNums: mảng theo cột Mon..Sun. Mỗi phần tử là số nguyên 1–31, hoặc
//    0/null/undefined nếu cột đó không đọc được ngày (off/trống).
//  - anchor: "YYYY-MM-DD" — Thứ 2 của TUẦN ĐẦU (sớm nhất) mà người dùng nhập.

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const isoRe = /^\d{4}-\d{2}-\d{2}$/

export function pad2(n) {
  return String(n).padStart(2, '0')
}

// Cộng n ngày vào "YYYY-MM-DD" (tính theo UTC để khỏi lệch múi giờ).
export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(
    dt.getUTCDate()
  )}`
}

// Ghép dải SỐ NGÀY TRẦN theo cột với tháng/năm từ anchor → mảng "YYYY-MM-DD"
// theo đúng cột (null ở cột không có ngày). Hai quy tắc xử lý tháng:
//   1) THÁNG BẮT ĐẦU của ảnh: vì anchor là tuần SỚM NHẤT, mọi ảnh nằm ở tuần ≥ anchor.
//      Nếu ngày đầu đọc được của ảnh NHỎ HƠN ngày của anchor → ảnh đã vòng sang
//      THÁNG KẾ (vd anchor 24/06, ảnh bắt đầu ngày 1 → thuộc tháng 7).
//   2) GIÁP THÁNG TRONG ẢNH: đi theo cột, khi số ngày TỤT (cur < prev, vd 30→1)
//      nghĩa là đã sang tháng kế ngay trong ảnh → tăng tháng (qua 12 thì sang năm).
export function dayNumsToDates(dayNums, anchor) {
  const [ay, am, aDay] = anchor.split('-').map(Number) // am: 1–12
  const firstDay = dayNums.map((d) => Number(d) || 0).find((d) => d >= 1 && d <= 31) || 0
  let year = ay
  let month = am
  // Quy tắc 1: ngày đầu của ảnh nhỏ hơn ngày anchor → ảnh thuộc tháng kế.
  if (firstDay && aDay && firstDay < aDay) {
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  let prev = 0
  return dayNums.map((d) => {
    const day = Number(d) || 0
    if (day < 1 || day > 31) return null // cột off/không đọc được → bỏ qua, prev giữ nguyên
    // Quy tắc 2: số ngày tụt → sang tháng kế ngay trong ảnh.
    if (prev && day < prev) {
      month += 1
      if (month > 12) {
        month = 1
        year += 1
      }
    }
    prev = day
    return `${year}-${pad2(month)}-${pad2(day)}`
  })
}

// Thứ 2 (weekStart) THẬT của ảnh = ngày ở CỘT MONDAY. Nếu cột Monday off, lấy cột
// có ngày đầu tiên rồi lùi về theo chỉ số cột (Mon=0). Dựa vào VỊ TRÍ CỘT của ảnh
// (không dùng thứ theo lịch thật) để không lệ thuộc anchor có đúng thứ hay không.
export function weekStartFromDayNums(dayNums, anchor) {
  const dates = dayNumsToDates(dayNums, anchor)
  const idx = dates.findIndex((d) => !!d)
  if (idx < 0) return null
  return addDays(dates[idx], -idx)
}

// Số ngày chênh (b - a) giữa 2 mốc "YYYY-MM-DD", tính theo UTC.
export function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000
  )
}

// Tháng/năm đọc được từ TIÊU ĐỀ ảnh (AI trả sheet_month/sheet_year). null nếu
// ảnh không ghi tháng. year=0 nghĩa là có tháng nhưng chưa biết năm.
export function sheetYearMonth(data) {
  const month = Number(data?.sheet_month) || 0
  if (month < 1 || month > 12) return null
  return { month, year: Number(data?.sheet_year) || 0 }
}

// Mốc tháng/năm để ghép số ngày: ƯU TIÊN tháng đọc được trong ảnh; không có thì
// dùng ô "Tuần đầu". Khi dùng tháng-trong-ảnh, đặt ngày 01 (đã biết tháng nên
// không cần quy tắc "ngày nhỏ → tháng kế"); năm thiếu thì mượn năm của "Tuần đầu".
export function anchorFor(data, weekStart) {
  const ym = sheetYearMonth(data)
  if (!ym) return weekStart
  const year = ym.year || Number(weekStart.split('-')[0])
  return `${year}-${pad2(ym.month)}-01`
}

// Suy NGÀY ĐẦY ĐỦ theo cột Mon..Sun + weekStart THẬT cho một ảnh tuần (data.days).
// Thứ tự ưu tiên:
//  1) ảnh in SẴN ngày ISO đầy đủ (days[].date) → dùng trực tiếp;
//  2) có SỐ NGÀY trần (days[].day) → ghép tháng/năm từ anchor (tháng-trong-ảnh
//     hoặc ô "Tuần đầu") qua dayNumsToDates;
//  3) không có cả ngày lẫn số ngày → trả null (client fallback theo thứ tự file).
// Trả { dates:[7 chuỗi YYYY-MM-DD], weekStart, source:'iso'|'sheet'|'anchor' } | null.
export function resolveWeek(data, weekStart) {
  const byDay = new Map((data?.days || []).map((d) => [d.weekday, d]))
  // 1) ngày ISO in sẵn trên ảnh
  const iso = WEEKDAYS.map((wd) => {
    const dt = byDay.get(wd)?.date
    return isoRe.test(dt || '') ? dt : null
  })
  const isoIdx = iso.findIndex(Boolean)
  if (isoIdx >= 0) {
    const ws = addDays(iso[isoIdx], -isoIdx)
    return {
      dates: iso.map((dt, i) => dt || addDays(ws, i)),
      weekStart: ws,
      source: 'iso',
    }
  }
  // 2) số ngày trần + anchor
  const nums = WEEKDAYS.map((wd) => Number(byDay.get(wd)?.day) || 0)
  const anchor = anchorFor(data, weekStart)
  const ws = weekStartFromDayNums(nums, anchor)
  if (ws) {
    const dd = dayNumsToDates(nums, anchor)
    return {
      dates: dd.map((dt, i) => dt || addDays(ws, i)),
      weekStart: ws,
      source: sheetYearMonth(data) ? 'sheet' : 'anchor',
    }
  }
  // 3) không suy được
  return null
}

// Cảnh báo khi các tuần (đã suy) có dấu hiệu sai mốc "Tuần đầu": khoảng trống
// >2 tuần (14 ngày) giữa hai tuần liên tiếp, HOẶC trải ≥3 tháng khác nhau. Trải
// đúng 2 tháng là bình thường cho một đợt nhiều tuần nên KHÔNG cảnh báo.
// Trả { months:[ "YYYY-MM", ... ] } hoặc null.
export function weekSpanWarning(weekStarts) {
  const ws = [...new Set(weekStarts.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  )
  if (ws.length < 2) return null
  let maxGap = 0
  for (let i = 1; i < ws.length; i++) {
    maxGap = Math.max(maxGap, daysBetween(ws[i - 1], ws[i]))
  }
  const months = [...new Set(ws.map((d) => d.slice(0, 7)))]
  if (maxGap > 14 || months.length >= 3) return { months }
  return null
}
