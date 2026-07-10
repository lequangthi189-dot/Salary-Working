import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  computeShift,
  computeEffective,
  periodStats,
  durationHours,
} from './shiftMath.js'
import {
  DAY_RATE,
  NIGHT_RATE,
  DEFAULT_NIGHT_PCT,
  setRates,
  getHolidayDayRate,
  getHolidayNightRate,
} from './rates.js'

describe('computeShift', () => {
  it('pure day shift 09:00–17:00', () => {
    const r = computeShift('09:00', '17:00')
    expect(r.decimalHours).toBe(8)
    expect(r.dayHours).toBe(8)
    expect(r.nightHours).toBe(0)
    expect(r.pay).toBe(8 * DAY_RATE) // 204000
  })

  it('pure night shift 23:00–05:00 crosses midnight', () => {
    const r = computeShift('23:00', '05:00')
    expect(r.decimalHours).toBe(6)
    expect(r.nightHours).toBe(6)
    expect(r.dayHours).toBe(0)
    expect(r.pay).toBe(6 * NIGHT_RATE)
  })

  it('night window boundary 22:00–06:00 is all night', () => {
    const r = computeShift('22:00', '06:00')
    expect(r.decimalHours).toBe(8)
    expect(r.nightHours).toBe(8)
    expect(r.dayHours).toBe(0)
    expect(r.pay).toBe(8 * NIGHT_RATE) // 265200
  })

  it('day boundary 06:00–22:00 is all day', () => {
    const r = computeShift('06:00', '22:00')
    expect(r.decimalHours).toBe(16)
    expect(r.dayHours).toBe(16)
    expect(r.nightHours).toBe(0)
  })

  it('mixed midnight-crossing 16:00–02:00 = 6 day + 4 night', () => {
    const r = computeShift('16:00', '02:00')
    expect(r.decimalHours).toBe(10)
    expect(r.dayHours).toBe(6) // 16:00–22:00
    expect(r.nightHours).toBe(4) // 22:00–02:00
    expect(r.pay).toBe(6 * DAY_RATE + 4 * NIGHT_RATE) // 285600
  })

  it('half-hour precision 09:00–09:30', () => {
    const r = computeShift('09:00', '09:30')
    expect(r.decimalHours).toBe(0.5)
  })
})

describe('durationHours', () => {
  it('khung giờ trong ngày 08:00–16:00 = 8h', () => {
    expect(durationHours('08:00', '16:00')).toBe(8)
  })

  it('qua nửa đêm 22:00–06:00 = 8h', () => {
    expect(durationHours('22:00', '06:00')).toBe(8)
  })

  it('quá 8h: 08:00–17:00 = 9h', () => {
    expect(durationHours('08:00', '17:00')).toBe(9)
  })

  it('thiếu mốc → 0', () => {
    expect(durationHours('', '16:00')).toBe(0)
    expect(durationHours('08:00', '')).toBe(0)
  })
})

