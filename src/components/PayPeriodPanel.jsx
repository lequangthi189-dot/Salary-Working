import { useState } from 'react'
import { shiftTotals, formatMoney, formatHours } from '../lib/shiftMath.js'
import { payPeriodKeyOf, payPeriodLabel } from '../lib/payPeriod.js'
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
  payday,
  onMarkReceived,
  onUnmark,
}) {
  const [openKey, setOpenKey] = useState(null)

  // Gom shifts theo kỳ.
  const byPeriod = new Map()
  for (const s of shifts) {
    const key = payPeriodKeyOf(s.work_date)
    if (!byPeriod.has(key)) byPeriod.set(key, [])
    byPeriod.get(key).push(s)
  }

  const payrollByKey = new Map((payrolls || []).map((p) => [p.period_key, p]))

  // Chỉ hiện kỳ ĐÃ NHẬN (có dòng payrolls), sắp mới → cũ.
  const keys = [...payrollByKey.keys()]
    .filter((k) => byPeriod.has(k))
    .sort()
    .reverse()

  return (
    <div className="period-list">
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
          payday={payday}
          onMarkReceived={onMarkReceived}
          onUnmark={onUnmark}
          onClose={() => setOpenKey(null)}
        />
      )}
    </div>
  )
}
