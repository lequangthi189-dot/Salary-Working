import { useState } from 'react'
import {
  computeEffective,
  durationHours,
  formatHours,
  formatMoney,
  formatLost,
  MAX_HOURS_PER_DAY,
} from '../lib/shiftMath.js'
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
    const schedDur = durationHours(schedStart, schedEnd)
    if (schedDur > MAX_HOURS_PER_DAY + 1e-9) {
      setError(
        `Lịch dự kiến không được quá ${MAX_HOURS_PER_DAY} giờ (đang ${formatHours(
          schedDur
        )}h).`
      )
      return
    }
    setBusy(true)
    setError(null)
    const err = await onUpdate(shift.id, {
      work_date: workDate,
      start_time: start || null,
      end_time: end || null,
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
          <label className="edit-time">
            <span>Vào</span>
            <TimeInput
              className="t-in"
              title="Check-in (giờ thực tế)"
              value={start}
              onChange={setStart}
            />
          </label>
          <label className="edit-time">
            <span>Ra</span>
            <TimeInput
              className="t-out"
              title="Check-out (giờ thực tế)"
              value={end}
              onChange={setEnd}
            />
          </label>
          <label className="edit-time">
            <span>Lịch vào</span>
            <TimeInput
              className="t-sched"
              title="Lịch dự kiến vào (mốc tính trễ)"
              value={schedStart}
              onChange={setSchedStart}
            />
          </label>
          <label className="edit-time">
            <span>Lịch ra</span>
            <TimeInput
              className="t-sched"
              title="Lịch dự kiến ra (mốc tính trễ)"
              value={schedEnd}
              onChange={setSchedEnd}
            />
          </label>
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
  const { pay } = eff
  const schedS = hhmm(shift.scheduled_start)
  const schedE = hhmm(shift.scheduled_end)
  // Giờ trễ = TỔNG so với lịch dự kiến (cả phần ngày lẫn đêm, cả vào trễ lẫn ra sớm).
  // KHÔNG lọc theo loại ca — nếu trễ rơi vào khung giờ khác vẫn phải hiện.
  const lostHours = eff.lostHours
  const lateInHours = eff.lateIn.hours // vào trễ
  const earlyOutHours = eff.earlyOut.hours // ra sớm
  // Ca mới nhập từ lịch (chưa check-in/out) → hiện lịch dự kiến + nhãn "chưa check-in".
  const noActual = !s || !e

  return (
    <div className={`shift-card${noActual ? ' not-checked-in' : ''}`}>
      <div className="shift-times">
        {noActual ? (
          <>
            <span className="t-in muted">{schedS || '—'}</span>
            <span className="dash"> – </span>
            <span className="t-out muted">{schedE || '—'}</span>
            <span className="next-day"> (chưa check-in)</span>
          </>
        ) : (
          <>
            <span className="t-in">{s}</span>
            <span className="dash"> – </span>
            <span className="t-out">{e}</span>
          </>
        )}
      </div>
      <div className="shift-breakdown">
        {lostHours > 0 && (
          <span className="lost" title={formatLost(eff) || undefined}>
            Trễ {formatHours(lostHours)}h
            {(lateInHours > 0 || earlyOutHours > 0) && (
              <span className="lost-detail">
                {lateInHours > 0 && ` · vào trễ ${formatHours(lateInHours)}h`}
                {earlyOutHours > 0 && ` · ra sớm ${formatHours(earlyOutHours)}h`}
              </span>
            )}
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
