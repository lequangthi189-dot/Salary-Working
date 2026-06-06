import { useState } from 'react'
import { periodStats, formatHours, formatMoney } from '../lib/shiftMath.js'
import {
  payPeriodKeyOf,
  payPeriodLabel,
  localTodayStr,
  sumDeductions,
} from '../lib/payPeriod.js'
import PayPeriodPanel from './PayPeriodPanel.jsx'

// Biểu đồ tròn (donut) tự vẽ bằng SVG — chỉ hiện SỐ TỔNG ở giữa; chi tiết xem ở
// chú thích bên dưới (không nhãn trong lát).
function Donut({ segments, centerValue, centerLabel, size = 128, stroke = 22 }) {
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
function StatsCharts({ st, deductions = [] }) {
  const dedTotal = sumDeductions(deductions)
  const dedsSorted = [...deductions]
    .filter((d) => Number(d.amount) > 0)
    .sort((a, b) => String(a.deduct_date).localeCompare(String(b.deduct_date)))
  const net = st.pay - dedTotal
  // Lát của donut Lương: thực nhận (sau trừ) + tổng bị trừ + mất do trễ. Tổng =
  // lương nếu đi đúng giờ. Lát nào = 0 sẽ tự bỏ.
  const moneySegments = [
    {
      label: 'Thực nhận',
      value: Math.max(0, net),
      color: C.good,
      display: formatMoney(net),
    },
    dedTotal > 0 && {
      label: 'Tiền bồi thường',
      value: dedTotal,
      color: C.ded,
      display: formatMoney(dedTotal),
    },
    st.lostPay > 0 && {
      label: 'Mất do trễ',
      value: st.lostPay,
      color: C.lost,
      display: formatMoney(st.lostPay),
    },
  ].filter(Boolean)
  // Lát donut "Tiền bị trừ": mỗi khoản (theo lý do) một lát.
  const dedSegments = dedsSorted.map((d, i) => ({
    label: d.reason || '(không lý do)',
    value: Number(d.amount),
    color: DED_COLORS[i % DED_COLORS.length],
    display: formatMoney(d.amount),
  }))
  return (
    <div className="stats-donuts">
      <DonutBlock
        title="Lương"
        segments={moneySegments}
        centerValue={pct(net, st.idealPay)}
        centerLabel="thực nhận"
      />
      {dedSegments.length > 0 ? (
        <DonutBlock
          title="Tiền bồi thường"
          segments={dedSegments}
          centerValue={formatMoney(dedTotal)}
          centerLabel="tổng"
        />
      ) : (
        <div className="donut-block donut-empty">
          <span className="donut-title">Tiền bồi thường</span>
          <p className="muted">Không có khoản trừ.</p>
        </div>
      )}
      <DonutBlock
        title="Giờ ngày / đêm"
        segments={[
          {
            label: 'Giờ ngày',
            value: st.dayHours,
            color: C.day,
            display: `${formatHours(st.dayHours)} h`,
          },
          {
            label: 'Giờ đêm',
            value: st.nightHours,
            color: C.night,
            display: `${formatHours(st.nightHours)} h`,
          },
        ]}
        centerValue={`${formatHours(st.hours)}h`}
        centerLabel="tổng giờ"
      />
      <DonutBlock
        title="Số ca ngày / đêm"
        segments={[
          {
            label: 'Ca ngày',
            value: st.dayShiftCount,
            color: C.day,
            display: `${st.dayShiftCount} ca`,
          },
          {
            label: 'Ca đêm',
            value: st.nightShiftCount,
            color: C.night,
            display: `${st.nightShiftCount} ca`,
          },
        ]}
        centerValue={`${st.dayShiftCount + st.nightShiftCount}`}
        centerLabel="tổng ca"
      />
    </div>
  )
}

// Popup chứa biểu đồ thống kê của một kỳ (hoặc tổng).
function StatsModal({ title, st, deductions, onClose }) {
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
            aria-label="Đóng"
          >
            ×
          </button>
        </div>
        <StatsCharts st={st} deductions={deductions} />
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
  onClose,
}) {
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
    openScope === 'all' ? 'Tất cả các kỳ' : payPeriodLabel(openScope || '')

  return (
    <div className="salary-page">
      <div className="salary-page-inner">
        <div className="salary-page-head">
          <h1>Kỳ lương</h1>
          <button type="button" className="salary-back" onClick={onClose}>
            ← Quay lại
          </button>
        </div>

        <p className="muted scope-hint">Bấm vào một kỳ để xem biểu đồ chi tiết.</p>

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
                  <span className="period-stat-label">Tất cả các kỳ</span>
                  <span className="period-stat-main">
                    {formatHours(s.hours)} h · {formatMoney(s.pay)}
                  </span>
                  {s.lostPay > 0 && (
                    <span className="period-stat-lost">
                      Mất do trễ −{formatMoney(s.lostPay)}
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
                    Mất do trễ −{formatMoney(s.lostPay)}
                  </span>
                )}
              </button>
            )
          })}

          {periodKeys.length === 0 && (
            <p className="muted">Chưa có ca làm nào để thống kê.</p>
          )}
        </div>

        {/* Chức năng cũ: danh sách kỳ đã nhận + khoản trừ + đánh dấu */}
        <h2 className="salary-section-title">Các kỳ đã nhận</h2>
        <PayPeriodPanel
          shifts={shifts}
          payrolls={payrolls}
          deductions={deductions}
          payday={payday}
          onMarkReceived={onMarkReceived}
          onUnmark={onUnmark}
          onAddDeduction={onAddDeduction}
          onDeleteDeduction={onDeleteDeduction}
        />
      </div>

      {openScope && (
        <StatsModal
          title={openTitle}
          st={periodStats(shiftsOf(openScope))}
          deductions={
            openScope === 'all'
              ? deductions
              : deductions.filter((d) => d.period_key === openScope)
          }
          onClose={() => setOpenScope(null)}
        />
      )}
    </div>
  )
}
