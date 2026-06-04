import { useState } from 'react'
import { computeShift, formatHours, formatMoney } from '../lib/shiftMath.js'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function ShiftForm({ onAdd }) {
  const [workDate, setWorkDate] = useState(todayStr())
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const preview = computeShift(startTime, endTime)
  const equalTimes = startTime === endTime

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!workDate) {
      setError('Please pick a date.')
      return
    }
    setBusy(true)
    const err = await onAdd({
      work_date: workDate,
      start_time: startTime,
      end_time: endTime,
    })
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <form className="shift-form" onSubmit={handleSubmit}>
      <div className="fields">
        <label>
          Date
          <input
            type="date"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
            required
          />
        </label>
        <label>
          Start
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </label>
        <label>
          End
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </label>
      </div>

      <div className="preview">
        <span>
          <strong>{formatHours(preview.decimalHours)}</strong> h
          {equalTimes && ' (full 24h — same start & end)'}
        </span>
        <span>
          Day {formatHours(preview.dayHours)}h · Night{' '}
          {formatHours(preview.nightHours)}h
        </span>
        <span className="pay">{formatMoney(preview.pay)}</span>
      </div>

      <button type="submit" disabled={busy}>
        {busy ? 'Adding…' : 'Add shift'}
      </button>
      {error && <p className="msg error">{error}</p>}
    </form>
  )
}
