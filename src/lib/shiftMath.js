import {
  getDayRate,
  getNightRate,
  getHolidayDayRate,
  getHolidayNightRate,
  getHasNightShift,
  getNightStartMin,
  getNightEndMin,
} from './rates.js'
import { getLang, translate } from './i18n.jsx'
import { getRate } from './currency.jsx'

// Đơn giá ngày/đêm theo ca thường hay ngày lễ (lấy từ cấu hình hồ sơ).
function ratesFor(isHoliday) {
  return isHoliday
    ? { day: getHolidayDayRate(), night: getHolidayNightRate() }
    : { day: getDayRate(), night: getNightRate() }
}

const MINUTES_PER_DAY = 1440

// Parse an "HH:MM" string into minutes since midnight.
export function parseTime(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number)
  return h * 60 + m
}

// Số phút ĐÊM trong [0, x) với MỌI số nguyên x (kể cả âm — Math.floor xử lý;
// alignNear có thể đẩy mốc xuống dưới 0 hoặc vượt 1440). Cửa sổ đêm lấy từ hồ sơ
// (mặc định 22:00–06:00); có thể vắt qua nửa đêm (start > end), nằm gọn trong
// ngày (start < end), hoặc rỗng (start === end → không có giờ đêm).
function nightMinutesBefore(x) {
  const S = getNightStartMin()
  const E = getNightEndMin()
  if (S === E) return 0
  const perDay = S < E ? E - S : MINUTES_PER_DAY - S + E
  const d = Math.floor(x / MINUTES_PER_DAY)
  const r = x - d * MINUTES_PER_DAY // 0..1439
  const g =
    S < E
      ? Math.min(Math.max(r, S), E) - S // cửa sổ trong ngày [S,E)
      : Math.min(r, E) + Math.max(0, r - S) // vắt nửa đêm: [0,E) ∪ [S,1440)
  return d * perDay + g
}

/**
 * Compute duration and pay for a shift defined by start/end "HH:MM" times.
 * If end <= start the shift is treated as crossing midnight (ends next day).
 * Hours are split: minutes in the night window pay NIGHT_RATE, the rest DAY_RATE.
 */
export function computeShift(startTime, endTime, isHoliday = false) {
  const start = parseTime(startTime)
  let end = parseTime(endTime)
  if (end <= start) end += MINUTES_PER_DAY

  const { dayMin, nightMin } = splitRange(start, end)

  const totalMin = end - start
  const decimalHours = totalMin / 60
  const dayHours = dayMin / 60
  const nightHours = nightMin / 60
  const rate = ratesFor(isHoliday)
  const pay = dayHours * rate.day + nightHours * rate.night

  return { decimalHours, dayHours, nightHours, pay }
}

// Tổng số giờ của một khung giờ "HH:MM"–"HH:MM" (qua nửa đêm nếu end<=start).
// Trả 0 nếu thiếu một trong hai mốc. Dùng để kiểm tra giới hạn 8 giờ/ca cho lịch dự kiến.
export function durationHours(startTime, endTime) {
  if (!startTime || !endTime) return 0
  const start = parseTime(startTime)
  let end = parseTime(endTime)
  if (end <= start) end += MINUTES_PER_DAY
  return (end - start) / 60
}

