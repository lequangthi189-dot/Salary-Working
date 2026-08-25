// Guard dùng chung cho phím tắt toàn cục.
//
// App dùng PHÍM ĐƠN (t / l / /) chứ không dùng Ctrl+chữ, vì gần như mọi tổ hợp
// Ctrl đều đã có nghĩa sẵn: Ctrl+L nhảy thanh địa chỉ, Cmd+M thu nhỏ cửa sổ ở
// tầng macOS — cả hai đều nuốt sự kiện trước khi trang nhận, preventDefault
// không cứu được. Phím đơn thì không đụng gì của trình duyệt lẫn OS, đổi lại
// PHẢI tự loại các trường hợp người dùng đang gõ chữ.

// Con trỏ đang ở chỗ nhập liệu? Gõ "t" trong ô ghi chú không được đổi theme.
export function isTypingTarget(el) {
  if (!el) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

// Phím "trần": không kèm modifier nào. Loại Shift để T hoa cũng không kích hoạt
// (người dùng đang gõ chữ hoa trong một ô nào đó không bắt được là chuyện thường).
export function isPlainKey(e) {
  return !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey
}

// Đang có modal mở → nhường phím cho modal (Esc đóng, Enter submit...).
// Chỉ tính `.modal-overlay`; bottom sheet Công cụ (`.sheet-overlay`) KHÔNG tính,
// vì phím "/" phải đóng lại được chính nó.
export function modalOpen() {
  return !!document.querySelector('.modal-overlay')
}

// Bỏ qua khi bộ gõ tiếng Việt đang dựng chữ: e.key lúc đó là 'Process'/'Dead'
// hoặc ký tự dở dang, bắt vào là cướp phím giữa chừng.
export function hotkeyBlocked(e) {
  return e.isComposing || e.keyCode === 229 || isTypingTarget(document.activeElement) || modalOpen()
}