describe('computeEffective', () => {
  it('no schedule → pay falls back to the raw actual interval', () => {
    const r = computeEffective('', '', '09:00', '17:00')
    expect(r.decimalHours).toBe(8)
    expect(r.dayHours).toBe(8)
    expect(r.pay).toBe(8 * DAY_RATE)
    expect(r.lostHours).toBe(0)
  })

  it('ca mới nhập từ lịch (có Sched, chưa check-in/out) → 0 giờ, 0 lương', () => {
    const r = computeEffective('08:00', '16:00', '', '')
    expect(r.decimalHours).toBe(0)
    expect(r.dayHours).toBe(0)
    expect(r.nightHours).toBe(0)
    expect(r.pay).toBe(0)
    expect(r.lostHours).toBe(0)
    expect(r.lostPay).toBe(0)
  })

  it('chỉ có check-in, thiếu check-out → vẫn 0 (chưa đủ giờ thực tế)', () => {
    const r = computeEffective('08:00', '16:00', '08:00', '')
    expect(r.decimalHours).toBe(0)
    expect(r.pay).toBe(0)
  })

  it('worked exactly the schedule → full pay, nothing lost', () => {
    const r = computeEffective('08:00', '16:00', '08:00', '16:00')
    expect(r.decimalHours).toBe(8)
    expect(r.pay).toBe(8 * DAY_RATE)
    expect(r.lostHours).toBe(0)
  })

  it('clocking in early gives no bonus — clamped to scheduled start', () => {
    // Schedule 08:00–16:00, clocked in 07:30 → still paid from 08:00 (8h).
    const r = computeEffective('08:00', '16:00', '07:30', '16:00')
    expect(r.decimalHours).toBe(8)
    expect(r.pay).toBe(8 * DAY_RATE)
    expect(r.lostHours).toBe(0)
  })

  it('clocking out late gives no overtime — clamped to scheduled end', () => {
    const r = computeEffective('08:00', '16:00', '08:00', '17:00')
    expect(r.decimalHours).toBe(8)
    expect(r.pay).toBe(8 * DAY_RATE)
  })

  it('clocking in late loses the missed start hours and pay', () => {
    // Schedule 08:00–16:00 (8h), clocked in 09:00 → paid 7h, lost 1h day.
    const r = computeEffective('08:00', '16:00', '09:00', '16:00')
    expect(r.decimalHours).toBe(7)
    expect(r.pay).toBe(7 * DAY_RATE)
    expect(r.lateIn.hours).toBe(1)
    expect(r.lateIn.dayHours).toBe(1)
    expect(r.earlyOut.hours).toBe(0)
    expect(r.lostPay).toBe(1 * DAY_RATE)
  })

  it('clocking out early on a night shift loses night hours', () => {
    // Schedule 22:00–06:00 (8h night), clocked out 05:00 → paid 7h night, lost 1h night.
    const r = computeEffective('22:00', '06:00', '22:00', '05:00')
    expect(r.decimalHours).toBe(7)
    expect(r.nightHours).toBe(7)
    expect(r.pay).toBe(7 * NIGHT_RATE)
    expect(r.earlyOut.nightHours).toBe(1)
    expect(r.lateIn.hours).toBe(0)
  })

  it('late-in AND early-out land in the right day/night windows', () => {
    // Schedule 16:00–02:00 (6h day + 4h night). Actual 18:00–01:00.
    // late-in 16:00–18:00 = 2h day; early-out 01:00–02:00 = 1h night.
    // paid = 18:00–01:00 = 4h day (18–22) + 3h night (22–01).
    const r = computeEffective('16:00', '02:00', '18:00', '01:00')
    expect(r.lateIn.dayHours).toBe(2)
    expect(r.earlyOut.nightHours).toBe(1)
    expect(r.dayHours).toBe(4)
    expect(r.nightHours).toBe(3)
    expect(r.pay).toBe(4 * DAY_RATE + 3 * NIGHT_RATE)
    expect(r.lostPay).toBe(2 * DAY_RATE + 1 * NIGHT_RATE)
  })

  it('late-in crossing the night boundary splits day/night', () => {
    // Schedule 21:00–05:00, clocked in 23:00 → missed 21:00–23:00 = 1h day + 1h night.
    const r = computeEffective('21:00', '05:00', '23:00', '05:00')
    expect(r.lateIn.dayHours).toBe(1)
    expect(r.lateIn.nightHours).toBe(1)
    expect(r.earlyOut.hours).toBe(0)
  })
})

describe('periodStats', () => {
  const shifts = [
    // 2 ca cùng ngày: 8h ngày + 6h đêm
    { work_date: '2025-05-01', start_time: '09:00', end_time: '17:00' },
    { work_date: '2025-05-01', start_time: '23:00', end_time: '05:00' },
    // 1 ca ngày khác: 8h ngày
    { work_date: '2025-05-02', start_time: '06:00', end_time: '14:00' },
  ]

  it('tách lương ngày/đêm và dayPay+nightPay === pay', () => {
    const s = periodStats(shifts)
    expect(s.dayHours).toBe(16) // 8 + 8
    expect(s.nightHours).toBe(6)
    expect(s.dayPay).toBe(16 * DAY_RATE)
    expect(s.nightPay).toBe(6 * NIGHT_RATE)
    expect(s.dayPay + s.nightPay).toBeCloseTo(s.pay)
  })

  it('đếm số ca, số ngày công, trung bình giờ/ngày', () => {
    const s = periodStats(shifts)
    expect(s.shiftCount).toBe(3)
    expect(s.workDays).toBe(2) // 2 ngày phân biệt
    expect(s.avgHoursPerDay).toBeCloseTo(22 / 2) // tổng 22h / 2 ngày
  })

  it('rỗng → 0, không chia cho 0', () => {
    const s = periodStats([])
    expect(s.shiftCount).toBe(0)
    expect(s.workDays).toBe(0)
    expect(s.avgHoursPerDay).toBe(0)
    expect(s.pay).toBe(0)
  })
})

