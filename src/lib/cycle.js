// Xoay vòng một danh sách lựa chọn: dùng cho nút gạt 1 núc (phong cách, ngôn ngữ)
// và cho phím tắt tương ứng — cả hai PHẢI đi cùng một thứ tự, nên gom về một chỗ.
//
// `current` không nằm trong list (giá trị lạ/cũ trong localStorage hoặc hồ sơ) thì
// trả phần tử ĐẦU: bấm một cái là về lại trạng thái hợp lệ thay vì kẹt.
export function nextIn(list, current) {
  if (!Array.isArray(list) || list.length === 0) return undefined
  const i = list.indexOf(current)
  if (i < 0) return list[0]
  return list[(i + 1) % list.length]
}
