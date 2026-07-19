import { useState, useMemo } from 'react'
import ShiftCard from './ShiftCard.jsx'
import { Skeleton, SkeletonText } from './Skeleton.jsx'
import {
  formatHours,
  formatMoney,
  shiftTotals,
  computeEffective,
  computeShift,
  hhmm,
} from '../lib/shiftMath.js'
import { matchesShiftSearch } from '../lib/shiftRules.js'
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

// Skeleton bảng công: vài thẻ ngày, mỗi thẻ có dòng tiêu đề (ngày + giờ + tiền)
// và 1-2 thẻ ca giả — đủ gợi ý danh sách đang tải, khớp hình .date-group/.shift-card.
function TimesheetSkeleton() {
  const { t: tr } = useI18n()
  const groups = [2, 1, 2] // số thẻ ca giả trong mỗi ngày
  return (
    <div
      className="timesheet"
      role="status"
      aria-busy="true"
      aria-label={tr('common.loading')}
    >
      {groups.map((rows, gi) => (
        <section key={gi} className="date-group">
          <header className="date-header">
            <Skeleton className="date-label" width="7rem" height="0.9rem" />
            <Skeleton className="muted" width="9rem" height="0.8rem" />
            <Skeleton className="pay" width="5rem" height="0.9rem" />
          </header>
          <div className="shift-list">
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className="shift-card shift-card--skeleton">
                <SkeletonText width="80%" />
                <SkeletonText width="70%" />
                <Skeleton width="4rem" height="1rem" />
                <Skeleton width="2rem" height="1rem" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export default function Timesheet({
  shifts,
  onDelete,
  onUpdate,
  hasNightShift = true,
  loading = false,
}) {
  const { t: tr } = useI18n()
  const [filter, setFilter] = useState('all') // 'all' | 'day' | 'night'
  const [search, setSearch] = useState('') // ô tìm ca (ngày / giờ / loại ca)

  // Nhóm theo ngày, memoize theo [shifts, filter, search] để không lọc/nhóm lại khi
  // render vì lý do khác. Là hook nên phải đứng TRƯỚC các return sớm bên dưới.
  const groups = useMemo(() => {
    // Ngày đã có chấm công thật (có check-in). Với những ngày đó, ẩn thẻ ca chỉ-là-
    // lịch-dự-kiến (có Sched nhưng chưa check-in) — đã chấm công thì không cần hiện nữa.
    const actualDates = new Set(
      shifts.filter((s) => s.start_time).map((s) => s.work_date)
    )
    const query = search.trim()
    const searching = query !== ''
    // Nút LỌC (ngày/đêm) + Ô SEARCH chạy CÙNG NHAU: một ca phải QUA CẢ HAI mới hiện
    // (vd lọc "Ca đêm" + gõ "10/6" → chỉ ca đêm ngày 10/6). Chỉ phân loại shiftKind khi
    // CẦN (đang lọc ngày/đêm hoặc đang search) để không tính thừa lúc xem tất cả.
    const needKind = filter !== 'all' || searching
    const visibleShifts = shifts.filter((s) => {
      if (s.scheduled_start && !s.start_time && actualDates.has(s.work_date))
        return false
      if (!needKind) return true
      const kind = shiftKind(s)
      if (filter !== 'all' && kind !== filter) return false // nút lọc ngày/đêm
      if (searching && !matchesShiftSearch(s, kind, query)) return false // ô search
      return true
    })

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
    return groups
    // hasNightShift trong deps vì shiftKind phân loại theo cửa sổ đêm (foldNight).
  }, [shifts, filter, search, hasNightShift])

  // Đang tải lần đầu → skeleton; xong mà rỗng → "chưa có ca"; lỗi được App hiện riêng.
  if (loading) return <TimesheetSkeleton />

  if (shifts.length === 0) {
    return <p className="empty">{tr('timesheet.empty')}</p>
  }

  const searching = search.trim() !== ''

  // Thanh công cụ NGANG trên đầu danh sách: ô SEARCH + các nút LỌC ngày/đêm cạnh nhau
  // (cùng mục đích thu hẹp danh sách). Ô search luôn hiện; nút lọc chỉ hiện khi có ca đêm.
  const toolbar = (
    <div className="shift-toolbar">
      <div className="shift-search">
        <svg
          className="shift-search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className="shift-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tr('search.placeholder')}
          aria-label={tr('search.aria')}
        />
        {searching && (
          <button
            type="button"
            className="shift-search-clear"
            onClick={() => setSearch('')}
            aria-label={tr('search.clear')}
            title={tr('search.clear')}
          >
            ×
          </button>
        )}
      </div>
      {hasNightShift && (
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
      )}
    </div>
  )

  return (
    <div className="timesheet">
      {toolbar}
      {groups.length === 0 && (
        <p className="empty">
          {searching ? tr('search.noResults') : tr('filter.none')}
        </p>
      )}
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