// Lương ngày lễ: phụ cấp lễ là BỘI SỐ trên đơn giá. Lễ ca ngày = lương ngày × 300%,
// lễ ca đêm = lương ca đêm (đã gồm phụ cấp đêm) × 390% — theo cấu hình hồ sơ.
describe('lương lễ (holiday pay)', () => {
  const HOLIDAY_DAY_RATE = DAY_RATE * 3 // 25500 × 300% = 76500
  const HOLIDAY_NIGHT_RATE = Math.round(NIGHT_RATE * 3.9) // 33150 × 390% = 129285

  // Đặt phụ cấp lễ 300%/390% cho khối test này; trả lại mặc định sau mỗi test để
  // không ảnh hưởng các test dựa trên đơn giá thường (holiday mặc định 100% = ×1).
  beforeEach(() => {
    setRates({
      dayRate: DAY_RATE,
      nightPct: DEFAULT_NIGHT_PCT,
      holidayDayPct: 300,
      holidayNightPct: 390,
      hasNightShift: true,
    })
  })
  afterEach(() => {
    setRates({
      dayRate: DAY_RATE,
      nightPct: DEFAULT_NIGHT_PCT,
      holidayDayPct: 100,
      holidayNightPct: 100,
      hasNightShift: true,
    })
  })

  it('đơn giá lễ = đơn giá thường × bội số phụ cấp lễ', () => {
    expect(getHolidayDayRate()).toBe(HOLIDAY_DAY_RATE) // 76500
    expect(getHolidayNightRate()).toBe(HOLIDAY_NIGHT_RATE) // 129285
  })

  it('computeShift ca ngày lễ 09:00–17:00 dùng đơn giá lễ ngày', () => {
    const r = computeShift('09:00', '17:00', true)
    expect(r.dayHours).toBe(8)
    expect(r.nightHours).toBe(0)
    expect(r.pay).toBe(8 * HOLIDAY_DAY_RATE) // 612000
  })

  it('computeShift ca đêm lễ 22:00–06:00 dùng đơn giá lễ đêm', () => {
    const r = computeShift('22:00', '06:00', true)
    expect(r.nightHours).toBe(8)
    expect(r.pay).toBe(8 * HOLIDAY_NIGHT_RATE) // 1034280
  })

  it('computeShift ca lễ hỗn hợp 16:00–02:00 tách ngày/đêm theo đơn giá lễ', () => {
    const r = computeShift('16:00', '02:00', true)
    expect(r.dayHours).toBe(6) // 16:00–22:00
    expect(r.nightHours).toBe(4) // 22:00–02:00
    expect(r.pay).toBe(6 * HOLIDAY_DAY_RATE + 4 * HOLIDAY_NIGHT_RATE) // 976140
  })

  it('isHoliday=false vẫn dùng đơn giá thường dù phụ cấp lễ đã cấu hình', () => {
    const r = computeShift('09:00', '17:00', false)
    expect(r.pay).toBe(8 * DAY_RATE) // 204000, không nhân bội số lễ
  })

  it('computeEffective ca lễ có lịch: lương VÀ giờ mất đều theo đơn giá lễ', () => {
    // Lịch 08:00–16:00 (8h ngày), check-in trễ 09:00 → trả 7h, mất 1h — đều giá lễ.
    const r = computeEffective('08:00', '16:00', '09:00', '16:00', true)
    expect(r.decimalHours).toBe(7)
    expect(r.pay).toBe(7 * HOLIDAY_DAY_RATE)
    expect(r.lostPay).toBe(1 * HOLIDAY_DAY_RATE)
  })

  it('periodStats: ca có is_holiday tính tổng lương theo đơn giá lễ', () => {
    const s = periodStats([
      { work_date: '2025-05-01', start_time: '09:00', end_time: '17:00', is_holiday: true },
    ])
    expect(s.dayHours).toBe(8)
    expect(s.pay).toBe(8 * HOLIDAY_DAY_RATE) // tổng lương dùng giá lễ
  })
})

