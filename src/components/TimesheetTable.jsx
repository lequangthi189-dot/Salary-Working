import {
  computeEffective,
  shiftTotals,
  formatHours,
  formatMoney,
  hhmm,
} from '../lib/shiftMath.js'
import { useI18n } from '../lib/i18n.jsx'

// "2025-06-05" -> "05/06"
function dm(d) {
  const [, m, day] = String(d).split('-')
  return `${day}/${m}`
}

// Bảng công dạng lưới (như Excel) — CHỈ XEM. Mỗi ca một dòng, sắp theo ngày tăng
// dần; dòng cuối là tổng cộng. Dùng trong popup tra cứu kỳ lương cũ.
export default function TimesheetTable({ shifts, hasNightShift = true }) {
  const { t } = useI18n()

  // Bỏ thẻ ca chỉ-là-lịch-dự-kiến khi ngày đó đã có chấm công thật (giống Timesheet).
  const actualDates = new Set(
    shifts.filter((s) => s.start_time).map((s) => s.work_date)
  )
  const rows = shifts
    .filter(
      (s) => !(s.scheduled_start && !s.start_time && actualDates.has(s.work_date))
    )
    .sort((a, b) => String(a.work_date).localeCompare(String(b.work_date)))

  if (rows.length === 0) {
    return <p className="empty">{t('tt.empty')}</p>
  }

  const totals = shiftTotals(rows)

  return (
    <div className="tt-wrap">
      <table className="tt-table">
        <thead>
          <tr>
            <th>{t('tt.date')}</th>
            <th>{t('tt.in')}</th>
            <th>{t('tt.out')}</th>
            <th>{t('tt.dayH')}</th>
            {hasNightShift && <th>{t('tt.nightH')}</th>}
            <th>{t('tt.late')}</th>
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
            const noActual = !start || !end
            const inStr = noActual ? hhmm(s.scheduled_start) || '—' : start
            const outStr = noActual ? hhmm(s.scheduled_end) || '—' : end
            return (
              <tr key={s.id} className={noActual ? 'tt-planned' : undefined}>
                <td>{dm(s.work_date)}</td>
                <td className={noActual ? 'muted' : undefined}>{inStr}</td>
                <td className={noActual ? 'muted' : undefined}>{outStr}</td>
                <td>{eff.dayHours > 0 ? formatHours(eff.dayHours) : '—'}</td>
                {hasNightShift && (
                  <td>{eff.nightHours > 0 ? formatHours(eff.nightHours) : '—'}</td>
                )}
                <td className={eff.lostHours > 0 ? 'lost' : undefined}>
                  {eff.lostHours > 0 ? formatHours(eff.lostHours) : '—'}
                </td>
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
            <td className={totals.lostHours > 0 ? 'lost' : undefined}>
              {totals.lostHours > 0 ? formatHours(totals.lostHours) : '—'}
            </td>
            <td className="tt-pay">{formatMoney(totals.pay)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
