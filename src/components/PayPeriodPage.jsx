import { useState } from 'react'
import { periodStats, formatHours, formatMoney } from '../lib/shiftMath.js'
import {
  payPeriodKeyOf,
  payPeriodLabel,
  localTodayStr,
  sumDeductions,
} from '../lib/payPeriod.js'
import PayPeriodPanel from './PayPeriodPanel.jsx'
import TimesheetTable from './TimesheetTable.jsx'
import { useI18n } from '../lib/i18n.jsx'

// Biểu đồ tròn (donut) tự vẽ bằng SVG — chỉ hiện SỐ TỔNG ở giữa; chi tiết xem ở
// chú thích bên dưới (không nhãn trong lát).
function Donut({ segments, centerValue, centerLabel, size = 104, stroke = 18 }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const cx = size / 2
  const cy = size / 2
  const [tip, setTip] = useState(null) // { x, y, text }

  let acc = 0
  const arcs = segments.map((seg) => {
    const frac = total > 0 ? seg.value / total : 0
    const len = frac * circ
    const text = `${seg.label}: ${seg.display} (${Math.round(frac * 100)}%)`
    const el = (
      <circle
        key={seg.label}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={seg.color}
        strokeWidth={stroke}
        strokeDasharray={`${len} ${circ - len}`}
        strokeDashoffset={-acc}
        style={{ cursor: 'pointer' }}
        onMouseEnter={(e) => setTip({ x: e.clientX, y: e.clientY, text })}
        onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, text })}
        onMouseLeave={() => setTip(null)}
      />
    )
    acc += len
    return el
  })

  return (
    <>
      <svg
        className="donut"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {total > 0 ? (
            arcs
          ) : (
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="var(--panel-2)"
              strokeWidth={stroke}
            />
          )}
        </g>
        <text
          x={cx}
          y={cy}
          dy="-2"
          textAnchor="middle"
          dominantBaseline="middle"
          className="donut-center-val"
        >
          {centerValue}
        </text>
        <text
          x={cx}
          y={cy}
          dy="11"
          textAnchor="middle"
          dominantBaseline="middle"
          className="donut-center-label"
        >
          {centerLabel}
        </text>
      </svg>
      {tip && (
        <div className="donut-tip" style={{ left: tip.x, top: tip.y }}>
          {tip.text}
        </div>
      )}
    </>
  )
}

function DonutBlock({ title, segments, centerValue, centerLabel }) {
  return (
    <div className="donut-block">
      {title && <span className="donut-title">{title}</span>}
      <Donut
        segments={segments}
        centerValue={centerValue}
        centerLabel={centerLabel}
      />
      <div className="chart-legend">
        {segments.map((s) => (
          <span key={s.label} className="legend-item">
            <span className="legend-dot" style={{ background: s.color }} />
            {s.label}: <strong>{s.display}</strong>
          </span>
        ))}
      </div>
    </div>
  )
}

const C = {
  day: 'var(--checkin)',
  night: 'var(--accent)',
  good: 'var(--green)',
  lost: 'var(--danger)',
  ded: 'var(--checkin)', // tổng tiền bị trừ
}

// "92%" hoặc "—" khi mẫu số = 0.
function pct(a, b) {
  return b > 0 ? `${Math.round((a / b) * 100)}%` : '—'
}

// Bảng màu cho từng khoản bị trừ (mỗi lý do một lát donut riêng).
const DED_COLORS = ['#ff9f43', '#c084fc', '#22d3ee', '#f472b6', '#facc15', '#fb923c']

