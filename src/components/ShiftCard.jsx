import { useState } from 'react'
import { computeEffective, formatHours, formatMoney } from '../lib/shiftMath.js'
import TimeInput from './TimeInput.jsx'

function hhmm(t) {
  return t ? String(t).slice(0, 5) : '' // "HH:MM:SS" -> "HH:MM"
}

export default function ShiftCard({ shift, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [workDate, setWorkDate] = useState(shift.work_date)
  const [start, setStart] = useState(hhmm(shift.start_time))
  const [end, setEnd] = useState(hhmm(shift.end_time))
  const [schedStart, setSchedStart] = useState(hhmm(shift.scheduled_start))
  const [schedEnd, setSchedEnd] = useState(hhmm(shift.scheduled_end))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  function cancel() {
    setWorkDate(shift.work_date)
    setStart(hhmm(shift.start_time))
    setEnd(hhmm(shift.end_time))
    setSchedStart(hhmm(shift.scheduled_start))
    setSchedEnd(hhmm(shift.scheduled_end))
    setError(null)
    setEditing(false)
  }

  async function save() {
    setBusy(true)
    setError(null)
    const err = await onUpdate(shift.id, {
      work_date: workDate,
      start_time: start,
      end_time: end,
      scheduled_start: schedStart || null,
      scheduled_end: schedEnd || null,
    })
    setBusy(false)
    if (err) setError(err)
    else setEditing(false)
  }

  if (editing) {
    const preview = computeEffective(schedStart, schedEnd, start, end)
    return (
      <div className="shift-card editing">
        <div className="edit-fields">
          <input
            type="date"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
          />
          <TimeInput
            className="t-in"
            title="Check-in"
            value={start}
            onChange={setStart}
          />
          <TimeInput
            className="t-out"
            title="Check-out"
            value={end}
            onChange={setEnd}
          />
          <span className="muted">
            {formatHours(preview.decimalHours)}h · {formatMoney(preview.pay)}
          </span>
        </div>
        <div className="edit-actions">
          <button type="button" className="btn-save" onClick={save} disabled={busy}>
            {busy ? '…' : 'Save'}
          </button>
          <button type="button" className="btn-cancel" onClick={cancel}>
            Cancel
          </button>
        </div>
        {error && <p className="msg error">{error}</p>}
      </div>
    )
  }

  const s = hhmm(shift.start_time)
  const e = hhmm(shift.end_time)
  const eff = computeEffective(
    hhmm(shift.scheduled_start),
    hhmm(shift.scheduled_end),
    s,
    e
  )
  const { decimalHours, dayHours, nightHours, pay } = eff
  // Phân loại ca: ca đêm nếu giờ đêm nhiều hơn giờ ngày.
  const isNight = nightHours > dayHours
  // Chỉ hiện giờ trễ của đúng loại ca (ngày → trễ ngày, đêm → trễ đêm).
  const lostHours = isNight ? eff.lostNightHours : eff.lostDayHours
  const crossesMidnight = e <= s

  return (
    <div className="shift-card">
      <div className="shift-times">
        <span className="t-in">{s}</span>
        <span className="dash"> – </span>
        <span className="t-out">{e}</span>
        {crossesMidnight && <span className="next-day"> (+1d)</span>}
      </div>
      <div className="shift-breakdown">
        <span>{formatHours(decimalHours)} h</span>
        <span className="muted">
          {isNight
            ? `Night ${formatHours(nightHours)}h`
            : `Day ${formatHours(dayHours)}h`}
        </span>
        {lostHours > 0 && (
          <span className="lost">
            Trễ {formatHours(lostHours)}h {isNight ? '(đêm)' : '(ngày)'}
          </span>
        )}
      </div>
      <div className="shift-pay">{formatMoney(pay)}</div>
      <div className="shift-actions">
        <button
          type="button"
          className="edit"
          onClick={() => setEditing(true)}
          aria-label="Edit shift"
        >
          ✎
        </button>
        <button
          type="button"
          className="delete"
          onClick={() => onDelete(shift.id)}
          aria-label="Delete shift"
        >
          ×
        </button>
      </div>
    </div>
  )
}
