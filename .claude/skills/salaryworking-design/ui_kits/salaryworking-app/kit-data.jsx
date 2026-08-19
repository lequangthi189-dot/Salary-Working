/* Fake data + the real pay maths, ported from src/lib/shiftMath.js and rates.js.
   Night window 22:00–06:00 (boundary counts as 100% night); end <= start means the
   shift ends the next day; a shift with a planned time is only paid for the
   INTERSECTION of plan and actual. Rates are per-profile, never hard-coded in UI. */
const RATES = { hourly: 25500, nightPct: 30, holidayDayPct: 200, holidayNightPct: 260 }
const NIGHT_START = 22 * 60
const NIGHT_END = 6 * 60

const dayRate = () => RATES.hourly
const nightRate = () => Math.round(RATES.hourly * (1 + RATES.nightPct / 100))
const holidayDayRate = () => Math.round(RATES.hourly * (RATES.holidayDayPct / 100))
// Holiday NIGHT compounds the ordinary night supplement BEFORE the holiday
// multiplier — (hourly × 1.3) × 260%, not hourly × 260%. Matches
// getHolidayNightRate() in src/lib/rates.js, which is the source of truth.
// Without the compounding this understated holiday-night pay by 23%
// (66,300 instead of 86,190 ₫/h at the sample profile).
const holidayNightRate = () =>
  Math.round(RATES.hourly * (1 + RATES.nightPct / 100) * (RATES.holidayNightPct / 100))