// Biểu đồ thống kê gọn (4 donut, lưới 2×2) của một kỳ — vừa trong popup.
function StatsCharts({ st, deductions = [], hasNightShift = true }) {
  const { t } = useI18n()
  const dedTotal = sumDeductions(deductions)
  const dedsSorted = [...deductions]
    .filter((d) => Number(d.amount) > 0)
    .sort((a, b) => String(a.deduct_date).localeCompare(String(b.deduct_date)))
  const net = st.pay - dedTotal
  // Lát của donut Lương: thực nhận (sau trừ) + tổng bị trừ + mất do trễ. Tổng =
  // lương nếu đi đúng giờ. Lát nào = 0 sẽ tự bỏ.
  const moneySegments = [
    {
      label: t('pp.seg.net'),
      value: Math.max(0, net),
      color: C.good,
      display: formatMoney(net),
    },
    dedTotal > 0 && {
      label: t('pp.seg.ded'),
      value: dedTotal,
      color: C.ded,
      display: formatMoney(dedTotal),
    },
    st.lostPay > 0 && {
      label: t('pp.seg.lost'),
      value: st.lostPay,
      color: C.lost,
      display: formatMoney(st.lostPay),
    },
  ].filter(Boolean)
  // Lát donut "Tiền bị trừ": mỗi khoản (theo lý do) một lát.
  const dedSegments = dedsSorted.map((d, i) => ({
    label: d.reason || t('pp.seg.noReason'),
    value: Number(d.amount),
    color: DED_COLORS[i % DED_COLORS.length],
    display: formatMoney(d.amount),
  }))
  const shiftCount = st.dayShiftCount + st.nightShiftCount

  // Chỉ dựng những donut CÓ dữ liệu — donut rỗng bị ẩn, các donut còn lại tự căn
  // giữa cho đẹp (xem .stats-donuts dùng flex-wrap center).
  const blocks = []
  if (st.pay > 0 || dedTotal > 0 || st.lostPay > 0) {
    blocks.push(
      <DonutBlock
        key="salary"
        title={t('pp.donut.salary')}
        segments={moneySegments}
        centerValue={pct(net, st.idealPay)}
        centerLabel={t('pp.donut.salaryCenter')}
      />
    )
  }
  if (dedSegments.length > 0) {
    blocks.push(
      <DonutBlock
        key="ded"
        title={t('pp.donut.ded')}
        segments={dedSegments}
        centerValue={formatMoney(dedTotal)}
        centerLabel={t('pp.donut.dedCenter')}
      />
    )
  }
  if (st.hours > 0 || st.lostHours > 0) {
    blocks.push(
      hasNightShift ? (
        <DonutBlock
          key="hours"
          title={t('pp.donut.hours')}
          segments={[
            {
              label: t('pp.seg.dayHours'),
              value: st.dayHours,
              color: C.day,
              display: `${formatHours(st.dayHours)} h`,
            },
            {
              label: t('pp.seg.nightHours'),
              value: st.nightHours,
              color: C.night,
              display: `${formatHours(st.nightHours)} h`,
            },
            st.lostHours > 0 && {
              label: t('pp.seg.lateHours'),
              value: st.lostHours,
              color: C.lost,
              display: `${formatHours(st.lostHours)} h`,
            },
          ].filter(Boolean)}
          centerValue={`${formatHours(st.hours)}h`}
          centerLabel={t('pp.donut.hoursCenter')}
        />
      ) : (
        <DonutBlock
          key="totalHours"
          title={t('pp.donut.totalHours')}
          segments={[
            {
              label: t('pp.seg.workedHours'),
              value: st.hours,
              color: C.good,
              display: `${formatHours(st.hours)} h`,
            },
            st.lostHours > 0 && {
              label: t('pp.seg.lateHours'),
              value: st.lostHours,
              color: C.lost,
              display: `${formatHours(st.lostHours)} h`,
            },
          ].filter(Boolean)}
          centerValue={`${formatHours(st.hours)}h`}
          centerLabel={t('pp.donut.hoursCenter')}
        />
      )
    )
  }
  if (hasNightShift && shiftCount > 0) {
    blocks.push(
      <DonutBlock
        key="shifts"
        title={t('pp.donut.shifts')}
        segments={[
          {
            label: t('pp.seg.dayShifts'),
            value: st.dayShiftCount,
            color: C.day,
            display: t('pp.unit.shift', { n: st.dayShiftCount }),
          },
          {
            label: t('pp.seg.nightShifts'),
            value: st.nightShiftCount,
            color: C.night,
            display: t('pp.unit.shift', { n: st.nightShiftCount }),
          },
        ]}
        centerValue={`${shiftCount}`}
        centerLabel={t('pp.donut.shiftsCenter')}
      />
    )
  }

  if (blocks.length === 0) {
    return <p className="muted pp-no-chart">{t('pp.noData')}</p>
  }
  return <div className="stats-donuts">{blocks}</div>
}

// Popup chứa biểu đồ thống kê của một kỳ (hoặc tổng). Bảng công chi tiết là 1 NÚT
// → bấm mở popup riêng (TimesheetModal).
function StatsModal({ title, st, shifts = [], deductions, hasNightShift = true, onClose }) {
  const { t } = useI18n()
  const [showSheet, setShowSheet] = useState(false)
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card wide"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>
        <StatsCharts st={st} deductions={deductions} hasNightShift={hasNightShift} />
        <button
          type="button"
          className="account-btn full detail-sheet-btn"
          onClick={() => setShowSheet(true)}
        >
          {t('pp.detailTimesheet')}
        </button>
      </div>

      {showSheet && (
        <TimesheetModal
          title={title}
          shifts={shifts}
          hasNightShift={hasNightShift}
          onClose={() => setShowSheet(false)}
        />
      )}
    </div>
  )
}

