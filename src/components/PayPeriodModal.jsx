import { useState } from 'react'
import { periodStats, formatHours, formatMoney } from '../lib/shiftMath.js'
import { payPeriodLabel, paymentWindow, sumDeductions } from '../lib/payPeriod.js'
import DeductionsCard from './DeductionsCard.jsx'
import { useI18n } from '../lib/i18n.jsx'

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
  deductions = [],
  payday,
  onMarkReceived,
  onUnmark,
  onAddDeduction,
  onDeleteDeduction,
  onClose,
}) {
  const { t } = useI18n()
  const stats = periodStats(shifts)
  const dedTotal = sumDeductions(deductions)
  const netPay = stats.pay - dedTotal
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
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>

        {/* Khối lương ngày / đêm / tổng */}
        <div className="summary">
          <div className="stat">
            <span className="stat-value">{formatHours(stats.hours)}</span>
            <span className="stat-label">{t('ppm.totalHours')}</span>
          </div>
          <div className="stat">
            <span className="stat-value">{formatHours(stats.dayHours)}</span>
            <span className="stat-label">{t('ppm.dayHours')}</span>
          </div>
          <div className="stat">
            <span className="stat-value">{formatHours(stats.nightHours)}</span>
            <span className="stat-label">{t('ppm.nightHours')}</span>
          </div>
          <div className="stat stat-pay stat-grand">
            <span className="stat-value">{formatMoney(stats.pay)}</span>
            <span className="stat-label">{t('ppm.totalPay')}</span>
          </div>
          {dedTotal > 0 && (
            <div className="stat stat-pay stat-grand stat-net">
              <span className={`stat-value${netPay < 0 ? ' neg' : ''}`}>
                {formatMoney(netPay)}
              </span>
              <span className="stat-label">{t('ppm.netPay')}</span>
            </div>
          )}
        </div>

        {/* Khoản bị trừ của kỳ — chỉnh được ngay tại đây */}
        <DeductionsCard
          periodKey={periodKey}
          deductions={deductions}
          grossPay={stats.pay}
          onAdd={onAddDeduction}
          onDelete={onDeleteDeduction}
          defaultOpen={dedTotal > 0}
        />

        {/* Bảng chỉ số thêm */}
        <table className="stat-table">
          <tbody>
            <tr>
              <th>{t('ppm.shiftCount')}</th>
              <td>{stats.shiftCount}</td>
              <th>{t('ppm.workDays')}</th>
              <td>{stats.workDays}</td>
            </tr>
            <tr>
              <th>{t('ppm.avgHours')}</th>
              <td>{formatHours(stats.avgHoursPerDay)} h</td>
              <th>{t('ppm.lostHours')}</th>
              <td>{formatHours(stats.lostHours)} h</td>
            </tr>
          </tbody>
        </table>

        <p className="muted">
          {t('ppm.payWindow', { m: pad2(pay.month), y: pay.year })}
        </p>

        {/* Trạng thái nhận lương */}
        {received ? (
          <div className="received-row">
            <span className="received-badge">
              {t('ppm.receivedBadge')}
              {payroll.received_on ? ` · ${fmtDate(payroll.received_on)}` : ''}
            </span>
            <button
              type="button"
              className="link"
              onClick={unmark}
              disabled={busy}
            >
              {t('ppm.unmark')}
            </button>
          </div>
        ) : (
          <div className="received-row">
            <label className="inline-day">
              {t('ppm.receiveDay')}
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
              {busy ? '…' : t('ppm.markReceived')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
