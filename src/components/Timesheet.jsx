import ShiftCard from './ShiftCard.jsx'
import { computeShift, formatHours, formatMoney } from '../lib/shiftMath.js'

function hhmm(t) {
  return String(t).slice(0, 5)
}

function shiftTotals(list) {
  return list.reduce(
    (acc, s) => {
      const r = computeShift(hhmm(s.start_time), hhmm(s.end_time))
      acc.hours += r.decimalHours
      acc.pay += r.pay
      return acc
    },
    { hours: 0, pay: 0 }
  )
}

export default function Timesheet({ shifts, onDelete, onUpdate }) {
  if (shifts.length === 0) {
    return <p className="empty">No shifts yet. Add your first one above.</p>
  }

  // Group by work_date, preserving the incoming (date-desc) order.
  const groups = []
  const byDate = new Map()
  for (const s of shifts) {
    if (!byDate.has(s.work_date)) {
      const g = { date: s.work_date, items: [] }
      byDate.set(s.work_date, g)
      groups.push(g)
    }
    byDate.get(s.work_date).items.push(s)
  }

  const grand = shiftTotals(shifts)

  return (
    <div className="timesheet">
      {groups.map((g) => {
        const t = shiftTotals(g.items)
        return (
          <section key={g.date} className="date-group">
            <header className="date-header">
              <span className="date-label">{g.date}</span>
              <span className="muted">{formatHours(t.hours)} h</span>
              <span className="pay">{formatMoney(t.pay)}</span>
            </header>
            <div className="shift-list">
              {g.items.map((s) => (
                <ShiftCard
                  key={s.id}
                  shift={s}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                />
              ))}
            </div>
          </section>
        )
      })}

      <div className="totals">
        <span>Total ({shifts.length} shifts)</span>
        <span>{formatHours(grand.hours)} h</span>
        <span className="pay">{formatMoney(grand.pay)}</span>
      </div>
    </div>
  )
}
