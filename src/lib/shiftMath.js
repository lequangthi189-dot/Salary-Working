import {
  DAY_RATE,
  NIGHT_RATE,
  NIGHT_START_HOUR,
  NIGHT_END_HOUR,
} from './rates.js'

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

const currencyFmt = new Intl.NumberFormat('vi-VN')

export function formatMoney(n) {
  return currencyFmt.format(Math.round(n))
}

export function formatHours(h) {
  return Number(h.toFixed(2)).toString()
}
