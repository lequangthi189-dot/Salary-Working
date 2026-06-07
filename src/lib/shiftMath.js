import {
  DAY_RATE,
  NIGHT_RATE,
  NIGHT_START_HOUR,
  NIGHT_END_HOUR,
} from './rates.js'

// Giới hạn theo spec: mỗi ngày không quá 8 giờ làm việc.
export const MAX_HOURS_PER_DAY = 8

const MINUTES_PER_DAY = 1440
const NIGHT_START_MIN = NIGHT_START_HOUR * 60 // 22:00 -> 1320
const NIGHT_END_MIN = NIGHT_END_HOUR * 60 // 06:00 -> 360

// Parse an "HH:MM" string into minutes since midnight.
export function parseTime(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number)
  return h * 60 + m
}

// Is the minute-of-day (0..1439) inside the night window 22:00–06:00?
function isNightMinute(minuteOfDay) {
  const m = ((minuteOfDay % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  return m >= NIGHT_START_MIN || m < NIGHT_END_MIN
}

/**
 * Compute duration and pay for a shift defined by start/end "HH:MM" times.
 * If end <= start the shift is treated as crossing midnight (ends next day).
 * Hours are split: minutes in the night window pay NIGHT_RATE, the rest DAY_RATE.
 */
export function computeShift(startTime, endTime) {
  const start = parseTime(startTime)
  let end = parseTime(endTime)
  if (end <= start) end += MINUTES_PER_DAY

  let nightMin = 0
  let dayMin = 0
  for (let t = start; t < end; t++) {
    if (isNightMinute(t)) nightMin++
    else dayMin++
  }

  const totalMin = end - start
  const decimalHours = totalMin / 60
  const dayHours = dayMin / 60
  const nightHours = nightMin / 60
  const pay = (dayMin / 60) * DAY_RATE + (nightMin / 60) * NIGHT_RATE

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

// Day/night minute split over the half-open range [lo, hi).
function splitRange(lo, hi) {
  let dayMin = 0
  let nightMin = 0
  for (let t = lo; t < hi; t++) {
    if (isNightMinute(t)) nightMin++
    else dayMin++
  }
  return { dayMin, nightMin }
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
export function computeEffective(scheduledStart, scheduledEnd, actualStart, actualEnd) {
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
    const r = computeShift(actualStart, actualEnd)
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
  const pay = dayHours * DAY_RATE + nightHours * NIGHT_RATE

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
    lostPay: lostDayHours * DAY_RATE + lostNightHours * NIGHT_RATE,
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
        hhmm(s.end_time)
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
      hhmm(s.end_time)
    )
    if (r.dayHours > 0 || r.nightHours > 0) {
      if (r.nightHours > r.dayHours) nightShiftCount++
      else dayShiftCount++
    }
  }
  return {
    ...t,
    dayPay: t.dayHours * DAY_RATE,
    nightPay: t.nightHours * NIGHT_RATE,
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

const currencyFmt = new Intl.NumberFormat('vi-VN')

export function formatMoney(n) {
  return `${currencyFmt.format(Math.round(n))} VND`
}

export function formatHours(h) {
  return Number(h.toFixed(2)).toString()
}

// Human-readable lost-hours breakdown (Vietnamese), or null when nothing lost.
// e.g. "Mất 2h — vào trễ 1h (ngày 1 / đêm 0) · ra sớm 1h (ngày 0 / đêm 1)"
export function formatLost(lost) {
  if (!lost || lost.lostHours <= 0) return null
  const part = (p) =>
    `${formatHours(p.hours)}h (ngày ${formatHours(p.dayHours)} / đêm ${formatHours(
      p.nightHours
    )})`
  const segs = []
  if (lost.lateIn.hours > 0) segs.push(`vào trễ ${part(lost.lateIn)}`)
  if (lost.earlyOut.hours > 0) segs.push(`ra sớm ${part(lost.earlyOut)}`)
  return `Mất ${formatHours(lost.lostHours)}h — ${segs.join(' · ')}`
}
