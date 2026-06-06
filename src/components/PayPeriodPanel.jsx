import { useState } from 'react'
import { shiftTotals, formatMoney, formatHours } from '../lib/shiftMath.js'
import {
  payPeriodKeyOf,
  payPeriodLabel,
  sumDeductions,
} from '../lib/payPeriod.js'
import PayPeriodModal from './PayPeriodModal.jsx'

// "2025-06-05" -> "05/06/2025"
function fmtDate(d) {
  if (!d) return ''
  const [y, m, day] = String(d).split('-')
  return `${day}/${m}/${y}`
}

// Cột trái: danh sách kỳ lương ĐÃ NHẬN (tạo khi bấm "Đã nhận lương").
export default function PayPeriodPanel({
  shifts,
  payrolls,
  deductions = [],
  payday,
  onMarkReceived,
  onUnmark,
  onAddDeduction,
  onDeleteDeduction,
}) {
  const [openKey, setOpenKey] = useState(null)

  // Gom shifts theo kỳ.
  const byPeriod = new Map()
  for (const s of shifts) {
    const key = payPeriodKeyOf(s.work_date)
    if (!byPeriod.has(key)) byPeriod.set(key, [])
    byPeriod.get(key).push(s)
  }

  // Gom khoản trừ theo kỳ.
  const dedByPeriod = new Map()
  for (const d of deductions) {
    if (!dedByPeriod.has(d.period_key)) dedByPeriod.set(d.period_key, [])
    dedByPeriod.get(d.period_key).push(d)
  }

  const payrollByKey = new Map((payrolls || []).map((p) => [p.period_key, p]))

  // Chỉ hiện kỳ ĐÃ NHẬN (có dòng payrolls), sắp mới → cũ.
  const keys = [...payrollByKey.keys()]
    .filter((k) => byPeriod.has(k))
    .sort()
    .reverse()

  // Tổng cộng dồn tất cả kỳ đã nhận: lương gộp, bị trừ, và thực nhận (= gộp − trừ).
  const grandGross = keys.reduce(
    (sum, k) => sum + shiftTotals(byPeriod.get(k)).pay,
    0
  )
  const grandDed = keys.reduce(
    (sum, k) => sum + sumDeductions(dedByPeriod.get(k) || []),
    0
  )
  const grandNet = grandGross - grandDed

  return (
    <div className="period-list">
      {keys.length > 0 && (
        <div className="period-total">
          <span className="period-total-label">Tổng thực nhận (sau trừ)</span>
          <span className="period-total-value">{formatMoney(grandNet)}</span>
          <span className="period-total-sub">
            Trước trừ {formatMoney(grandGross)} · đã trừ −{formatMoney(grandDed)}
          </span>
        </div>
      )}
      {keys.length === 0 ? (
        <p className="muted">
          Chưa có kỳ lương nào được đánh dấu đã nhận. Bấm "Đã nhận lương" ở khung
          nhập ca khi đã nhận tiền.
        </p>
      ) : (
        keys.map((key) => {
          const items = byPeriod.get(key)
          const t = shiftTotals(items)
          const pr = payrollByKey.get(key)
          const deds = dedByPeriod.get(key) || []
          const dedTotal = sumDeductions(deds)
          // Sắp các khoản trừ theo ngày tăng dần để liệt kê.
          const dedsSorted = [...deds].sort((a, b) =>
            String(a.deduct_date).localeCompare(String(b.deduct_date))
          )
          return (
            <button
              type="button"
              key={key}
              className="period-card"
              onClick={() => setOpenKey(key)}
            >
              <span className="period-card-head">
                <span className="period-card-label">{payPeriodLabel(key)}</span>
                <span className="received-badge sm">✓ Đã nhận</span>
              </span>
              <span className="period-card-meta">
                {formatHours(t.hours)} h · {formatMoney(t.pay)}
              </span>
              {dedTotal > 0 && (
                <span className="period-card-net">
                  Bị trừ −{formatMoney(dedTotal)} · Thực nhận{' '}
                  {formatMoney(t.pay - dedTotal)}
                </span>
              )}
              {dedsSorted.length > 0 && (
                <span className="period-card-deds">
                  {dedsSorted.map((d) => (
                    <span key={d.id} className="period-ded-row">
                      <span className="period-ded-date">
                        {fmtDate(d.deduct_date)}
                      </span>
                      <span className="period-ded-reason">{d.reason}</span>
                      <span className="period-ded-amt">
                        −{formatMoney(d.amount)}
                      </span>
                    </span>
                  ))}
                </span>
              )}
              {pr?.received_on && (
                <span className="period-card-date">
                  Nhận ngày {fmtDate(pr.received_on)}
                </span>
              )}
            </button>
          )
        })
      )}

      {openKey && (
        <PayPeriodModal
          periodKey={openKey}
          shifts={byPeriod.get(openKey)}
          payroll={payrollByKey.get(openKey) || null}
          deductions={dedByPeriod.get(openKey) || []}
          payday={payday}
          onMarkReceived={onMarkReceived}
          onUnmark={onUnmark}
          onAddDeduction={onAddDeduction}
          onDeleteDeduction={onDeleteDeduction}
          onClose={() => setOpenKey(null)}
        />
      )}
    </div>
  )
}
