// Modal hướng dẫn nhanh cho người mới. Tự hiện lần đầu (App lưu trạng thái đã xem
// trong localStorage) và có thể mở lại bằng nút "Hướng dẫn" trên header.
const STEPS = [
  {
    icon: '📝',
    title: 'Nhập ca làm việc',
    desc: 'Chọn ngày, nhập Check-in / Check-out (và lịch dự kiến nếu có) rồi bấm "Add shift".',
  },
  {
    icon: '🗓️',
    title: 'Lịch dự kiến',
    desc: 'Bấm "Nhập lịch tuần" để đọc lịch từ ảnh, hoặc nhập tay. Hệ thống so giờ thực tế với lịch để tính đi trễ.',
  },
  {
    icon: '💰',
    title: 'Lương tự động',
    desc: 'Giờ ngày (06–22h) và giờ đêm (22–06h) tính theo đơn giá riêng. Xem tổng tháng ở khối thống kê.',
  },
  {
    icon: '➖',
    title: 'Tiền bồi thường',
    desc: 'Bấm "Tiền bồi thường" để thêm khoản bị trừ của kỳ (kèm lý do).',
  },
  {
    icon: '📊',
    title: 'Kỳ lương',
    desc: 'Bấm "Kỳ lương" để xem biểu đồ thống kê từng tháng và đánh dấu đã nhận lương.',
  },
  {
    icon: '⚙️',
    title: 'Tài khoản',
    desc: 'Vào "Tài khoản" để đặt mã nhân viên (dùng đọc lịch) và ngày nhận lương.',
  },
]

export default function WelcomeGuide({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card wide welcome-card"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>Chào mừng đến Salary Working 👋</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        <p className="muted">Vài bước nhanh để bắt đầu:</p>
        <ol className="welcome-steps">
          {STEPS.map((s) => (
            <li key={s.title} className="welcome-step">
              <span className="welcome-step-icon">{s.icon}</span>
              <span className="welcome-step-body">
                <strong>{s.title}</strong>
                <span className="muted">{s.desc}</span>
              </span>
            </li>
          ))}
        </ol>

        <button type="button" className="btn-addshift welcome-start" onClick={onClose}>
          Bắt đầu
        </button>
      </div>
    </div>
  )
}
