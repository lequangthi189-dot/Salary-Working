import './CircularProgress.css'

// Vòng tròn tiến độ (ring) bằng conic-gradient.
//   value         — 0..100 (xác định %); bỏ qua khi indeterminate.
//   label         — chữ dưới số.
//   indeterminate — true → vòng quay liên tục, KHÔNG hiện số (bước không ước
//                   lượng được %, vd đang chờ Gemini trả lời).
//   size          — đường kính (px).
// Màu nhấn #3aa0d8 → #7fd3f5; lõi giữa + phần track dùng biến theme (--panel)
// để khớp bề mặt đang đặt → tạo hình vòng ring.
export default function CircularProgress({
  value = 0,
  label,
  indeterminate = false,
  size = 96,
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  const wrapStyle = { width: size, height: size }

  return (
    <div className="cprog" style={wrapStyle} role="status" aria-live="polite">
      {indeterminate ? (
        <div className="cprog-ring cprog-ring--spin" />
      ) : (
        <div
          className="cprog-ring"
          style={{ '--cprog-p': pct }}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      )}
      <div className="cprog-core">
        {!indeterminate && <span className="cprog-pct">{pct}%</span>}
        {label && <span className="cprog-label">{label}</span>}
      </div>
    </div>
  )
}
