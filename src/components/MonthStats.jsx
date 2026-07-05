import StatCard from './StatCard.jsx'
import { Skeleton, SkeletonText } from './Skeleton.jsx'
import { formatHours, formatMoney } from '../lib/shiftMath.js'
import { useI18n } from '../lib/i18n.jsx'
import { getRate } from '../lib/currency.jsx'
import './MonthStats.css'

// Skeleton KHỚP HÌNH thẻ lương + các thẻ thống kê: ô lương lớn (tiêu đề + số),
// hàng ô giờ, hàng ô số ca. Số ô đúng theo cửa hàng có/không ca đêm.
function MonthStatsSkeleton({ hasNightShift = true }) {
  const { t } = useI18n()
  const hourCards = hasNightShift ? 4 : 3
  const shiftCards = hasNightShift ? 2 : 1
  return (
    <section
      className="stats-panel"
      role="status"
      aria-busy="true"
      aria-label={t('common.loading')}
    >
      <div className="salary-hero salary-hero--skeleton">
        <Skeleton className="sk-hero-label" width="8rem" height="0.8rem" />
        <Skeleton className="sk-hero-value" width="11rem" height="2.2rem" />
        <Skeleton className="sk-hero-sub" width="14rem" height="0.8rem" />
      </div>
      <div className={`stat-row stat-row--${hourCards}`}>
        {Array.from({ length: hourCards }, (_, i) => (
          <div key={i} className="info-card info-card--skeleton">
            <SkeletonText width="70%" />
            <SkeletonText width="50%" />
          </div>
        ))}
      </div>
      <div className={`stat-row stat-row--${shiftCards}`}>
        {Array.from({ length: shiftCards }, (_, i) => (
          <div key={i} className="info-card info-card--skeleton">
            <SkeletonText width="60%" />
            <SkeletonText width="40%" />
          </div>
        ))}
      </div>
    </section>
  )
}

// KHỐI THỐNG KÊ & LƯƠNG. Presentational — nhận `stats` (đã tính ở App) qua props.
// Bố cục: ô lương lớn (trên) + hàng 3 ô + hàng 2 ô. Toàn bộ bọc trong .stats-panel.
// formatMoney dùng Intl.NumberFormat('vi-VN') → phân cách nghìn bằng dấu chấm.
export default function MonthStats({
  stats,
  deductionTotal = 0,
  fxUpdatedAt,
  hasNightShift = true,
  loading = false,
}) {
  const { t, lang } = useI18n()
  // Đang tải lần đầu → skeleton đúng hình; xong → dữ liệu thật (lỗi tải được App
  // hiện ở dòng thông báo riêng, và loading về false nên không kẹt skeleton).
  if (loading) return <MonthStatsSkeleton hasNightShift={hasNightShift} />
  // Dòng tỉ giá chỉ hiện khi đang quy đổi sang ngoại tệ (en/us/au).
  const FX = {
    en: { locale: 'en-GB', cur: 'GBP', sym: '£' },
    us: { locale: 'en-US', cur: 'USD', sym: '$' },
    au: { locale: 'en-AU', cur: 'AUD', sym: 'A$' },
  }
  const showFx = !!FX[lang] && fxUpdatedAt
  const { locale: fxLocale, cur: fxCur, sym: fxSym } = FX[lang] || FX.en
  // Tỉ giá hiển thị: 1 ngoại tệ = ? VND (getRate trả VND→ngoại tệ).
  const fxRate = getRate(fxCur)
  const fxVndPerUnit = fxRate ? Math.round(1 / fxRate) : 0
  // Lương thực nhận của tháng = lương ca − tiền bồi thường (bị trừ) của kỳ.
  const netPay = stats.pay - deductionTotal
  return (
    <section className="stats-panel">
      {/* Ô lương lớn */}
      <div className="salary-hero">
        <span className="salary-hero__label">{t('monthStats.salaryLabel')}</span>
        <span className="salary-hero__value">{formatMoney(netPay)}</span>
        <span className="salary-hero__sub">
          ({t('monthStats.expected')}: {formatMoney(stats.idealPay)}
          <span className="salary-hero__sep"> | </span>
          <span className="salary-hero__penalty">
            {t('monthStats.penalty')}: −{formatMoney(stats.lostPay)}
          </span>
          {deductionTotal > 0 && (
            <>
              <span className="salary-hero__sep"> | </span>
              <span className="salary-hero__penalty">
                {t('monthStats.deduction')}: −{formatMoney(deductionTotal)}
              </span>
            </>
          )}
          )
        </span>
        {showFx && (
          <span className="salary-hero__fx">
            {t('fx.updatedAt', {
              sym: fxSym,
              rate: fxVndPerUnit.toLocaleString('vi-VN'),
              time: new Date(fxUpdatedAt).toLocaleString(fxLocale),
            })}
          </span>
        )}
      </div>

      {/* Hàng giờ: Tổng / Ngày / (Đêm) / Trễ — ẩn Giờ Đêm nếu cửa hàng không có ca đêm */}
      <div className={`stat-row stat-row--${hasNightShift ? 4 : 3}`}>
        <StatCard
          tone="orange"
          title={t('monthStats.totalHours')}
          value={`${formatHours(stats.hours)} (h)`}
        />
        <StatCard
          tone="green"
          title={t('monthStats.dayHours')}
          value={`${formatHours(stats.dayHours)} (h)`}
        />
        {hasNightShift && (
          <StatCard
            tone="blue"
            title={t('monthStats.nightHours')}
            value={`${formatHours(stats.nightHours)} (h)`}
          />
        )}
        <StatCard
          tone="red"
          title={t('monthStats.lateHours')}
          value={`${formatHours(stats.lostHours)} (h)`}
        />
      </div>

      {/* Hàng số ca: Ca Ngày / (Ca Đêm) */}
      <div className={`stat-row stat-row--${hasNightShift ? 2 : 1}`}>
        <StatCard
          tone="orange"
          title={t('monthStats.dayShifts')}
          value={stats.dayShiftCount}
        />
        {hasNightShift && (
          <StatCard
            tone="blue"
            title={t('monthStats.nightShifts')}
            value={stats.nightShiftCount}
          />
        )}
      </div>
    </section>
  )
}
