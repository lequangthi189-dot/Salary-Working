import { useState } from 'react'
import { useI18n } from '../lib/i18n.jsx'
import LangToggle from './LangToggle.jsx'
import { DEFAULT_NIGHT_PCT } from '../lib/rates.js'

// Form thông tin nhân viên — BẮT BUỘC điền sau đăng ký mới vào được app.
// Thứ tự: họ, tên, mã NV, lương 1 giờ, phụ cấp đêm (%), phụ cấp lễ ca ngày/đêm (%).
// Cũng dùng lại để chỉnh trong Hồ sơ (truyền onCancel để hiện nút Hủy).
export default function EmployeeInfoForm({ initial = {}, onSave, onCancel }) {
  const { t } = useI18n()
  const [lastName, setLastName] = useState(initial.last_name || '')
  const [firstName, setFirstName] = useState(initial.first_name || '')
  const [employeeCode, setEmployeeCode] = useState(initial.employee_code || '')
  const [hourlyRate, setHourlyRate] = useState(
    initial.hourly_rate != null ? String(initial.hourly_rate) : ''
  )
  const [nightPct, setNightPct] = useState(
    initial.night_pct != null ? String(initial.night_pct) : String(DEFAULT_NIGHT_PCT)
  )
  const [holidayDayPct, setHolidayDayPct] = useState(
    initial.holiday_day_pct != null ? String(initial.holiday_day_pct) : '300'
  )
  const [holidayNightPct, setHolidayNightPct] = useState(
    initial.holiday_night_pct != null ? String(initial.holiday_night_pct) : '300'
  )
  const [hasNightShift, setHasNightShift] = useState(
    initial.has_night_shift != null ? initial.has_night_shift : true
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!lastName.trim() || !firstName.trim()) {
      setError(t('emp.errRequired'))
      return
    }
    if (!employeeCode.trim()) {
      setError(t('emp.errRequired'))
      return
    }
    const rate = Math.round(Number(hourlyRate))
    if (!Number.isFinite(rate) || rate <= 0) {
      setError(t('emp.errRate'))
      return
    }
    const pct = (v) => {
      const n = Math.round(Number(v))
      return Number.isFinite(n) && n >= 0 ? n : 0
    }
    setBusy(true)
    const err = await onSave({
      lastName: lastName.trim(),
      firstName: firstName.trim(),
      employeeCode: employeeCode.trim(),
      hourlyRate: rate,
      nightPct: pct(nightPct),
      holidayDayPct: pct(holidayDayPct),
      holidayNightPct: pct(holidayNightPct),
      hasNightShift,
    })
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <div className="auth-card emp-card">
      <div className="auth-lang">
        <LangToggle />
      </div>
      <h1>{t('emp.title')}</h1>
      <p className="subtitle">{t('emp.subtitle')}</p>

      <form onSubmit={submit}>
        <label>
          {t('emp.lastName')}
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </label>
        <label>
          {t('emp.firstName')}
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </label>
        <label>
          {t('auth.employeeCode')}
          <input
            type="text"
            value={employeeCode}
            onChange={(e) => setEmployeeCode(e.target.value)}
            required
          />
        </label>
        <label>
          {t('emp.hasNightShift')}
          <select
            value={hasNightShift ? '1' : '0'}
            onChange={(e) => setHasNightShift(e.target.value === '1')}
          >
            <option value="1">{t('common.yes')}</option>
            <option value="0">{t('common.no')}</option>
          </select>
        </label>
        <label>
          {t('emp.hourlyRate')}
          <input
            type="number"
            min="0"
            step="500"
            inputMode="numeric"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            required
            placeholder="25500"
          />
        </label>
        <label>
          {t('emp.nightPct')}
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={nightPct}
            onChange={(e) => setNightPct(e.target.value)}
            required
          />
        </label>
        <label>
          {t('emp.holidayDayPct')}
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={holidayDayPct}
            onChange={(e) => setHolidayDayPct(e.target.value)}
            required
          />
        </label>
        <label>
          {t('emp.holidayNightPct')}
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={holidayNightPct}
            onChange={(e) => setHolidayNightPct(e.target.value)}
            required
          />
        </label>

        <div className="emp-actions">
          <button type="submit" disabled={busy}>
            {busy ? '…' : t('emp.save')}
          </button>
          {onCancel && (
            <button type="button" className="link" onClick={onCancel}>
              {t('common.cancel')}
            </button>
          )}
        </div>
      </form>

      {error && <p className="msg error">{error}</p>}
    </div>
  )
}
