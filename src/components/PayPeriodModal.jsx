import { useState } from 'react'
import { periodStats, formatHours, formatMoney } from '../lib/shiftMath.js'
import { payPeriodLabel, paymentWindow } from '../lib/payPeriod.js'

function pad2(n) {
  return String(n).padStart(2, '0')
}

// "2025-06-05" -> "05/06/2025"
function fmtDate(d) {
  if (!d) return ''
  const [y, m, day] = String(d).split('-')
  return `${day}/${m}/${y}`
}

// Popup thống kê một kỳ lương + đánh dấu đã nhận.
export default function PayPeriodModal({
  periodKey,
  shifts,
  payroll,
  payday,
  onMarkReceived,
  onUnmark,
  onClose,
}) {
  const stats = periodStats(shifts)
  const pay = paymentWindow(periodKey)
  const received = !!payroll
  const [day, setDay] = useState(payday || 1)
  const [busy, setBusy] = useState(false)

  async function mark() {
    setBusy(true)
    // received_on = ngày `day` trong tháng trả lương của kỳ này.
    await onMarkReceived(periodKey, `${pay.year}-${pad2(pay.month)}-${pad2(day)}`)
    setBusy(false)
  }

  async function unmark() {
    setBusy(true)
    await onUnmark(periodKey)
    setBusy(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card wide"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{payPeriodLabel(periodKey)}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        {/* Khối lương ngày / đêm / tổng */}
        <div className="summary">
          <div className="stat">
            <span className="stat-value">{formatHours(stats.hours)}</span>
            <span className="stat-label">Tổng giờ</span>
          </div>
          <div className="stat">
            <span className="stat-value">{formatHours(stats.dayHours)}</span>
            <span className="stat-label">Giờ ngày</span>
          </div>
          <div className="stat">
            <span className="stat-value">{formatHours(stats.nightHours)}</span>
            <span className="stat-label">Giờ đêm</span>
          </div>
          <div className="stat stat-pay">
            <span className="stat-value">{formatMoney(stats.dayPay)}</span>
            <span className="stat-label">Lương ca ngày</span>
          </div>
          <div className="stat stat-pay">
            <span className="stat-value">{formatMoney(stats.nightPay)}</span>
            <span className="stat-label">Lương ca đêm</span>
          </div>
          <div className="stat stat-pay stat-grand">
            <span className="stat-value">{formatMoney(stats.pay)}</span>
            <span className="stat-label">Tổng lương</span>
          </div>
        </div>

        {/* Bảng chỉ số thêm */}
        <table className="stat-table">
          <tbody>
            <tr>
              <th>Số ca</th>
              <td>{stats.shiftCount}</td>
              <th>Số ngày công</th>
              <td>{stats.workDays}</td>
            </tr>
            <tr>
              <th>TB giờ/ngày</th>
              <td>{formatHours(stats.avgHoursPerDay)} h</td>
              <th>Giờ bị mất</th>
              <td>{formatHours(stats.lostHours)} h</td>
            </tr>
          </tbody>
        </table>

        <p className="muted">
          Trả lương: 01–10/{pad2(pay.month)}/{pay.year}
        </p>

        {/* Trạng thái nhận lương */}
        {received ? (
          <div className="received-row">
            <span className="received-badge">
              ✓ Đã nhận lương
              {payroll.received_on ? ` · ${fmtDate(payroll.received_on)}` : ''}
            </span>
            <button
              type="button"
              className="link"
              onClick={unmark}
              disabled={busy}
            >
              Bỏ đánh dấu
            </button>
          </div>
        ) : (
          <div className="received-row">
            <label className="inline-day">
              Ngày nhận
              <select
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="account-btn change-pw-btn"
              onClick={mark}
              disabled={busy}
            >
              {busy ? '…' : 'Đã nhận lương'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