// Popup riêng chỉ hiện bảng công chi tiết (kiểu Excel) của kỳ.
function TimesheetModal({ title, shifts, hasNightShift = true, onClose }) {
  const { t } = useI18n()
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card wide"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title ? `${title} · ${t('pp.detailTimesheet')}` : t('pp.detailTimesheet')}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>
        <TimesheetTable shifts={shifts} hasNightShift={hasNightShift} />
      </div>
    </div>
  )
}

// Trang "Kỳ lương": mỗi tháng là 1 card → bấm mở popup biểu đồ; kèm danh sách kỳ
// đã nhận + khoản trừ (giữ nguyên chức năng cũ).
export default function PayPeriodPage({
  shifts,
  payrolls,
  deductions = [],
  payday,
  onMarkReceived,
  onUnmark,
  onAddDeduction,
  onDeleteDeduction,
  hasNightShift = true,
}) {
  const { t } = useI18n()
  const periodKeys = [...new Set(shifts.map((s) => payPeriodKeyOf(s.work_date)))]
    .sort()
    .reverse()

  // scope đang mở popup: null = không mở, 'all' = tổng, hoặc key kỳ.
  const [openScope, setOpenScope] = useState(null)

  const shiftsOf = (scope) =>
    scope === 'all'
      ? shifts
      : shifts.filter((s) => payPeriodKeyOf(s.work_date) === scope)

  const openTitle =
    openScope === 'all' ? t('pp.allPeriods') : payPeriodLabel(openScope || '')

  const inner = (
    <>
      <p className="muted scope-hint">{t('pp.scopeHint')}</p>

      <div className="period-stat-grid">
          {/* Card tổng tất cả các kỳ */}
          {periodKeys.length > 0 &&
            (() => {
              const s = periodStats(shifts)
              return (
                <button
                  type="button"
                  className="period-stat-card all"
                  onClick={() => setOpenScope('all')}
                >
                  <span className="period-stat-label">{t('pp.allPeriods')}</span>
                  <span className="period-stat-main">
                    {formatHours(s.hours)} h · {formatMoney(s.pay)}
                  </span>
                  {s.lostPay > 0 && (
                    <span className="period-stat-lost">
                      {t('pp.lostDueLate', { money: formatMoney(s.lostPay) })}
                    </span>
                  )}
                </button>
              )
            })()}

          {/* Mỗi kỳ (tháng) một card */}
          {periodKeys.map((key) => {
            const s = periodStats(shiftsOf(key))
            return (
              <button
                type="button"
                key={key}
                className="period-stat-card"
                onClick={() => setOpenScope(key)}
              >
                <span className="period-stat-label">{payPeriodLabel(key)}</span>
                <span className="period-stat-main">
                  {formatHours(s.hours)} h · {formatMoney(s.pay)}
                </span>
                {s.lostPay > 0 && (
                  <span className="period-stat-lost">
                    {t('pp.lostDueLate', { money: formatMoney(s.lostPay) })}
                  </span>
                )}
              </button>
            )
          })}

          {periodKeys.length === 0 && (
            <p className="muted">{t('pp.noData')}</p>
          )}
        </div>

      {/* Chức năng cũ: danh sách kỳ đã nhận + khoản trừ + đánh dấu */}
      <h2 className="salary-section-title">{t('pp.receivedPeriods')}</h2>
      <PayPeriodPanel
        shifts={shifts}
        payrolls={payrolls}
        deductions={deductions}
        payday={payday}
        onMarkReceived={onMarkReceived}
        onUnmark={onUnmark}
        onAddDeduction={onAddDeduction}
        onDeleteDeduction={onDeleteDeduction}
        hasNightShift={hasNightShift}
      />
    </>
  )

  const modal = openScope && (
    <StatsModal
      title={openTitle}
      st={periodStats(shiftsOf(openScope))}
      shifts={shiftsOf(openScope)}
      deductions={
        openScope === 'all'
          ? deductions
          : deductions.filter((d) => d.period_key === openScope)
      }
      hasNightShift={hasNightShift}
      onClose={() => setOpenScope(null)}
    />
  )

  return (
    <div className="salary-embedded">
      {inner}
      {modal}
    </div>
  )
}
