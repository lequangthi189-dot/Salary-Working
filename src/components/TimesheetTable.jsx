import { useState } from 'react'
import {
  computeEffective,
  shiftTotals,
  formatHours,
  formatMoney,
  hhmm,
} from '../lib/shiftMath.js'
import { useI18n } from '../lib/i18n.jsx'

function pad2(n) {
  return String(n).padStart(2, '0')
}

// "2025-06-05" -> "05/06"
function dm(d) {
  const [, m, day] = String(d).split('-')
  return `${day}/${m}`
}

// Thứ 2 (đầu tuần) của tuần chứa ngày này, dạng "YYYY-MM-DD". Tuần bắt đầu THỨ 2.
function mondayOf(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dow = (dt.getDay() + 6) % 7 // 0 = Thứ 2 … 6 = Chủ nhật
  dt.setDate(dt.getDate() - dow)
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`
}

// Bảng công dạng lưới (như Excel) — CHỈ XEM. Chỉ liệt kê ca ĐÃ CHẤM CÔNG (có giờ
// vào); ngày chưa chấm công bị bỏ hẳn. Có bộ lọc theo tuần (tuần bắt đầu Thứ 2).
export default function TimesheetTable({ shifts, hasNightShift = true }) {
  const { t } = useI18n()
  const [week, setWeek] = useState('all') // 'all' | mốc Thứ 2 của tuần

  // Chỉ ca đã chấm công (có giờ vào), sắp theo ngày tăng dần.
  const checkedIn = shifts
    .filter((s) => s.start_time)
    .sort((a, b) => String(a.work_date).localeCompare(String(b.work_date)))

  if (checkedIn.length === 0) {
    return <p className="empty">{t('tt.empty')}</p>
  }

  // Các tuần có dữ liệu (mốc Thứ 2), đánh số 1, 2, 3… theo thứ tự thời gian.
  const weekAnchors = [...new Set(checkedIn.map((s) => mondayOf(s.work_date)))].sort()
  const weekNo = new Map(weekAnchors.map((a, i) => [a, i + 1]))
  // Khoảng ngày thực tế của từng tuần (để hiện trong tooltip nút lọc).
  const weekSpan = new Map()
  for (const s of checkedIn) {
    const a = mondayOf(s.work_date)
    const cur = weekSpan.get(a)
    if (!cur) weekSpan.set(a, { min: s.work_date, max: s.work_date })
    else if (s.work_date > cur.max) cur.max = s.work_date
  }

  const rows =
    week === 'all'
      ? checkedIn
      : checkedIn.filter((s) => mondayOf(s.work_date) === week)
  const totals = shiftTotals(rows)

  return (
    <div className="tt-wrap">
      {weekAnchors.length > 1 && (
        <div className="shift-filter tt-weeks">
          <button
            type="button"
            className={`shift-filter-btn${week === 'all' ? ' active' : ''}`}
            onClick={() => setWeek('all')}
          >
            {t('filter.all')}
          </button>
          {weekAnchors.map((a) => {
            const sp = weekSpan.get(a)
            return (
              <button
                key={a}
                type="button"
                className={`shift-filter-btn${week === a ? ' active' : ''}`}
                onClick={() => setWeek(a)}
                title={`${dm(sp.min)} – ${dm(sp.max)}`}
              >
                {t('tt.week', { n: weekNo.get(a) })}
              </button>
            )
          })}
        </div>
      )}

      <table className="tt-table">
        <colgroup>
          <col style={{ width: '10%' }} />
          <col style={{ width: hasNightShift ? '21%' : '22%' }} />
          <col style={{ width: hasNightShift ? '21%' : '22%' }} />
          <col style={{ width: hasNightShift ? '12%' : '19%' }} />
          {hasNightShift && <col style={{ width: '12%' }} />}
          <col style={{ width: hasNightShift ? '24%' : '27%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>{t('tt.date')}</th>
            <th className="tt-sched">{t('tt.sched')}</th>
            <th>{t('tt.actual')}</th>
            <th>{t('tt.dayH')}</th>
            {hasNightShift && <th>{t('tt.nightH')}</th>}
            <th className="tt-pay">{t('tt.pay')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const start = hhmm(s.start_time)
            const end = hhmm(s.end_time)
            const eff = computeEffective(
              hhmm(s.scheduled_start),
              hhmm(s.scheduled_end),
              start,
              end,
              !!s.is_holiday
            )
            const schedIn = hhmm(s.scheduled_start)
            const schedOut = hhmm(s.scheduled_end)
            const sched = schedIn || schedOut ? `${schedIn || '—'}–${schedOut || '—'}` : '—'
            return (
              <tr key={s.id}>
                <td>{dm(s.work_date)}</td>
                <td className="tt-sched">{sched}</td>
                <td>{`${start}–${end || '—'}`}</td>
                <td>{eff.dayHours > 0 ? formatHours(eff.dayHours) : '—'}</td>
                {hasNightShift && (
                  <td>{eff.nightHours > 0 ? formatHours(eff.nightHours) : '—'}</td>
                )}
                <td className="tt-pay">{formatMoney(eff.pay)}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td>{t('tt.total')}</td>
            <td colSpan={2}>{formatHours(totals.hours)} h</td>
            <td>{formatHours(totals.dayHours)}</td>
            {hasNightShift && <td>{formatHours(totals.nightHours)}</td>}
            <td className="tt-pay">{formatMoney(totals.pay)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
