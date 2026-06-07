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
import { localTodayStr } from '../lib/payPeriod.js'

// ShiftForm = KHỐI NHẬP CA (cột phải). Tự quản lý state các ô nhập; khi bấm
// "Add shift" gọi callback onAdd(shiftData) để truyền dữ liệu lên component cha (App).
// schedByDate (từ cha) cho biết ngày đã có lịch dự kiến để ẩn ô Sched + làm mốc tính trễ.
export default function ShiftForm({
  onAdd,
  minWorkDate,
  schedByDate = new Map(),
  onReceiveSalary,
  receiveDisabled = true,
  receiveDue = false,
}) {
  // --- STATE các trường nhập ---
  const [workDate, setWorkDate] = useState(localTodayStr())
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [schedStart, setSchedStart] = useState('09:00')
  const [schedEnd, setSchedEnd] = useState('17:00')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Ngày đang chọn đã có lịch dự kiến (vd nhập từ ảnh) → ẩn ô Sched, dùng lịch đó.
  const daySched = schedByDate.get(workDate)
  const hasSched = !!daySched
  const effSchedStart = hasSched ? daySched.start : schedStart
  const effSchedEnd = hasSched ? daySched.end : schedEnd

  // --- TÍNH TOÁN xem trước (preview) cho dòng trạng thái/cảnh báo ---
  const preview = computeEffective(effSchedStart, effSchedEnd, startTime, endTime)
  const lostText = formatLost(preview)
  const equalTimes = startTime === endTime
  const overLimit = preview.decimalHours > MAX_HOURS_PER_DAY + 1e-9
  const schedDur = durationHours(effSchedStart, effSchedEnd)
  const schedOverLimit = schedDur > MAX_HOURS_PER_DAY + 1e-9

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!workDate) {
      setError('Please pick a date.')
      return
    }
    if (schedOverLimit) {
      setError(
        `Lịch dự kiến không được quá ${MAX_HOURS_PER_DAY} giờ (đang ${formatHours(
          schedDur
        )}h).`
      )
      return
    }
    if (overLimit) {
      setError(
        `Một ca không được quá ${MAX_HOURS_PER_DAY} giờ (đang ${formatHours(
          preview.decimalHours
        )}h).`
      )
      return
    }
    setBusy(true)
    // Truyền dữ liệu ca lên CHA (App) qua callback.
    const err = await onAdd({
      work_date: workDate,
      start_time: startTime,
      end_time: endTime,
      scheduled_start: effSchedStart,
      scheduled_end: effSchedEnd,
    })
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <form className="shift-form" onSubmit={handleSubmit}>
      <h2 className="form-title">Nhập ca làm việc</h2>

      {/* Ngày làm */}
      <div className="fields date-row">
        <label>
          Date
          <input
            type="date"
            value={workDate}
            min={minWorkDate}
            onChange={(e) => setWorkDate(e.target.value)}
            required
          />
        </label>
      </div>

      {/* Giờ check-in / check-out */}
      <div className="fields check-row">
        <label className="checkin">
          Check-in
          <TimeInput value={startTime} onChange={setStartTime} required />
        </label>
        <label className="checkout">
          Check-out
          <TimeInput value={endTime} onChange={setEndTime} required />
        </label>
      </div>

      {!hasSched && (
        <div className="fields scheduled">
          <label>
            Sched. start
            <TimeInput value={schedStart} onChange={setSchedStart} />
          </label>
          <label>
            Sched. end
            <TimeInput value={schedEnd} onChange={setSchedEnd} />
          </label>
        </div>
      )}

      {/* Dòng trạng thái tính toán ca + cảnh báo (đỏ/cam) ngay dưới các ô nhập */}
      <p className="preview-line">
        Ca đang nhập ({preview.nightHours > preview.dayHours ? 'đêm' : 'ngày'}):{' '}
        {formatHours(preview.decimalHours)} h · {formatMoney(preview.pay)}
        {equalTimes && ' · full 24h (giờ vào = giờ ra)'}
      </p>
      {lostText && (
        <p className="lost">
          {lostText} · −{formatMoney(preview.lostPay)}
        </p>
      )}
      {schedOverLimit && (
        <p className="lost">
          Lịch dự kiến tối đa {MAX_HOURS_PER_DAY} giờ — đang {formatHours(schedDur)}h.
        </p>
      )}
      {overLimit && (
        <p className="lost">
          Một ca tối đa {MAX_HOURS_PER_DAY} giờ — đang{' '}
          {formatHours(preview.decimalHours)}h.
        </p>
      )}

      {/* Hàng nút: "Đã nhận lương" (khi tới hạn) + "Add shift" */}
      <div className="form-actions">
        {receiveDue && !receiveDisabled && (
          <button
            type="button"
            className="btn-received"
            onClick={onReceiveSalary}
            title="Đã tới ngày nhận lương — bấm để đánh dấu đã nhận"
          >
            Đã nhận lương
          </button>
        )}
        <button
          type="submit"
          className="btn-addshift"
          disabled={busy || overLimit || schedOverLimit}
        >
          {busy ? 'Adding…' : 'Add shift'}
        </button>
      </div>
      {error && <p className="msg error">{error}</p>}
    </form>
  )
}
