import { useState } from 'react'
import {
  computeEffective,
  formatHours,
  formatMoney,
  formatLost,
} from '../lib/shiftMath.js'
import TimeInput from './TimeInput.jsx'
import { localTodayStr } from '../lib/payPeriod.js'
import { useI18n } from '../lib/i18n.jsx'

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
  hasNightShift = true,
}) {
  const { t } = useI18n()
  // --- STATE các trường nhập ---
  const [workDate, setWorkDate] = useState(localTodayStr())
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [isHoliday, setIsHoliday] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Ngày đang chọn đã có lịch dự kiến (nhập từ "Nhập lịch tuần") → dùng làm mốc
  // tính trễ. Không nhập giờ lịch tay ở form ngày nữa; ngày không có lịch dự kiến
  // thì scheduled_* = null (không có mốc trễ).
  const daySched = schedByDate.get(workDate)
  const effSchedStart = daySched ? daySched.start : ''
  const effSchedEnd = daySched ? daySched.end : ''

  // --- TÍNH TOÁN xem trước (preview) cho dòng trạng thái/cảnh báo ---
  const preview = computeEffective(
    effSchedStart,
    effSchedEnd,
    startTime,
    endTime,
    isHoliday
  )
  const lostText = formatLost(preview)
  const equalTimes = startTime === endTime

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!workDate) {
      setError(t('shiftForm.pickDate'))
      return
    }
    setBusy(true)
    // Truyền dữ liệu ca lên CHA (App) qua callback.
    const err = await onAdd({
      work_date: workDate,
      start_time: startTime,
      end_time: endTime,
      scheduled_start: effSchedStart || null,
      scheduled_end: effSchedEnd || null,
      is_holiday: isHoliday,
    })
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <form className="shift-form" onSubmit={handleSubmit}>
      <h2 className="form-title">{t('shiftForm.title')}</h2>

      {/* Ngày làm */}
      <div className="fields date-row">
        <label>
          {t('shiftForm.date')}
          <input
            type="date"
            value={workDate}
            min={minWorkDate}
            onChange={(e) => setWorkDate(e.target.value)}
            required
          />
        </label>
      </div>

      {/* Giờ check-in / check-out + Ngày lễ (cùng hàng) */}
      <div className="fields check-row">
        <label className="checkin">
          {t('shiftForm.checkin')}
          <TimeInput value={startTime} onChange={setStartTime} required />
        </label>
        <label className="checkout">
          {t('shiftForm.checkout')}
          <TimeInput value={endTime} onChange={setEndTime} required />
        </label>
        <label className="holiday-check">
          <input
            type="checkbox"
            checked={isHoliday}
            onChange={(e) => setIsHoliday(e.target.checked)}
          />
          {t('shiftForm.holiday')}
        </label>
      </div>

      {/* Dòng trạng thái tính toán ca + cảnh báo (đỏ/cam) ngay dưới các ô nhập */}
      <p className="preview-line">
        {t('shiftForm.preview', {
          type:
            hasNightShift && preview.nightHours > preview.dayHours
              ? t('common.night')
              : t('common.day'),
          hours: formatHours(preview.decimalHours),
          money: formatMoney(preview.pay),
        })}
        {equalTimes && t('shiftForm.full24')}
      </p>
      {lostText && (
        <p className="lost">
          {lostText} · −{formatMoney(preview.lostPay)}
        </p>
      )}
      {/* Hàng nút: "Đã nhận lương" (khi tới hạn) + "Add shift" */}
      <div className="form-actions">
        {receiveDue && !receiveDisabled && (
          <button
            type="button"
            className="btn-received"
            onClick={onReceiveSalary}
            title={t('shiftForm.receivedTitle')}
          >
            {t('shiftForm.received')}
          </button>
        )}
        <button
          type="submit"
          className="btn-addshift"
          disabled={busy}
        >
          {busy ? t('shiftForm.adding') : t('shiftForm.addShift')}
        </button>
      </div>
      {error && <p className="msg error">{error}</p>}
    </form>
  )
}
