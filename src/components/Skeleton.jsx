import './Skeleton.css'

// SKELETON DÙNG CHUNG (presentational). Khối xám bo góc, hiệu ứng shimmer nhẹ,
// hiện lúc CHỜ TẢI dữ liệu thật để giữ chỗ đúng hình dạng nội dung sắp hiện.
// Thuần trang trí → aria-hidden, không có chữ (i18n không cần); phần loading có
// thông báo cho screen-reader nằm ở khu vực gắn (role="status").

// Khối skeleton cơ bản. Mọi biến thể build trên khối này.
export function Skeleton({ className = '', width, height, radius, style }) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      aria-hidden="true"
      style={{
        width,
        height,
        ...(radius != null ? { borderRadius: radius } : null),
        ...style,
      }}
    />
  )
}

// Dòng chữ giả. `lines` > 1 → nhiều dòng; dòng cuối ngắn lại cho tự nhiên.
// `width` áp cho dòng đơn (hoặc mọi dòng nếu là mảng theo từng dòng).
export function SkeletonText({ width = '100%', lines = 1, className = '' }) {
  if (lines <= 1) {
    const w = Array.isArray(width) ? width[0] : width
    return <Skeleton className={`skeleton-text ${className}`.trim()} width={w} />
  }
  return (
    <span className={`skeleton-lines ${className}`.trim()}>
      {Array.from({ length: lines }, (_, i) => {
        const w = Array.isArray(width)
          ? width[i] ?? width[width.length - 1]
          : i === lines - 1
            ? '60%' // dòng cuối ngắn hơn
            : width
        return <Skeleton key={i} className="skeleton-text" width={w} />
      })}
    </span>
  )
}

// Vòng tròn (avatar). `size` = đường kính (px hoặc chuỗi CSS).
export function SkeletonCircle({ size = 40, className = '' }) {
  return (
    <Skeleton
      className={`skeleton-circle ${className}`.trim()}
      width={size}
      height={size}
      radius="50%"
    />
  )
}

// Thẻ giữ chỗ (khung có viền/nền như thẻ thật). Đặt các SkeletonText bên trong
// để gợi tiêu đề + số của thẻ sắp hiện.
export function SkeletonCard({ className = '', height, children }) {
  return (
    <div className={`skeleton-card ${className}`.trim()} style={{ height }}>
      {children}
    </div>
  )
}
