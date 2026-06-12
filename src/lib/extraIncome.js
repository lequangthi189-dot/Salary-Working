// Tính tổng cho THU NHẬP VIỆC NGOÀI. Tách riêng khỏi shiftMath.js — không liên
// quan giờ ngày/đêm hay đơn giá. Tiền là số nguyên VND.

// Tổng số tiền việc ngoài của một danh sách (VND, số nguyên).
export function sumExtraIncome(list) {
  return (list || []).reduce((acc, x) => acc + Math.round(Number(x.amount) || 0), 0)
}

// Tổng thu nhập = lương ca + thu nhập việc ngoài (số nguyên VND).
export function totalIncome(shiftPay, extraTotal) {
  return Math.round(Number(shiftPay) || 0) + Math.round(Number(extraTotal) || 0)
}
