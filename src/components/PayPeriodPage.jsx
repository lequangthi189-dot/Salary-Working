import { useState, useRef } from 'react'
import {
  computeEffective,
  formatHours,
  formatMoney,
  hhmm,
  periodStats,
} from '../lib/shiftMath.js'
import {
  payPeriodKeyOf,
  payPeriodLabel,
  sumDeductions,
} from '../lib/payPeriod.js'
import { sumReceivedExtraIncome } from '../lib/extraIncome.js'
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
  const tipTimer = useRef(null)

  // Chạm/bấm (mobile không có hover) → hiện tooltip rồi tự ẩn sau 3s.
  function tapTip(e, text) {
    const p = e.touches?.[0] || e
    setTip({ x: p.clientX, y: p.clientY, text })
    clearTimeout(tipTimer.current)
    tipTimer.current = setTimeout(() => setTip(null), 3000)
  }

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
        onClick={(e) => tapTip(e, text)}
        onTouchStart={(e) => tapTip(e, text)}
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
function StatsCharts({ st, deductions = [], extraTotal = 0, hasNightShift = true }) {
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
  // Tổng thu nhập = lương ca + việc ngoài — CHỈ hiện khi có thu nhập việc ngoài.
  if (extraTotal > 0) {
    blocks.push(
      <DonutBlock
        key="income"
        title={t('pp.donut.income')}
        segments={[
          {
            label: t('extra.sumShift'),
            value: Math.max(0, st.pay),
            color: C.good,
            display: formatMoney(st.pay),
          },
          {
            label: t('extra.sumExtra'),
            value: extraTotal,
            color: C.day,
            display: formatMoney(extraTotal),
          },
        ]}
        centerValue={formatMoney(st.pay + extraTotal)}
        centerLabel={t('pp.donut.incomeCenter')}
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
  if (shiftCount > 0) {
    // Có ca đêm → tách ngày/đêm; không có ca đêm → 1 lát tổng số ca. Lọc lát = 0.
    const shiftSegments = hasNightShift
      ? [
          st.dayShiftCount > 0 && {
            label: t('pp.seg.dayShifts'),
            value: st.dayShiftCount,
            color: C.day,
            display: t('pp.unit.shift', { n: st.dayShiftCount }),
          },
          st.nightShiftCount > 0 && {
            label: t('pp.seg.nightShifts'),
            value: st.nightShiftCount,
            color: C.night,
            display: t('pp.unit.shift', { n: st.nightShiftCount }),
          },
        ].filter(Boolean)
      : [
          {
            label: t('pp.donut.shiftsCenter'),
            value: shiftCount,
            color: C.good,
            display: t('pp.unit.shift', { n: shiftCount }),
          },
        ]
    blocks.push(
      <DonutBlock
        key="shifts"
        title={t('pp.donut.shifts')}
        segments={shiftSegments}
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

// Đường xu hướng giờ làm: mỗi điểm là tổng giờ hiệu lực của một ngày đã chấm
// công. Chỉ dùng giờ thực tế để lịch dự kiến chưa check-in không làm sai biểu đồ.
function WorkHoursTrendChart({ shifts }) {
  const { t } = useI18n()

  const byDate = new Map()
  for (const shift of shifts) {
    const result = computeEffective(
      hhmm(shift.scheduled_start),
      hhmm(shift.scheduled_end),
      hhmm(shift.start_time),
      hhmm(shift.end_time),
      !!shift.is_holiday
    )
    if (result.decimalHours <= 0) continue
    const current = byDate.get(shift.work_date) || {
      date: shift.work_date,
      hours: 0,
    }
    current.hours += result.decimalHours
    byDate.set(shift.work_date, current)
  }

  const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
  if (days.length === 0) return null

  const width = 640
  const height = 176
  const pad = { top: 24, right: 24, bottom: 28, left: 32 }
  const chartWidth = width - pad.left - pad.right
  const chartHeight = height - pad.top - pad.bottom
  const maxHours = Math.max(...days.map((day) => day.hours), 1)
  const pointAt = (item, index) => {
    const x =
      days.length === 1
        ? pad.left + chartWidth / 2
        : pad.left + (index / (days.length - 1)) * chartWidth
    return { ...item, x, y: pad.top + (1 - item.hours / maxHours) * chartHeight }
  }
  const points = days.map(pointAt)
  const line = points.map((point) => `${point.x},${point.y}`).join(' ')
  const area = `${pad.left},${pad.top + chartHeight} ${line} ${pad.left + chartWidth},${pad.top + chartHeight}`
  const labelIndexes = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])]
  const shortDate = (date) => {
    const [, month, day] = date.split('-')
    return `${day}/${month}`
  }

  return (
    <section className="shift-trend" aria-labelledby="shift-trend-title">
      <div className="shift-trend__head">
        <div>
          <h3 id="shift-trend-title">{t('pp.trend.title')}</h3>
          <p>{t('pp.trend.subtitle')}</p>
        </div>
        <span className="shift-trend__count">
          {t('pp.trend.workDays', { n: days.length })}
        </span>
      </div>
      <div className="shift-trend__canvas">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t('pp.trend.aria')}>
          <line
            className="shift-trend__guide"
            x1={pad.left}
            x2={pad.left + chartWidth}
            y1={pad.top}
            y2={pad.top}
          />
          <line
            className="shift-trend__guide"
            x1={pad.left}
            x2={pad.left + chartWidth}
            y1={pad.top + chartHeight}
            y2={pad.top + chartHeight}
          />
          <text className="shift-trend__axis" x="0" y={pad.top + 4}>
            {formatHours(maxHours)} h
          </text>
          <text className="shift-trend__axis" x="0" y={pad.top + chartHeight}>
            0 h
          </text>
          {points.length > 1 && <polygon className="shift-trend__area" points={area} />}
          {points.length > 1 && <polyline className="shift-trend__line" points={line} />}
          {points.map((point) => (
            <circle
              key={point.date}
              className="shift-trend__point"
              cx={point.x}
              cy={point.y}
              r="4"
            >
              <title>
                {t('pp.trend.point', {
                  date: shortDate(point.date),
                  hours: formatHours(point.hours),
                })}
              </title>
            </circle>
          ))}
          {labelIndexes.map((index) => {
            const point = points[index]
            return (
              <text
                key={point.date}
                className="shift-trend__date"
                x={point.x}
                y={height - 7}
                textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
              >
                {shortDate(point.date)}
              </text>
            )
          })}
        </svg>
      </div>
    </section>
  )
}

// Popup chứa biểu đồ thống kê của một kỳ (hoặc tổng). Bảng công chi tiết là 1 NÚT
// → bấm mở popup riêng (TimesheetModal).
function StatsModal({
  title,
  st,
  shifts = [],
  deductions,
  extraTotal = 0,
  hasNightShift = true,
  showWorkTrend = false,
  onClose,
}) {
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
        <StatsCharts
          st={st}
          deductions={deductions}
          extraTotal={extraTotal}
          hasNightShift={hasNightShift}
        />
        {showWorkTrend && <WorkHoursTrendChart shifts={shifts} />}
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
          onClose={() => setShowSheet(false)}
        />
      )}
    </div>
  )
}

