import { describe, it, expect } from 'vitest'
import { computeShift, computeEffective, periodStats } from './shiftMath.js'
import { DAY_RATE, NIGHT_RATE } from './rates.js'

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
