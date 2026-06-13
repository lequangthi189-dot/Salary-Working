import { useState, useEffect, useRef } from 'react'
import { useI18n } from '../lib/i18n.jsx'
import LangToggle from './LangToggle.jsx'
import { DEFAULT_NIGHT_PCT } from '../lib/rates.js'
import { getRate } from '../lib/currency.jsx'

// Quy đổi giữa VND (lưu trong DB) và ngoại tệ đang hiển thị.
const CUR_CODE = { en: 'GBP', us: 'USD', au: 'AUD' }
function vndToCur(vnd, lang) {
  const code = CUR_CODE[lang]
  if (!code) return vnd
  const r = getRate(code)
  return r ? vnd * r : vnd
}
function curToVnd(amount, lang) {
  const code = CUR_CODE[lang]
  if (!code) return amount
  const r = getRate(code)
  return r ? amount / r : amount
}
// Chuỗi cho ô lương: VND → số nguyên; ngoại tệ → tối đa 2 số lẻ.
function fmtRateInput(vnd, lang) {
  if (vnd == null || vnd === '') return ''
  const v = vndToCur(Number(vnd), lang)
  return lang === 'vi' || !CUR_CODE[lang]
    ? String(Math.round(v))
    : String(Number(v.toFixed(2)))
}

// Lưu nháp thông tin nhân viên (chỉ ở chế độ gate sau đăng ký) để bấm "Quay lại
// đăng ký" rồi quay vào không mất dữ liệu. sessionStorage: tự xoá khi đóng tab.
const EMP_DRAFT = 'empinfo-draft'
function loadEmpDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(EMP_DRAFT) || '{}')
  } catch {
    return {}
  }
}
function saveEmpDraft(d) {
  try {
    sessionStorage.setItem(EMP_DRAFT, JSON.stringify(d))
  } catch {
    /* ignore */
  }
}
function clearEmpDraft() {
  try {
    sessionStorage.removeItem(EMP_DRAFT)
  } catch {
    /* ignore */
  }
}

// Form thông tin nhân viên — BẮT BUỘC điền sau đăng ký mới vào được app.
// Thứ tự: họ, tên, mã NV, lương 1 giờ, phụ cấp đêm (%), phụ cấp lễ ca ngày/đêm (%).
// Cũng dùng lại để chỉnh trong Hồ sơ (truyền onCancel để hiện nút Hủy).
// Ký hiệu tiền theo ngôn ngữ (khớp với formatMoney).
const CUR_SYMBOL = { vi: 'VND', en: '£', us: '$', au: 'A$' }

