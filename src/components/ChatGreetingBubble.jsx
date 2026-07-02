// BONG BÓNG CHÀO NỔI cạnh nút chatbot (kiểu trợ lý Điện máy XANH). Một dòng: lời chào
// gọi tên (in đậm) + emoji. Bấm vào → mở chat (onClick); nút × → tắt (onClose). Mũi nhọn
// trỏ về avatar: tail='right' (bong bóng nằm bên TRÁI avatar) | 'left' (bên PHẢI).
// Fade-out mượt: cha truyền className 'is-closing' khi đang ẩn.
export default function ChatGreetingBubble({
  message,
  tail = 'right',
  closing = false,
  onClick,
  onClose,
  closeLabel = 'Close',
  style,
}) {
  return (
    <div
      className={`chat-greet-bubble chat-greet-bubble--${tail}${closing ? ' is-closing' : ''}`}
      style={style}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      <button
        type="button"
        className="chat-greet-close"
        aria-label={closeLabel}
        onClick={(e) => {
          e.stopPropagation()
          onClose?.()
        }}
      >
        ×
      </button>
      <div className="chat-greet-msg">{message}</div>
    </div>
  )
}
