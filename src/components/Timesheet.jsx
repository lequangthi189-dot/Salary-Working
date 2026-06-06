import ShiftCard from './ShiftCard.jsx'
import { formatHours, formatMoney, shiftTotals } from '../lib/shiftMath.js'

export default function Timesheet({ shifts, onDelete, onUpdate }) {
  if (shifts.length === 0) {
    return <p className="empty">No shifts yet. Add your first one above.</p>
  }

  // Ngày đã có chấm công thật (có check-in). Với những ngày đó, ẩn thẻ ca chỉ-là-
  // lịch-dự-kiến (có Sched nhưng chưa check-in) — đã chấm công thì không cần hiện nữa.
  const actualDates = new Set(
    shifts.filter((s) => s.start_time).map((s) => s.work_date)
  )
  const visibleShifts = shifts.filter(
    (s) => !(s.scheduled_start && !s.start_time && actualDates.has(s.work_date))
  )

  // Group by work_date, preserving the incoming (date-desc) order.
  const groups = []
  const byDate = new Map()
  for (const s of visibleShifts) {
    if (!byDate.has(s.work_date)) {
      const g = { date: s.work_date, items: [] }
      byDate.set(s.work_date, g)
      groups.push(g)
    }
    byDate.get(s.work_date).items.push(s)
  }

  return (
    <div className="timesheet">
      {groups.map((g) => {
        const t = shiftTotals(g.items)
        return (
          <section key={g.date} className="date-group">
            <header className="date-header">
              <span className="date-label">{g.date}</span>
              <span className="muted">
                {formatHours(t.hours)} h · Day {formatHours(t.dayHours)}h ·
                Night {formatHours(t.nightHours)}h
                {t.lostHours > 0 && (
                  <span className="lost"> · Lost {formatHours(t.lostHours)}h</span>
                )}
              </span>
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
    </div>
  )
}