// Cửa sổ đêm theo từng người (nightStart/nightEnd). Mặc định 22:00–06:00; có thể
// đổi qua hồ sơ và việc tách giờ ngày/đêm phải theo cửa sổ mới.
describe('cửa sổ đêm tuỳ chỉnh (nightStart/nightEnd)', () => {
  afterEach(() => {
    // Trả lại cửa sổ mặc định 22:00–06:00 cho các test khác.
    setRates({ dayRate: DAY_RATE, nightPct: DEFAULT_NIGHT_PCT, nightStart: '22:00', nightEnd: '06:00' })
  })

  it('cửa sổ 21:00–05:00: ca 20:00–06:00 → 1h ngày + 9h đêm', () => {
    setRates({ dayRate: DAY_RATE, nightPct: DEFAULT_NIGHT_PCT, nightStart: '21:00', nightEnd: '05:00' })
    const r = computeShift('20:00', '06:00')
    expect(r.dayHours).toBe(2) // 20:00–21:00 và 05:00–06:00
    expect(r.nightHours).toBe(8) // 21:00–05:00
    expect(r.pay).toBe(2 * DAY_RATE + 8 * NIGHT_RATE)
  })

  it('cửa sổ trong ngày 00:00–06:00 (start < end): ca 22:00–06:00 → 2h ngày + 6h đêm', () => {
    setRates({ dayRate: DAY_RATE, nightPct: DEFAULT_NIGHT_PCT, nightStart: '00:00', nightEnd: '06:00' })
    const r = computeShift('22:00', '06:00')
    expect(r.dayHours).toBe(2) // 22:00–00:00 không còn là đêm
    expect(r.nightHours).toBe(6) // 00:00–06:00
  })
})

// PROPERTY TEST: công thức đóng (nightMinutesBefore/splitRange) phải cho kết quả
// GIỐNG HỆT cách đếm từng phút cũ, với mọi cửa sổ đêm và mọi khoảng ca. Oracle
// dưới đây là chính logic isNightMinute trước khi tối ưu.
describe('tách ngày/đêm: công thức đóng ≡ đếm từng phút (oracle)', () => {
  afterEach(() => {
    setRates({ dayRate: DAY_RATE, nightPct: DEFAULT_NIGHT_PCT, nightStart: '22:00', nightEnd: '06:00' })
  })

  const MPD = 1440
  const hhmm = (m) => {
    const x = ((m % MPD) + MPD) % MPD
    return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`
  }
  // Oracle: đếm từng phút bằng logic isNightMinute cũ.
  const bruteNight = (lo, hi, S, E) => {
    let night = 0
    for (let t = lo; t < hi; t++) {
      const m = ((t % MPD) + MPD) % MPD
      if (S === E) continue
      if (S < E ? m >= S && m < E : m >= S || m < E) night++
    }
    return night
  }

  const windows = [
    { S: 22 * 60, E: 6 * 60 }, // mặc định, vắt nửa đêm
    { S: 6 * 60, E: 22 * 60 }, // cửa sổ trong ngày (đảo)
    { S: 8 * 60, E: 8 * 60 }, // rỗng → không có giờ đêm
    { S: 23 * 60, E: 1 * 60 }, // vắt nửa đêm hẹp
    { S: 1 * 60, E: 5 * 60 }, // trong ngày, sát nửa đêm
  ]

  const check = (lo, dur, S, E) => {
    const r = computeShift(hhmm(lo), hhmm(lo + dur))
    const night = bruteNight(lo, lo + dur, S, E)
    expect(Math.round(r.nightHours * 60)).toBe(night)
    expect(Math.round(r.dayHours * 60)).toBe(dur - night)
    expect(Math.round(r.decimalHours * 60)).toBe(dur)
  }

  it('lưới biên: quanh mốc cửa sổ, nửa đêm, 0/1440', () => {
    for (const { S, E } of windows) {
      setRates({ dayRate: DAY_RATE, nightPct: DEFAULT_NIGHT_PCT, nightStart: hhmm(S), nightEnd: hhmm(E) })
      const marks = [0, 1, S - 1, S, S + 1, E - 1, E, E + 1, 720, 1439].map(
        (m) => ((m % MPD) + MPD) % MPD
      )
      const durs = [1, 30, 359, 360, 361, 720, 1439, 1440]
      for (const lo of marks) for (const dur of durs) check(lo, dur, S, E)
    }
  })

  it('random 300 case (seeded, tái lập được)', () => {
    // LCG đơn giản để test quyết định (deterministic).
    let seed = 123456789
    const rnd = (n) => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed % n
    }
    for (const { S, E } of windows) {
      setRates({ dayRate: DAY_RATE, nightPct: DEFAULT_NIGHT_PCT, nightStart: hhmm(S), nightEnd: hhmm(E) })
      for (let i = 0; i < 60; i++) check(rnd(MPD), 1 + rnd(MPD), S, E)
    }
  })
})
