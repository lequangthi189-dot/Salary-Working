import { useState } from 'react'
import ShiftCard from './ShiftCard.jsx'
import {
  formatHours,
  formatMoney,
  shiftTotals,
  computeEffective,
  computeShift,
  hhmm,
} from '../lib/shiftMath.js'
import { useI18n } from '../lib/i18n.jsx'

// Phân loại ca là 'day' hay 'night': ưu tiên giờ thực tế, nếu chưa check-in thì
// theo lịch dự kiến. Ca đêm = giờ đêm > giờ ngày.
function shiftKind(s) {
  const eff = computeEffective(
    hhmm(s.scheduled_start),
    hhmm(s.scheduled_end),
    hhmm(s.start_time),
    hhmm(s.end_time),
    !!s.is_holiday
  )
  let day = eff.dayHours
  let night = eff.nightHours
  if (day === 0 && night === 0 && s.scheduled_start && s.scheduled_end) {
    const sc = computeShift(hhmm(s.scheduled_start), hhmm(s.scheduled_end))
    day = sc.dayHours
    night = sc.nightHours
  }
  // Ca đêm = có giờ làm trong khung 22:00–06:00.
  return night > 0 ? 'night' : 'day'
}

export default function Timesheet({ shifts, onDelete, onUpdate }) {
  const { t: tr } = useI18n()
  const [filter, setFilter] = useState('all') // 'all' | 'day' | 'night'

  if (shifts.length === 0) {
    return <p className="empty">{tr('timesheet.empty')}</p>
  }

  // Ngày đã có chấm công thật (có check-in). Với những ngày đó, ẩn thẻ ca chỉ-là-
  // lịch-dự-kiến (có Sched nhưng chưa check-in) — đã chấm công thì không cần hiện nữa.
  const actualDates = new Set(
    shifts.filter((s) => s.start_time).map((s) => s.work_date)
  )
  const visibleShifts = shifts
    .filter(
      (s) => !(s.scheduled_start && !s.start_time && actualDates.has(s.work_date))
    )
    .filter((s) => filter === 'all' || shiftKind(s) === filter)

  const filterBar = (
    <div className="shift-filter">
      {['all', 'day', 'night'].map((f) => (
        <button
          key={f}
          type="button"
          className={`shift-filter-btn${filter === f ? ' active' : ''}`}
          onClick={() => setFilter(f)}
        >
          {tr(`filter.${f}`)}
        </button>
      ))}
    </div>
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
      {filterBar}
      {groups.length === 0 && <p className="empty">{tr('filter.none')}</p>}
      {groups.map((g) => {
        const t = shiftTotals(g.items)
        return (
          <section key={g.date} className="date-group">
            <header className="date-header">
              <span className="date-label">{g.date}</span>
              <span className="muted">
                {formatHours(t.hours)} h
                {t.dayHours > 0 && (
                  <span className="hours-detail">
                    {' '}· {tr('timesheet.day')} {formatHours(t.dayHours)}h
                  </span>
                )}
                {t.nightHours > 0 && (
                  <span className="hours-detail">
                    {' '}· {tr('timesheet.night')} {formatHours(t.nightHours)}h
                  </span>
                )}
                {t.lostHours > 0 && (
                  <span className="lost">
                    {' '}· {tr('timesheet.late')} {formatHours(t.lostHours)}h
                  </span>
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
