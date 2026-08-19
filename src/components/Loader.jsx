import './Loader.css'

/**
 * Loader — quả bóng nảy cho SalaryWorking
 *
 * Props:
 *   - color: màu quả bóng. Bỏ trống → lấy token --loader-ball theo theme
 *            (chỉ truyền khi cần ép một màu cụ thể).
 *   - label: chữ hiển thị dưới loader (vd "Đang tải ca làm...")
 *   - fullscreen: true = phủ toàn màn hình (dùng khi load trang)
 */
export default function Loader({ color, label, fullscreen = false }) {
  // Không đặt --ball-color khi không truyền color → Loader.css rơi về
  // var(--loader-ball), tức loader đổi màu theo theme thay vì luôn xanh navy cũ.
  const style = color ? { '--ball-color': color } : undefined

  const content = (
    <div className="sw-loader-wrap" style={style}>
      <div className="sw-loader" />
      {label && <p className="sw-loader-label">{label}</p>}
    </div>
  )

  if (fullscreen) {
    return <div className="sw-loader-overlay">{content}</div>
  }
  return content
}
