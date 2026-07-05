// Tính tổng cho THU NHẬP VIỆC NGOÀI. Tách riêng khỏi shiftMath.js — không liên
// quan giờ ngày/đêm hay đơn giá. Tiền là số nguyên VND.
//
// TRẠNG THÁI NHẬN (received): mỗi khoản có cờ `received` (boolean).
//   - received=true  → ĐÃ NHẬN: được cộng vào tổng kỳ lương, tính vào kỳ của
//                      `received_at` (ngày bấm nhận), KHÔNG phải ngày khoản.
//   - received=false → CHƯA NHẬN (treo): KHÔNG cộng vào tổng, giữ nguyên qua các
//                      kỳ tới khi được bấm nhận.

// Một khoản đã được nhận chưa?
export function isReceived(x) {
  return x?.received === true
}

// Lọc các khoản ĐÃ NHẬN / CHƯA NHẬN (treo) từ một danh sách.
export function receivedItems(list) {
  return (list || []).filter(isReceived)
}
export function pendingItems(list) {
  return (list || []).filter((x) => !isReceived(x))
}

// Tổng số tiền của một danh sách (VND, số nguyên) — KHÔNG lọc trạng thái.
export function sumExtraIncome(list) {
  return (list || []).reduce((acc, x) => acc + Math.round(Number(x.amount) || 0), 0)
}

// Tổng tiền CHỈ các khoản ĐÃ NHẬN (received=true). Đây là con số duy nhất được
// cộng vào tổng kỳ lương ở mọi nơi (modal, dashboard, biểu đồ kỳ, trợ lý lương).
export function sumReceivedExtraIncome(list) {
  return sumExtraIncome(receivedItems(list))
}

// Tổng thu nhập = lương ca + thu nhập việc ngoài ĐÃ NHẬN (số nguyên VND).
export function totalIncome(shiftPay, extraTotal) {
  return Math.round(Number(shiftPay) || 0) + Math.round(Number(extraTotal) || 0)
}
