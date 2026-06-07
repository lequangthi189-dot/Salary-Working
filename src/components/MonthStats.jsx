import StatCard from './StatCard.jsx'
import { formatHours, formatMoney } from '../lib/shiftMath.js'
import './MonthStats.css'

// KHỐI THỐNG KÊ & LƯƠNG. Presentational — nhận `stats` (đã tính ở App) qua props.
// Bố cục: ô lương lớn (trên) + hàng 3 ô + hàng 2 ô. Toàn bộ bọc trong .stats-panel.
// formatMoney dùng Intl.NumberFormat('vi-VN') → phân cách nghìn bằng dấu chấm.
export default function MonthStats({ stats, deductionTotal = 0 }) {
  // Lương thực nhận của tháng = lương ca − tiền bồi thường (bị trừ) của kỳ.
  const netPay = stats.pay - deductionTotal
  return (
    <section className="stats-panel">
      {/* Ô lương lớn */}
      <div className="salary-hero">
        <span className="salary-hero__label">Lương tháng này:</span>
        <span className="salary-hero__value">{formatMoney(netPay)}</span>
        <span className="salary-hero__sub">
          (Dự kiến: {formatMoney(stats.idealPay)}
          <span className="salary-hero__sep"> | </span>
          <span className="salary-hero__penalty">
            Phạt: −{formatMoney(stats.lostPay)}
          </span>
          {deductionTotal > 0 && (
            <>
              <span className="salary-hero__sep"> | </span>
              <span className="salary-hero__penalty">
                Bồi thường: −{formatMoney(deductionTotal)}
              </span>
            </>
          )}
          )
        </span>
      </div>

      {/* Hàng 3 ô: Tổng Giờ / Giờ Ngày / Giờ Đêm */}
      <div className="stat-row stat-row--3">
        <StatCard
          tone="orange"
          title="Tổng Giờ Tháng"
          value={`${formatHours(stats.hours)} (h)`}
        />
        <StatCard
          tone="green"
          title="Giờ Ngày"
          value={`${formatHours(stats.dayHours)} (h)`}
        />
        <StatCard
          tone="blue"
          title="Giờ Đêm"
          value={`${formatHours(stats.nightHours)} (h)`}
        />
      </div>

      {/* Hàng 2 ô: Ca Ngày / Ca Đêm */}
      <div className="stat-row stat-row--2">
        <StatCard tone="orange" title="Ca Ngày" value={stats.dayShiftCount} />
        <StatCard tone="blue" title="Ca Đêm" value={stats.nightShiftCount} />
      </div>
    </section>
  )
}
