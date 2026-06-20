import StatCard from './StatCard.jsx'
import { formatHours2, formatMoney } from '../lib/shiftMath.js'
import { useI18n } from '../lib/i18n.jsx'
import { getRate } from '../lib/currency.jsx'
import './MonthStats.css'

// KHỐI THỐNG KÊ & LƯƠNG. Presentational — nhận `stats` (đã tính ở App) qua props.
// Bố cục: ô lương lớn (trên) + hàng 3 ô + hàng 2 ô. Toàn bộ bọc trong .stats-panel.
// formatMoney dùng Intl.NumberFormat('vi-VN') → phân cách nghìn bằng dấu chấm.
export default function MonthStats({
  stats,
  deductionTotal = 0,
  fxUpdatedAt,
  hasNightShift = true,
}) {
  const { t, lang } = useI18n()
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
              time: new Date(fxUpdatedAt).toLocaleString(fxLocale, {
                hourCycle: 'h23',
              }),
            })}
          </span>
        )}
      </div>

      {/* Hàng giờ: Tổng / Ngày / (Đêm) / Trễ — ẩn Giờ Đêm nếu cửa hàng không có ca đêm */}
      <div className={`stat-row stat-row--${hasNightShift ? 4 : 3}`}>
        <StatCard
          tone="orange"
          title={t('monthStats.totalHours')}
          value={`${formatHours2(stats.hours)} (h)`}
        />
        <StatCard
          tone="green"
          title={t('monthStats.dayHours')}
          value={`${formatHours2(stats.dayHours)} (h)`}
        />
        {hasNightShift && (
          <StatCard
            tone="blue"
            title={t('monthStats.nightHours')}
            value={`${formatHours2(stats.nightHours)} (h)`}
          />
        )}
        <StatCard
          tone="red"
          title={t('monthStats.lateHours')}
          value={`${formatHours2(stats.lostHours)} (h)`}
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
