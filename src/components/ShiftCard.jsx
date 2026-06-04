import { useState } from 'react'
import { computeShift, formatHours, formatMoney } from '../lib/shiftMath.js'

function hhmm(t) {
  return String(t).slice(0, 5) // "HH:MM:SS" -> "HH:MM"
}

export default function ShiftCard({ shift, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [workDate, setWorkDate] = useState(shift.work_date)
  const [start, setStart] = useState(hhmm(shift.start_time))
  const [end, setEnd] = useState(hhmm(shift.end_time))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  function cancel() {
    setWorkDate(shift.work_date)
    setStart(hhmm(shift.start_time))
    setEnd(hhmm(shift.end_time))
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
    })
    setBusy(false)
    if (err) setError(err)
    else setEditing(false)
  }

  if (editing) {
    const preview = computeShift(start, end)
    return (
      <div className="shift-card editing">
        <div className="edit-fields">
          <input
            type="date"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
          />
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
          <span className="muted">
            {formatHours(preview.decimalHours)}h · {formatMoney(preview.pay)}
          </span>
        </div>
        <div className="edit-actions">
          <button type="button" onClick={save} disabled={busy}>
            {busy ? '…' : 'Save'}
          </button>
          <button type="button" className="link" onClick={cancel}>
            Cancel
          </button>
        </div>
        {error && <p className="msg error">{error}</p>}
      </div>
    )
  }

  const s = hhmm(shift.start_time)
  const e = hhmm(shift.end_time)
  const { decimalHours, dayHours, nightHours, pay } = computeShift(s, e)
  const crossesMidnight = e <= s

  return (
    <div className="shift-card">
      <div className="shift-times">
        {s} – {e}
        {crossesMidnight && <span className="next-day"> (+1d)</span>}
      </div>
      <div className="shift-breakdown">
        <span>{formatHours(decimalHours)} h</span>
        <span className="muted">
          Day {formatHours(dayHours)}h · Night {formatHours(nightHours)}h
        </span>
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
