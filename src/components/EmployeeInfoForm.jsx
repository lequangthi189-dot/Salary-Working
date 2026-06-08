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
  ])

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
    })
    setBusy(false)
    if (err) setError(err)
    else clearEmpDraft() // lưu xong thì bỏ nháp
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
            type="number"
            min="0"
            step={lang === 'vi' || !CUR_CODE[lang] ? '500' : '0.01'}
            inputMode="decimal"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            required
            placeholder={lang === 'vi' || !CUR_CODE[lang] ? '25500' : ''}
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
