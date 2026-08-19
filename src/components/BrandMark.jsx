/**
 * BrandMark — dấu hiệu nhận diện "Bảng kẹp" (clipboard ledger).
 *
 * Vẽ INLINE chứ không dùng <img src="logo.svg"> vì phần khung + dòng dữ liệu
 * dùng `currentColor`: nội tuyến thì logo tự đổi màu theo theme (mực đậm trên
 * nền sáng, mực sáng trên nền tối) mà không cần đổi file hay dùng JS.
 *
 * Giải phẫu (theo guidelines/logo.html của design system): khung viền mảnh giữ
 * một dòng tiêu đề đặc, ba ô tick và ba dòng dữ liệu mờ 55% — đúng cấu trúc
 * danh sách ca của app. Một nét tick chéo cắt ngang các dòng cuối: đó là nét
 * ĐỐI CHIẾU do người làm tự gạch, không phải do hệ thống.
 *
 * Quy tắc KHÔNG được vi phạm:
 *   - Không đặt logo trong ô nền bo góc (container tile).
 *   - Không đổi nét tick sang màu accent xanh, không xoay logo.
 *   - Dưới 16px thì bỏ 3 dòng dữ liệu, chỉ giữ khung + nét tick (prop `compact`).
 *
 * Props:
 *   - compact: true → bỏ dòng dữ liệu (dùng khi vẽ nhỏ hơn 16px)
 *   - còn lại truyền thẳng xuống <svg> (className, style, width…)
 */
export default function BrandMark({ compact = false, ...rest }) {
  return (
    <svg
      viewBox="0 0 256 256"
      role="img"
      aria-label="Salary Working"
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      {/* Khung bảng kẹp */}
      <rect
        x="52"
        y="56"
        width="152"
        height="168"
        rx="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
      />
      <g fill="currentColor">
        {/* Kẹp giấy trên đỉnh */}
        <rect x="102" y="34" width="52" height="34" rx="7" />
        <rect x="115" y="22" width="26" height="16" rx="5" />
        {/* Dòng tiêu đề + 3 ô tick */}
        <rect x="76" y="90" width="104" height="13" rx="2" />
        <rect x="76" y="118" width="13" height="13" rx="2" />
        <rect x="76" y="142" width="13" height="13" rx="2" />
        <rect x="76" y="166" width="13" height="13" rx="2" />
      </g>
      {/* 3 dòng dữ liệu mờ — bỏ đi khi vẽ quá nhỏ để khung không bị nhoè */}
      {!compact && (
        <g fill="currentColor" fillOpacity="0.55">
          <rect x="96" y="120" width="72" height="9" rx="2" />
          <rect x="96" y="144" width="54" height="9" rx="2" />
          <rect x="96" y="168" width="64" height="9" rx="2" />
        </g>
      )}
      {/* Nét đối chiếu — đường chéo DUY NHẤT của logo, nên nó mang điểm nhấn mà
          không cần gradient hay quầng sáng. Màu lấy qua --brand-check để đủ nổi
          trên cả 3 theme, nhưng luôn ở họ maroon (không bao giờ là accent xanh). */}
      <path
        fill="none"
        stroke="var(--brand-check)"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M126 180 L148 202 L198 152"
      />
    </svg>
  )
}