// Popup riêng chỉ hiện bảng công chi tiết (kiểu Excel) của kỳ.
function TimesheetModal({ title, shifts, onClose }) {
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
        <TimesheetTable shifts={shifts} />
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
  extraIncome = [],
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

  // Thống kê từng kỳ (tính 1 lần). Hiện HẾT mọi kỳ, kể cả kỳ 0 VND.
  const periodList = periodKeys.map((key) => ({ key, s: periodStats(shiftsOf(key)) }))

  // Tổng thu nhập việc ngoài ĐÃ NHẬN theo scope (tính vào kỳ của received_at = ngày
  // bấm nhận). Khoản chưa nhận (treo) không tính vào biểu đồ thu nhập.
  const extraTotalOf = (scope) => {
    const scoped =
      scope === 'all'
        ? extraIncome.filter((x) => x.received)
        : extraIncome.filter(
            (x) => x.received && payPeriodKeyOf(x.received_at) === scope
          )
    return sumReceivedExtraIncome(scoped)
  }

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

          {/* Mỗi kỳ (tháng) một card — hiện hết, kể cả kỳ 0 VND */}
          {periodList.map(({ key, s }) => (
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
          ))}

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
      extraTotal={extraTotalOf(openScope)}
      hasNightShift={hasNightShift}
      showWorkTrend={openScope === 'all'}
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