// Map a minute-of-day to the representation within ±12h of `ref` (same timeline
// as the scheduled shift). Lets an actual clock-in a bit before/after schedule,
// or past midnight, line up with the schedule instead of jumping a whole day.
function alignNear(value, ref) {
  let v = (((value - ref) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  if (v > MINUTES_PER_DAY / 2) v -= MINUTES_PER_DAY
  return ref + v
}

// Không có ca đêm → gộp phút đêm vào phút ngày (mọi giờ coi là giờ ngày).
function foldNight(dayMin, nightMin) {
  if (!getHasNightShift()) return { dayMin: dayMin + nightMin, nightMin: 0 }
  return { dayMin, nightMin }
}

// Day/night minute split over the half-open range [lo, hi). O(1) nhờ hàm prefix
// nightMinutesBefore (không lặp từng phút).
function splitRange(lo, hi) {
  if (hi <= lo) return foldNight(0, 0)
  const nightMin = nightMinutesBefore(hi) - nightMinutesBefore(lo)
  return foldNight(hi - lo - nightMin, nightMin)
}

function toPart({ dayMin, nightMin }) {
  return {
    dayHours: dayMin / 60,
    nightHours: nightMin / 60,
    hours: (dayMin + nightMin) / 60,
  }
}

/**
 * Effective paid hours + pay when the shift has a SCHEDULE that governs pay.
 * The schedule is the source of truth: pay covers only the overlap of the
 * scheduled window and the actual clock-in/out.
 *   - Clock in early  → clamped up to the scheduled start (no bonus).
 *   - Clock in late   → you lose the missed start (lateIn).
 *   - Clock out late  → clamped down to the scheduled end (no overtime).
 *   - Clock out early → you lose the missed end (earlyOut).
 * Lost time is resolved per-minute and split day/night by the window it falls in.
 *
 * When no schedule is set, pay falls back to the raw actual interval (no clamp).
 * Returns { decimalHours, dayHours, nightHours, pay } (effective/paid) plus the
 * lost breakdown { lateIn, earlyOut, lostDayHours, lostNightHours, lostHours, lostPay }.
 */
export function computeEffective(
  scheduledStart,
  scheduledEnd,
  actualStart,
  actualEnd,
  isHoliday = false
) {
  const noLost = {
    lateIn: { dayHours: 0, nightHours: 0, hours: 0 },
    earlyOut: { dayHours: 0, nightHours: 0, hours: 0 },
    lostDayHours: 0,
    lostNightHours: 0,
    lostHours: 0,
    lostPay: 0,
  }

  // Chưa có giờ check-in/check-out thực tế (vd ca mới nhập từ lịch tuần): coi như
  // chưa đi làm → chưa tính giờ/lương, chờ tới khi nhập check-in/out mới tính.
  if (!actualStart || !actualEnd) {
    return { decimalHours: 0, dayHours: 0, nightHours: 0, pay: 0, ...noLost }
  }

  if (!scheduledStart || !scheduledEnd) {
    const r = computeShift(actualStart, actualEnd, isHoliday)
    return { ...r, ...noLost }
  }

  const sStart = parseTime(scheduledStart)
  let sEnd = parseTime(scheduledEnd)
  if (sEnd <= sStart) sEnd += MINUTES_PER_DAY

  const aStart = alignNear(parseTime(actualStart), sStart)
  let aEnd = parseTime(actualEnd)
  while (aEnd <= aStart) aEnd += MINUTES_PER_DAY

  // Paid window = overlap of schedule and actual (clamped to the schedule).
  const effStart = Math.min(sEnd, Math.max(sStart, aStart))
  const effEnd = Math.max(sStart, Math.min(sEnd, aEnd))

  const eff = splitRange(effStart, effEnd) // empty range → all zeros
  const lateIn = toPart(splitRange(sStart, effStart)) // missed at the start
  const earlyOut = toPart(splitRange(effEnd, sEnd)) // missed at the end

  const dayHours = eff.dayMin / 60
  const nightHours = eff.nightMin / 60
  const rate = ratesFor(isHoliday)
  const pay = dayHours * rate.day + nightHours * rate.night

  const lostDayHours = lateIn.dayHours + earlyOut.dayHours
  const lostNightHours = lateIn.nightHours + earlyOut.nightHours

  return {
    decimalHours: dayHours + nightHours,
    dayHours,
    nightHours,
    pay,
    lateIn,
    earlyOut,
    lostDayHours,
    lostNightHours,
    lostHours: lostDayHours + lostNightHours,
    lostPay: lostDayHours * rate.day + lostNightHours * rate.night,
  }
}

// "HH:MM:SS" (or "HH:MM") from the DB -> "HH:MM" for computeEffective.
export function hhmm(t) {
  return t ? String(t).slice(0, 5) : ''
}

// Aggregate effective hours/pay across a list of shift rows (as stored in the DB).
export function shiftTotals(list) {
  return list.reduce(
    (acc, s) => {
      const r = computeEffective(
        hhmm(s.scheduled_start),
        hhmm(s.scheduled_end),
        hhmm(s.start_time),
        hhmm(s.end_time),
        !!s.is_holiday
      )
      acc.hours += r.decimalHours
      acc.dayHours += r.dayHours
      acc.nightHours += r.nightHours
      acc.lostHours += r.lostHours
      acc.pay += r.pay
      acc.lostPay += r.lostPay
      return acc
    },
    { hours: 0, dayHours: 0, nightHours: 0, lostHours: 0, pay: 0, lostPay: 0 }
  )
}

// Thống kê cho một kỳ lương: tái dùng shiftTotals + tách lương ngày/đêm và
// vài chỉ số. Lương ngày/đêm tính tuyến tính nên dayPay + nightPay === pay.
export function periodStats(shifts) {
  const t = shiftTotals(shifts)
  const workDays = new Set(shifts.map((s) => s.work_date)).size
  // Số ca ngày/đêm: CHỈ đếm ca đã chấm công (có giờ thực tế). Ca chỉ có lịch dự
  // kiến (chưa check-in) không tính. Ca đêm = giờ đêm > giờ ngày.
  let dayShiftCount = 0
  let nightShiftCount = 0
  for (const s of shifts) {
    const r = computeEffective(
      hhmm(s.scheduled_start),
      hhmm(s.scheduled_end),
      hhmm(s.start_time),
      hhmm(s.end_time),
      !!s.is_holiday
    )
    if (r.dayHours > 0 || r.nightHours > 0) {
      // Ca đêm = CÓ giờ làm trong khung 22:00–06:00 (dù ít hơn giờ ngày).
      if (r.nightHours > 0) nightShiftCount++
      else dayShiftCount++
    }
  }
  return {
    ...t,
    dayPay: t.dayHours * getDayRate(),
    nightPay: t.nightHours * getNightRate(),
    // Giờ "trước khi trễ" = giờ đáng lẽ làm nếu đúng giờ (= đã làm + bị mất do trễ).
    idealHours: t.hours + t.lostHours,
    // Lương "trước khi trễ" (nếu đi đúng giờ) = lương thực nhận + tiền mất do trễ.
    idealPay: t.pay + t.lostPay,
    shiftCount: shifts.length,
    dayShiftCount,
    nightShiftCount,
    workDays,
    avgHoursPerDay: workDays ? t.hours / workDays : 0,
  }
}

const fmtVi = new Intl.NumberFormat('vi-VN')
const money2 = (locale) =>
  new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
const fmtGb = money2('en-GB')
const fmtUs = money2('en-US')
const fmtAu = money2('en-AU')

// Định dạng tiền theo ngôn ngữ + QUY ĐỔI theo tỉ giá real-time (lib/currency):
//   vi → "1.000 VND" · en (UK) → "£…" · us → "$…" · au → "A$…".
export function formatMoney(n) {
  const lang = getLang()
  if (lang === 'en') return `£${fmtGb.format(n * getRate('GBP'))}`
  if (lang === 'us') return `$${fmtUs.format(n * getRate('USD'))}`
  if (lang === 'au') return `A$${fmtAu.format(n * getRate('AUD'))}`
  return `${fmtVi.format(Math.round(n))} VND`
}

export function formatHours(h) {
  return Number(h.toFixed(2)).toString()
}

// Giờ cho bảng tổng kết: nếu là số nguyên thì KHÔNG hiện thập phân (8 -> "8"),
// còn lại giữ đúng 2 chữ số thập phân (8.5 -> "8.50", 8.456 -> "8.46").
export function formatHours2(h) {
  const fixed = Number(h).toFixed(2)
  return fixed.endsWith('.00') ? fixed.slice(0, -3) : fixed
}

// Human-readable lost-hours breakdown (theo ngôn ngữ hiện tại), null nếu không mất.
// vd "Mất 2h — vào trễ 1h (ngày 1 / đêm 0) · ra sớm 1h (ngày 0 / đêm 1)"
export function formatLost(lost) {
  if (!lost || lost.lostHours <= 0) return null
  const lang = getLang()
  const part = (p) =>
    translate(lang, 'lost.part', {
      h: formatHours(p.hours),
      day: formatHours(p.dayHours),
      night: formatHours(p.nightHours),
    })
  const segs = []
  if (lost.lateIn.hours > 0)
    segs.push(translate(lang, 'lost.lateIn', { part: part(lost.lateIn) }))
  if (lost.earlyOut.hours > 0)
    segs.push(translate(lang, 'lost.earlyOut', { part: part(lost.earlyOut) }))
  return translate(lang, 'lost.full', {
    total: formatHours(lost.lostHours),
    segs: segs.join(' · '),
  })
}