export default function EmployeeInfoForm({ initial = {}, onSave, onCancel, onBack }) {
  const { t, lang } = useI18n()
  const cur = CUR_SYMBOL[lang] || 'VND'
  // Chỉ giữ nháp ở chế độ gate (có onBack), không áp dụng khi chỉnh trong Hồ sơ.
  const [draft] = useState(() => (onBack ? loadEmpDraft() : {}))
  const pick = (k, fallback) => (draft[k] !== undefined ? draft[k] : fallback)

  const [lastName, setLastName] = useState(pick('lastName', initial.last_name || ''))
  const [firstName, setFirstName] = useState(
    pick('firstName', initial.first_name || '')
  )
  const [employeeCode, setEmployeeCode] = useState(
    pick('employeeCode', initial.employee_code || '')
  )
  const [hourlyRate, setHourlyRate] = useState(
    pick('hourlyRate', fmtRateInput(initial.hourly_rate, lang))
  )
  const [nightPct, setNightPct] = useState(
    pick(
      'nightPct',
      initial.night_pct != null ? String(initial.night_pct) : String(DEFAULT_NIGHT_PCT)
    )
  )
  const [holidayDayPct, setHolidayDayPct] = useState(
    pick(
      'holidayDayPct',
      initial.holiday_day_pct != null ? String(initial.holiday_day_pct) : '300'
    )
  )
  const [holidayNightPct, setHolidayNightPct] = useState(
    pick(
      'holidayNightPct',
      initial.holiday_night_pct != null ? String(initial.holiday_night_pct) : '300'
    )
  )
  const [hasNightShift, setHasNightShift] = useState(
    pick('hasNightShift', initial.has_night_shift != null ? initial.has_night_shift : true)
  )
  // Giờ bắt đầu/kết thúc ca đêm ("HH:MM"). DB trả "HH:MM:SS" → cắt còn "HH:MM".
  const [nightStart, setNightStart] = useState(
    pick('nightStart', (initial.night_start || '22:00').slice(0, 5))
  )
  const [nightEnd, setNightEnd] = useState(
    pick('nightEnd', (initial.night_end || '06:00').slice(0, 5))
  )
  const [periodStartDay, setPeriodStartDay] = useState(
    pick('periodStartDay', String(initial.period_start_day ?? 26))
  )
  const [periodEndDay, setPeriodEndDay] = useState(
    pick('periodEndDay', String(initial.period_end_day ?? 25))
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Đổi ngôn ngữ giữa chừng → quy đổi số tiền đang nhập sang đơn vị tiền mới.
  const prevLang = useRef(lang)
  useEffect(() => {
    if (prevLang.current === lang) return
    const from = prevLang.current
    prevLang.current = lang
    setHourlyRate((v) => (v ? fmtRateInput(curToVnd(Number(v), from), lang) : v))
  }, [lang])

  // Lưu nháp mỗi khi đổi (chỉ chế độ gate).
  useEffect(() => {
    if (!onBack) return
    saveEmpDraft({
      lastName,
      firstName,
      employeeCode,
      hourlyRate,
      nightPct,
      holidayDayPct,
      holidayNightPct,
      hasNightShift,
      nightStart,
      nightEnd,
      periodStartDay,
      periodEndDay,
    })
  }, [
    onBack,
    lastName,
    firstName,
    employeeCode,
    hourlyRate,
    nightPct,
    holidayDayPct,
    holidayNightPct,
    hasNightShift,
    nightStart,
    nightEnd,
    periodStartDay,
    periodEndDay,
  ])

  // Ngày tính công hợp lệ 1–28 (tránh lệ thuộc độ dài tháng).
  const clampDay = (v, fallback) => {
    const n = Math.round(Number(v))
    return Number.isInteger(n) && n >= 1 && n <= 28 ? n : fallback
  }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!lastName.trim() || !firstName.trim()) {
      setError(t('emp.errRequired'))
      return
    }
    // Nhập theo đơn vị tiền đang hiển thị → quy về VND để lưu.
    const rate = Math.round(curToVnd(Number(hourlyRate), lang))
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
      // Chỉ lưu giờ ca đêm khi có ca đêm; không thì để mặc định 22:00–06:00.
      nightStart: hasNightShift ? nightStart : '22:00',
      nightEnd: hasNightShift ? nightEnd : '06:00',
      periodStartDay: clampDay(periodStartDay, 26),
      periodEndDay: clampDay(periodEndDay, 25),
    })
    setBusy(false)
    if (err) setError(err)
    else clearEmpDraft() // lưu xong thì bỏ nháp
  }

  // Ô lương: hiển thị có dấu phân cách nghìn (VND dùng "." như tiền bồi thường;
  // ngoại tệ dùng "," + giữ phần thập phân). State `hourlyRate` luôn là số thô.
  const isVndRate = lang === 'vi' || !CUR_CODE[lang]
  const groupSep = isVndRate ? '.' : ','
  const rateDisplay = (() => {
    if (hourlyRate === '') return ''
    const [ip, dp] = String(hourlyRate).split('.')
    const grouped = (ip || '').replace(/\B(?=(\d{3})+(?!\d))/g, groupSep)
    return dp !== undefined ? `${grouped}.${dp}` : grouped
  })()
  function onChangeRate(input) {
    if (isVndRate) {
      setHourlyRate(input.replace(/\D/g, '')) // VND: chỉ số nguyên
    } else {
      let s = input.replace(/[^\d.]/g, '') // ngoại tệ: số + 1 dấu chấm thập phân
      const i = s.indexOf('.')
      if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '')
      setHourlyRate(s)
    }
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
          {t('emp.hourlyRate', { cur })}
          <input
            type="text"
            inputMode="decimal"
            value={rateDisplay}
            onChange={(e) => onChangeRate(e.target.value)}
            required
            placeholder={isVndRate ? '25.500' : ''}
          />
        </label>
        {hasNightShift && (
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
        )}
        {hasNightShift && (
          <div className="emp-period">
            <label>
              {t('emp.nightStart')}
              <input
                type="time"
                value={nightStart}
                onChange={(e) => setNightStart(e.target.value)}
                required
              />
            </label>
            <label>
              {t('emp.nightEnd')}
              <input
                type="time"
                value={nightEnd}
                onChange={(e) => setNightEnd(e.target.value)}
                required
              />
            </label>
          </div>
        )}
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
        {hasNightShift && (
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
        )}

        <div className="emp-period">
          <label>
            {t('emp.periodStartDay')}
            <input
              type="number"
              min="1"
              max="28"
              step="1"
              inputMode="numeric"
              value={periodStartDay}
              onChange={(e) => setPeriodStartDay(e.target.value)}
              required
            />
          </label>
          <label>
            {t('emp.periodEndDay')}
            <input
              type="number"
              min="1"
              max="28"
              step="1"
              inputMode="numeric"
              value={periodEndDay}
              onChange={(e) => setPeriodEndDay(e.target.value)}
              required
            />
          </label>
        </div>
        <p className="planned-hint">{t('emp.periodHint')}</p>

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

      {onBack && (
        <button type="button" className="link" onClick={onBack}>
          ← {t('emp.back')}
        </button>
      )}

      {error && <p className="msg error">{error}</p>}
    </div>
  )
}
