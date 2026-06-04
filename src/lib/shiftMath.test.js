import { describe, it, expect } from 'vitest'
import { computeShift } from './shiftMath.js'
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