function toMin(hhmm) {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
function overlap(a1, a2, b1, b2) {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1))
}
// Night minutes inside [start, end) where end may exceed 1440 (crosses midnight).
function nightMinutes(start, end) {
  let n = 0
  for (let day = 0; day <= 1; day++) {
    const off = day * 1440
    n += overlap(start, end, off + NIGHT_START, off + 1440)
    n += overlap(start, end, off, off + NIGHT_END)
  }
  return n
}
function span(startHHMM, endHHMM) {
  const s = toMin(startHHMM)
  let e = toMin(endHHMM)
  if (s == null || e == null) return null
  if (e <= s) e += 1440
  return [s, e]
}
function computeShift(startHHMM, endHHMM, isHoliday) {
  const sp = span(startHHMM, endHHMM)
  if (!sp) return { dayHours: 0, nightHours: 0, decimalHours: 0, pay: 0 }
  const [s, e] = sp
  const night = nightMinutes(s, e)
  const day = e - s - night
  const dRate = isHoliday ? holidayDayRate() : dayRate()
  const nRate = isHoliday ? holidayNightRate() : nightRate()
  return {
    dayHours: day / 60,
    nightHours: night / 60,
    decimalHours: (e - s) / 60,
    pay: (day / 60) * dRate + (night / 60) * nRate
  }
}
// Paid = intersection of plan and actual. Early in / late out is never a bonus;
// late in / early out becomes "lost hours" the user can see.
function computeEffective(schedStart, schedEnd, start, end, isHoliday) {
  const actual = span(start, end)
  const plan = span(schedStart, schedEnd)
  if (!actual) return { dayHours: 0, nightHours: 0, decimalHours: 0, pay: 0, lostHours: 0, lostPay: 0, lateIn: 0, earlyOut: 0 }
  if (!plan) return { ...computeShift(start, end, isHoliday), lostHours: 0, lostPay: 0, lateIn: 0, earlyOut: 0 }
  const [ps, pe] = plan
  const [as, ae] = actual
  const from = Math.max(ps, as)
  const to = Math.min(pe, ae)
  const paidNight = to > from ? nightMinutes(from, to) : 0
  const paidDay = to > from ? to - from - paidNight : 0
  const dRate = isHoliday ? holidayDayRate() : dayRate()
  const nRate = isHoliday ? holidayNightRate() : nightRate()
  const ideal = computeShift(schedStart, schedEnd, isHoliday)
  const pay = (paidDay / 60) * dRate + (paidNight / 60) * nRate
  const lateIn = Math.max(0, Math.min(as, pe) - ps) / 60
  const earlyOut = Math.max(0, pe - Math.max(ae, ps)) / 60
  return {
    dayHours: paidDay / 60,
    nightHours: paidNight / 60,
    decimalHours: (paidDay + paidNight) / 60,
    pay,
    idealPay: ideal.pay,
    lostHours: Math.max(0, ideal.decimalHours - (paidDay + paidNight) / 60),
    lostPay: Math.max(0, ideal.pay - pay),
    lateIn,
    earlyOut
  }
}
const LOCALES = { vi: 'vi-VN', en: 'en-GB', us: 'en-US', au: 'en-AU' }
const SYMBOLS = { vi: '₫', en: '£', us: '$', au: 'A$' }
const FX = { vi: 1, en: 1 / 31000, us: 1 / 25000, au: 1 / 16500 }
function fmtMoney(vnd, lang) {
  if (lang === 'vi') return new Intl.NumberFormat('vi-VN').format(Math.round(vnd || 0))
  const v = (vnd || 0) * FX[lang]
  return SYMBOLS[lang] + new Intl.NumberFormat(LOCALES[lang], { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}
const fmtHours = (n) => (Math.round((n || 0) * 100) / 100).toFixed(2).replace(/\.00$/, '')
const fmtHours2 = (n) => (Math.round((n || 0) * 100) / 100).toFixed(2)
const dm = (iso) => { const [, m, d] = iso.split('-'); return Number(d) + '/' + Number(m) }

const PROFILE = { name: 'Lê Quang Thi', code: 'NV-2481', phone: '+84 901 234 567', payday: 5, hourly: 25500, nightPct: 30 }

// A real fortnight of a rotating roster: nights, days, a holiday, a late clock-in,
// a future planned shift, and one past day that was never clocked in.
const SHIFTS = [
  { id: 1, work_date: '2026-08-16', scheduled_start: '14:00', scheduled_end: '22:00' },
  { id: 2, work_date: '2026-08-15', scheduled_start: '14:00', scheduled_end: '22:00' },
  { id: 3, work_date: '2026-08-14', start_time: '21:52', end_time: '06:04', scheduled_start: '22:00', scheduled_end: '06:00' },
  { id: 4, work_date: '2026-08-13', start_time: '22:06', end_time: '06:02', scheduled_start: '22:00', scheduled_end: '06:00' },
  { id: 5, work_date: '2026-08-12', start_time: '22:00', end_time: '06:00', scheduled_start: '22:00', scheduled_end: '06:00' },
  { id: 6, work_date: '2026-08-11', scheduled_start: '22:00', scheduled_end: '06:00' },
  { id: 7, work_date: '2026-08-10', start_time: '06:00', end_time: '14:12', scheduled_start: '06:00', scheduled_end: '14:00' },
  { id: 8, work_date: '2026-08-09', start_time: '06:00', end_time: '14:00', scheduled_start: '06:00', scheduled_end: '14:00', is_holiday: true },
  { id: 9, work_date: '2026-08-08', start_time: '06:14', end_time: '13:48', scheduled_start: '06:00', scheduled_end: '14:00' },
  { id: 10, work_date: '2026-08-07', start_time: '14:00', end_time: '22:05', scheduled_start: '14:00', scheduled_end: '22:00' }
]
const DEDUCTIONS = [
  { id: 1, amount: 120000, reason: 'Late 3 times', deduct_date: '2026-08-10' },
  { id: 2, amount: 80000, reason: 'Broken tote', deduct_date: '2026-08-04' }
]
const EXTRA_INCOME = [
  { id: 1, date: '2026-08-09', desc: 'Phone repair, cousin', amount: 500000, received: true },
  { id: 2, date: '2026-08-13', desc: 'Sunday warehouse help', amount: 350000, received: false }
]
const TODAY = '2026-08-15'

function enrich(s) {
  const eff = computeEffective(s.scheduled_start, s.scheduled_end, s.start_time, s.end_time, !!s.is_holiday)
  const noActual = !s.start_time || !s.end_time
  const state = noActual ? (s.work_date > TODAY ? 'planned' : 'missing') : 'normal'
  return { ...s, eff, state, noActual }
}
function periodStats(list) {
  return list.reduce(
    (acc, s) => {
      const e = enrich(s).eff
      const kind = e.nightHours > 0 ? 'night' : 'day'
      return {
        hours: acc.hours + e.decimalHours,
        dayHours: acc.dayHours + e.dayHours,
        nightHours: acc.nightHours + e.nightHours,
        lostHours: acc.lostHours + (e.lostHours || 0),
        pay: acc.pay + e.pay,
        idealPay: acc.idealPay + (e.idealPay != null ? e.idealPay : e.pay),
        lostPay: acc.lostPay + (e.lostPay || 0),
        dayShiftCount: acc.dayShiftCount + (kind === 'day' && !enrich(s).noActual ? 1 : 0),
        nightShiftCount: acc.nightShiftCount + (kind === 'night' && !enrich(s).noActual ? 1 : 0)
      }
    },
    { hours: 0, dayHours: 0, nightHours: 0, lostHours: 0, pay: 0, idealPay: 0, lostPay: 0, dayShiftCount: 0, nightShiftCount: 0 }
  )
}
const T = {
  en: {
    addShift: 'Add shift', adding: 'Adding…', date: 'Date', checkin: 'Check-in', checkout: 'Check-out', holiday: 'Holiday',
    salaryLabel: 'Salary this month:', expected: 'Expected', late: 'Late', compensation: 'Compensation',
    totalHours: 'Total Hours', dayHours: 'Day Hours', nightHours: 'Night Hours', lateHours: 'Late Hours',
    dayShifts: 'Day Shifts', nightShifts: 'Night Shifts', all: 'All', dayFilter: 'Day shifts', nightFilter: 'Night shifts',
    search: 'Search shifts: date, time…', emptyShifts: 'No shifts yet. Add your first one above.',
    payPeriod: 'Pay period', tools: 'Tools', account: 'Account', guide: 'Guide',
    scopeHint: 'Tap a period to see its charts and full timesheet.', allPeriods: 'All periods',
    receivedPeriods: 'Received periods', detail: 'Detailed timesheet', signIn: 'Sign in', signInSub: 'Sign in to your timesheet',
    email: 'Email', password: 'Password', forgot: 'Forgot password?', noAccount: "Don't have an account? Sign up",
    importWeek: 'Import weekly schedule', deductions: 'Compensation', extra: 'Extra income', received: 'Salary received',
    currentShift: 'Current shift', lateIn: 'Late in', day: 'day', night: 'night', reconcile: 'Verify timesheet'
  },
  vi: {
    addShift: 'Thêm ca', adding: 'Đang thêm…', date: 'Ngày làm', checkin: 'Giờ vào', checkout: 'Giờ ra', holiday: 'Ngày lễ',
    salaryLabel: 'Lương tháng này:', expected: 'Dự kiến', late: 'Trễ', compensation: 'Tiền bồi thường',
    totalHours: 'Tổng Giờ', dayHours: 'Giờ Ngày', nightHours: 'Giờ Đêm', lateHours: 'Giờ Trễ',
    dayShifts: 'Ca Ngày', nightShifts: 'Ca Đêm', all: 'Tất cả', dayFilter: 'Ca ngày', nightFilter: 'Ca đêm',
    search: 'Tìm ca: ngày, giờ…', emptyShifts: 'Chưa có ca nào. Thêm ca đầu tiên ở trên.',
    payPeriod: 'Kỳ lương', tools: 'Công cụ', account: 'Tài khoản', guide: 'Hướng dẫn',
    scopeHint: 'Bấm vào một kỳ để xem biểu đồ và bảng công đầy đủ.', allPeriods: 'Tất cả các kỳ',
    receivedPeriods: 'Kỳ đã nhận lương', detail: 'Bảng công chi tiết', signIn: 'Đăng nhập', signInSub: 'Đăng nhập vào bảng công của bạn',
    email: 'Email', password: 'Mật khẩu', forgot: 'Quên mật khẩu?', noAccount: 'Chưa có tài khoản? Đăng ký',
    importWeek: 'Nhập lịch tuần', deductions: 'Tiền bồi thường', extra: 'Thu nhập việc ngoài', received: 'Đã nhận lương',
    currentShift: 'Ca đang nhập', lateIn: 'Vào trễ', day: 'ngày', night: 'đêm', reconcile: 'Đối chiếu công'
  }
}
const tr = (lang, key) => (T[lang === 'vi' ? 'vi' : 'en'][key] || T.en[key] || key)

Object.assign(window, {
  RATES, computeShift, computeEffective, fmtMoney, fmtHours, fmtHours2, dm, enrich, periodStats,
  PROFILE, SHIFTS, DEDUCTIONS, EXTRA_INCOME, TODAY, tr, LOCALES, SYMBOLS
})
