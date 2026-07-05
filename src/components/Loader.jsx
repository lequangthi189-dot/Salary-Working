import './Loader.css'

/**
 * Loader — quả bóng nảy cho SalaryWorking
 *
 * Props:
 *   - color: màu quả bóng (mặc định #3aa0d8, hợp với nền navy tối)
 *   - label: chữ hiển thị dưới loader (vd "Đang tải ca làm...")
 *   - fullscreen: true = phủ toàn màn hình (dùng khi load trang)
 */
export default function Loader({ color = '#3aa0d8', label, fullscreen = false }) {
  const style = { '--ball-color': color }

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
