// Ô thống kê DÙNG CHUNG (presentational): LABEL ở trên, GIÁ TRỊ ở dưới, căn giữa.
// Class scope trong .stats-panel (xem MonthStats.css).
//
// Props:
//   title — nhãn Title Case (vd "Giờ Ngày") — tự thêm dấu ":".
//   value — giá trị đã định dạng (string | number) — trắng, đậm.
//   tone  — màu nhãn: 'orange' | 'green' | 'blue' | '' (mặc định).
export default function StatCard({ title, value, tone = '' }) {
  return (
    <div className="info-card">
      <span className={`info-card__label${tone ? ` tone-${tone}` : ''}`}>
        {title}:
      </span>
      <span className="info-card__value">{value}</span>
    </div>
  )
}
