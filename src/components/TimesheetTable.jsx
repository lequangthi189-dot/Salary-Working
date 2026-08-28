import { useState, useMemo } from 'react'
import {
  computeEffective,
  shiftTotals,
  formatHours,
  formatMoney,
  hhmm,
} from '../lib/shiftMath.js'
import { dmShort as dm } from '../lib/payPeriod.js'
import { mondayOf } from '../lib/scheduleExtract.js'
import { shiftTimeKey } from '../lib/shiftRules.js'
import { useI18n } from '../lib/i18n.jsx'

// Bảng công dạng lưới (như Excel) — CHỈ XEM. Liệt kê MỌI ca của kỳ, kể cả ca mới
// chỉ có LỊCH DỰ KIẾN (chưa chấm công) — chúng hiện giờ lịch kèm nhãn "chưa
// check-in" và góp 0 vào tổng. Một ngày có thể có nhiều ca nên tất cả đều phải
// thấy được. Có bộ lọc theo tuần (tuần bắt đầu Thứ 2).
export default function TimesheetTable({ shifts }) {
  const { t } = useI18n()
  const [week, setWeek] = useState('all') // 'all' | mốc Thứ 2 của tuần

  // Mọi ca có mốc giờ (thực tế HOẶC lịch dự kiến), sắp theo ngày rồi theo GIỜ VÀO
  // tăng dần — ngày nhiều ca thì đọc theo đúng trình tự trong ngày.
  // Memoize để không lọc/sắp lại khi render vì lý do khác (đổi filter, theme…).
  const { listed, weekAnchors, weekNo, weekSpan } = useMemo(() => {
    const listed = shifts
      .filter((s) => s.start_time || s.scheduled_start)
      .sort(
        (a, b) =>
          String(a.work_date).localeCompare(String(b.work_date)) ||
          shiftTimeKey(a).localeCompare(shiftTimeKey(b))
      )
    // Các tuần có dữ liệu (mốc Thứ 2), đánh số 1, 2, 3… theo thứ tự thời gian.
    const weekAnchors = [
      ...new Set(listed.map((s) => mondayOf(s.work_date))),
    ].sort()
    const weekNo = new Map(weekAnchors.map((a, i) => [a, i + 1]))
    // Khoảng ngày thực tế của từng tuần (để hiện trong tooltip nút lọc).
    const weekSpan = new Map()
    for (const s of listed) {
      const a = mondayOf(s.work_date)
      const cur = weekSpan.get(a)
      if (!cur) weekSpan.set(a, { min: s.work_date, max: s.work_date })
      else if (s.work_date > cur.max) cur.max = s.work_date
    }
    return { listed, weekAnchors, weekNo, weekSpan }
  }, [shifts])

  const rows = useMemo(
    () =>
      week === 'all'
        ? listed
        : listed.filter((s) => mondayOf(s.work_date) === week),
    [listed, week]
  )

  if (listed.length === 0) {
    return <p className="empty">{t('tt.empty')}</p>
  }

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
        <thead>
          <tr>
            <th>{t('tt.date')}</th>
            <th>{t('tt.actual')}</th>
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
            // Chưa chấm công → hiện GIỜ LỊCH (mờ) + nhãn, để ca vẫn có mặt trong
            // bảng thay vì biến mất. Lương của ca này là 0 cho tới khi chấm công.
            const noActual = !start || !end
            return (
              <tr key={s.id} className={noActual ? 'tt-planned' : undefined}>
                <td>{dm(s.work_date)}</td>
                <td>
                  {noActual ? (
                    <>
                      {`${hhmm(s.scheduled_start) || '—'}–${
                        hhmm(s.scheduled_end) || '—'
                      }`}{' '}
                      <span className="muted">{t('shiftCard.notCheckedIn')}</span>
                    </>
                  ) : (
                    `${start}–${end}`
                  )}
                </td>
                <td className="tt-pay">{formatMoney(eff.pay)}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td>{t('tt.total')}</td>
            <td>{formatHours(totals.hours)} h</td>
            <td className="tt-pay">{formatMoney(totals.pay)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
