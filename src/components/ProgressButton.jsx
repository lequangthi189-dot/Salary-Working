import './ProgressButton.css'

// Nút tiến độ (progress button) — thay cho CircularProgress, NHẬN ĐÚNG BỘ PROPS
// để thay 1-1 ở mọi chỗ gọi (đọc lịch, đối chiếu công):
//   value         — 0..100 (xác định %); bỏ qua khi indeterminate.
//   label         — chữ hiển thị trong nút (vd "AI đang đọc lịch…").
//   indeterminate — true → ẩn số, lớp fill chạy qua lại liên tục (bước không ước
//                   lượng được %, vd đang chờ Gemini trả lời); vẫn hiện label.
//   size          — giữ chữ ký props cũ; không dùng cho nút (nút tự co theo nội
//                   dung), nhận để không phải sửa chỗ gọi.
// Hình thức: nút bo góc, nền + viền + CHỮ theo theme (--panel/--border/--text) để
// đọc rõ ở cả dark/glass/neumorph; lớp fill accent #3aa0d8 mờ chạy đầy dần từ trái
// theo %, thanh mảnh ở đáy chạy theo %.
export default function ProgressButton({
  value = 0,
  label,
  indeterminate = false,
  // eslint-disable-next-line no-unused-vars
  size,
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  const done = !indeterminate && pct >= 100

  return (
    <button
      type="button"
      className={
        'pbtn' +
        (indeterminate ? ' pbtn--indeterminate' : '') +
        (done ? ' pbtn--done' : '')
      }
      style={{ '--pbtn-p': pct }}
      disabled
      role="status"
      aria-live="polite"
      aria-valuenow={indeterminate ? undefined : pct}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 100}
    >
      {/* Lớp màu mờ chạy đầy dần từ trái sang theo % (indeterminate → animation). */}
      <span className="pbtn-fill" aria-hidden="true" />
      <span className="pbtn-content">
        <span className="pbtn-icon" aria-hidden="true">
          {done ? '✓' : '⟳'}
        </span>
        {label && <span className="pbtn-label">{label}</span>}
        {!indeterminate && !done && <span className="pbtn-pct">{pct}%</span>}
      </span>
      {/* Thanh mảnh ở đáy nút chạy theo %. */}
      <span className="pbtn-bar" aria-hidden="true" />
    </button>
  )
}
