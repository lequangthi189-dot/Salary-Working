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

const emptyMonth = {
  hours: 0,
  dayHours: 0,
  nightHours: 0,
  pay: 0,
  lostPay: 0,
  idealPay: 0,
  dayShiftCount: 0,
  nightShiftCount: 0,
}

export default function ShiftForm({
  onAdd,
  monthStats = emptyMonth,
  minWorkDate,
  schedByDate = new Map(),
  onReceiveSalary,
  receiveDisabled = true,
  receiveDue = false,
}) {
  // Mặc định = hôm nay theo GIỜ ĐỊA PHƯƠNG (thời gian thực). Ô <input type="date">
  // cho phép chọn lùi về ngày trước tùy ý.
  const [workDate, setWorkDate] = useState(localTodayStr())
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [schedStart, setSchedStart] = useState('09:00')
  const [schedEnd, setSchedEnd] = useState('17:00')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Ngày đang chọn đã có lịch dự kiến (vd nhập từ ảnh) → ẩn ô Sched, không nhập lại.
  const daySched = schedByDate.get(workDate)
  const hasSched = !!daySched
  // Mốc lịch dự kiến để tính trễ: nếu ngày đã có lịch (import) thì dùng lịch đó cho
  // ca thêm tay; nếu chưa thì dùng ô Sched nhập trong form.
  const effSchedStart = hasSched ? daySched.start : schedStart
  const effSchedEnd = hasSched ? daySched.end : schedEnd
  const preview = computeEffective(effSchedStart, effSchedEnd, startTime, endTime)
  const lostText = formatLost(preview)
  const equalTimes = startTime === endTime
  const overLimit = preview.decimalHours > MAX_HOURS_PER_DAY + 1e-9
  // Lịch dự kiến cũng không được quá 8 giờ/ca.
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
      {/* Thống kê THÁNG NÀY (kỳ hiện tại) + thẻ "nếu đúng giờ / đã mất" bên phải */}
      <div className="board-summary">
        <div className="summary">
          <div className="stat stat-total">
            <span className="stat-value">{formatHours(monthStats.hours)}</span>
            <span className="stat-label">Tổng giờ tháng này</span>
          </div>
          <div className="stat">
            <span className="stat-value">{formatHours(monthStats.dayHours)}</span>
            <span className="stat-label">Giờ ngày</span>
          </div>
          <div className="stat">
            <span className="stat-value">{formatHours(monthStats.nightHours)}</span>
            <span className="stat-label">Giờ đêm</span>
          </div>
          <div className="stat">
            <span className="stat-value">{monthStats.dayShiftCount}</span>
            <span className="stat-label">Ca ngày</span>
          </div>
          <div className="stat">
            <span className="stat-value">{monthStats.nightShiftCount}</span>
            <span className="stat-label">Ca đêm</span>
          </div>
          <div className="stat stat-pay stat-grand">
            <span className="stat-value">{formatMoney(monthStats.pay)}</span>
            <span className="stat-label">Lương tháng này</span>
          </div>
        </div>

        <div className="whatif-card">
          <div className="whatif-row good">
            <span>Nếu đi đúng giờ</span>
            <strong>{formatMoney(monthStats.idealPay)}</strong>
          </div>
          <div className="whatif-row bad">
            <span>Đã mất vì đi trễ</span>
            <strong>−{formatMoney(monthStats.lostPay)}</strong>
          </div>
        </div>
      </div>

      {/* Xem nhanh ca đang nhập (ngày/đêm), chữ to + màu động */}
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

      {/* Ngày của ca làm — nằm dưới phần giờ, trên check-in/check-out */}
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

      {hasSched ? (
        <p className="muted import-empcode">
          Ngày này đã có lịch dự kiến ({daySched.start}–{daySched.end}) — chỉ cần
          nhập Check-in / Check-out, hệ thống tự tính trễ so với lịch.
        </p>
      ) : (
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

      {schedOverLimit && (
        <p className="lost">
          Lịch dự kiến tối đa {MAX_HOURS_PER_DAY} giờ — đang {formatHours(schedDur)}h.
        </p>
      )}
      {overLimit && (
        <p className="lost">
          Một ca tối đa {MAX_HOURS_PER_DAY} giờ — đang {formatHours(preview.decimalHours)}h.
        </p>
      )}

      <div className="form-actions">
        {/* Chỉ hiện khi đã tới ngày nhận lương; còn lại chỉ có Add shift */}
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
