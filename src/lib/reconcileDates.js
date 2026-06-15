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
