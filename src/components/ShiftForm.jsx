import { useState, useEffect } from 'react'
import {
  computeEffective,
  formatHours,
  formatMoney,
  formatLost,
} from '../lib/shiftMath.js'
import TimeInput from './TimeInput.jsx'
import Checkbox from './Checkbox.jsx'
import { localTodayStr } from '../lib/payPeriod.js'
import { useI18n } from '../lib/i18n.jsx'

// Giờ "HH:MM" của thời điểm HIỆN TẠI (đồng hồ máy người dùng).
function nowHHMM() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

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
  const [startTime, setStartTime] = useState(nowHHMM())
  const [endTime, setEndTime] = useState(nowHHMM())
  // Ô giờ vào/ra mặc định CHẠY THEO GIỜ THỰC; khi người dùng tự gõ thì ô đó
  // "đã chạm" và dừng cập nhật để giữ giá trị họ đặt.
  const [startTouched, setStartTouched] = useState(false)
  const [endTouched, setEndTouched] = useState(false)
  const [isHoliday, setIsHoliday] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Đồng hồ real-time: mỗi giây bơm giờ hiện tại vào ô CHƯA bị chạm. Dùng dạng
  // functional + so sánh trước để KHÔNG schedule update khi phút chưa đổi (giá trị
  // "HH:MM" chỉ đổi mỗi phút, interval chạy mỗi giây).
  useEffect(() => {
    if (startTouched && endTouched) return
    const id = setInterval(() => {
      const now = nowHHMM()
      if (!startTouched) setStartTime((v) => (v === now ? v : now))
      if (!endTouched) setEndTime((v) => (v === now ? v : now))
    }, 1000)
    return () => clearInterval(id)
  }, [startTouched, endTouched])

  // Form còn "nguyên": cả hai ô vẫn đang chạy theo giờ thực (chưa ai sửa).
  const pristine = !startTouched && !endTouched

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
    else {
      // Thêm xong → trả ô giờ về CHẠY THEO GIỜ THỰC cho lần nhập kế tiếp.
      setStartTouched(false)
      setEndTouched(false)
      setStartTime(nowHHMM())
      setEndTime(nowHHMM())
    }
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
          <TimeInput
            value={startTime}
            onChange={(v) => {
              setStartTouched(true)
              setStartTime(v)
            }}
            required
          />
        </label>
        <label className="checkout">
          {t('shiftForm.checkout')}
          <TimeInput
            value={endTime}
            onChange={(v) => {
              setEndTouched(true)
              setEndTime(v)
            }}
            required
          />
        </label>
        <Checkbox
          className="holiday-check"
          checked={isHoliday}
          onChange={(e) => setIsHoliday(e.target.checked)}
          label={t('shiftForm.holiday')}
        />
      </div>

      {/* Dòng trạng thái tính toán ca + cảnh báo (đỏ/cam) ngay dưới các ô nhập.
          Khi form còn NGUYÊN (ô giờ đang chạy theo giờ thực) thì KHÔNG hiện gì —
          chưa phải ca thật nên không hiện preview lương 24h gây hiểu nhầm. */}
      {pristine ? null : (
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
      )}
      {!pristine && lostText && (
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
