import { describe, it, expect } from 'vitest'
import {
  payPeriodKeyOf,
  payPeriodRange,
  paymentWindow,
  isPeriodEnded,
  payPeriodLabel,
  sumDeductions,
} from './payPeriod.js'

describe('sumDeductions', () => {
  it('cộng dồn số tiền bị trừ', () => {
    expect(sumDeductions([{ amount: 50000 }, { amount: 100000 }])).toBe(150000)
  })

  it('rỗng/null trả về 0', () => {
    expect(sumDeductions([])).toBe(0)
    expect(sumDeductions(null)).toBe(0)
    expect(sumDeductions(undefined)).toBe(0)
  })

  it('bỏ qua amount thiếu/không hợp lệ', () => {
    expect(sumDeductions([{ amount: 20000 }, {}, { amount: null }])).toBe(20000)
  })
})

describe('payPeriodKeyOf', () => {
  it('ngày <= 25 thuộc kỳ tháng hiện tại', () => {
    expect(payPeriodKeyOf('2025-05-25')).toBe('2025-05')
    expect(payPeriodKeyOf('2025-05-01')).toBe('2025-05')
  })

  it('ngày >= 26 thuộc kỳ tháng sau', () => {
    expect(payPeriodKeyOf('2025-04-26')).toBe('2025-05')
    expect(payPeriodKeyOf('2025-05-26')).toBe('2025-06')
  })

  it('tràn năm: 26/12 thuộc kỳ tháng 1 năm sau', () => {
    expect(payPeriodKeyOf('2025-12-26')).toBe('2026-01')
    expect(payPeriodKeyOf('2025-12-25')).toBe('2025-12')
  })
})

describe('payPeriodRange', () => {
  it('kỳ tháng 5 = 26/04 → 25/05', () => {
    expect(payPeriodRange('2025-05')).toEqual({
      start: '2025-04-26',
      end: '2025-05-25',
    })
  })

  it('tràn năm: kỳ tháng 1 = 26/12 năm trước → 25/01', () => {
    expect(payPeriodRange('2026-01')).toEqual({
      start: '2025-12-26',
      end: '2026-01-25',
    })
  })
})

describe('paymentWindow', () => {
  it('kỳ tháng 5 trả 01–10/06', () => {
    expect(paymentWindow('2025-05')).toMatchObject({
      from: '2025-06-01',
      to: '2025-06-10',
    })
  })

  it('tràn năm: kỳ tháng 12 trả 01–10/01 năm sau', () => {
    expect(paymentWindow('2025-12')).toMatchObject({
      from: '2026-01-01',
      to: '2026-01-10',
    })
  })
})

describe('isPeriodEnded', () => {
  it('đã qua ngày 25 → kết thúc', () => {
    expect(isPeriodEnded('2025-05', '2025-05-26')).toBe(true)
    expect(isPeriodEnded('2025-05', '2025-06-01')).toBe(true)
  })
  it('đúng/ trước ngày 25 → chưa kết thúc', () => {
    expect(isPeriodEnded('2025-05', '2025-05-25')).toBe(false)
    expect(isPeriodEnded('2025-05', '2025-05-10')).toBe(false)
  })
})

describe('payPeriodLabel', () => {
  it('định dạng nhãn', () => {
    expect(payPeriodLabel('2025-05')).toBe('Lương tháng 5 (26/04 – 25/05)')
  })
})
