import { describe, it, expect, afterEach } from 'vitest'
import {
  payPeriodKeyOf,
  payPeriodRange,
  paymentWindow,
  isPeriodEnded,
  payPeriodLabel,
  sumDeductions,
  setPayPeriod,
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
  // Mặc định ngôn ngữ là English (xem i18n.jsx) nên nhãn ra tiếng Anh.
  it('định dạng nhãn', () => {
    expect(payPeriodLabel('2025-05')).toBe('Salary month 5 (26/04 – 25/05)')
  })
})

describe('setPayPeriod (kỳ lương cấu hình được)', () => {
  afterEach(() => setPayPeriod({ startDay: 26, endDay: 25 })) // reset về mặc định

  it('chốt ngày 20 (start 21 → end 20): ngày > 20 thuộc kỳ sau', () => {
    setPayPeriod({ startDay: 21, endDay: 20 })
    expect(payPeriodKeyOf('2025-05-20')).toBe('2025-05')
    expect(payPeriodKeyOf('2025-05-21')).toBe('2025-06')
    expect(payPeriodRange('2025-05')).toEqual({
      start: '2025-04-21',
      end: '2025-05-20',
    })
  })

  it('kỳ theo tháng dương lịch (start 1, end 28)', () => {
    setPayPeriod({ startDay: 1, endDay: 28 })
    expect(payPeriodKeyOf('2025-05-28')).toBe('2025-05')
    expect(payPeriodKeyOf('2025-05-01')).toBe('2025-05')
    expect(payPeriodRange('2025-05')).toEqual({
      start: '2025-05-01',
      end: '2025-05-28',
    })
  })

  it('giá trị không hợp lệ → về mặc định 26/25', () => {
    setPayPeriod({ startDay: 0, endDay: 99 })
    expect(payPeriodKeyOf('2025-05-26')).toBe('2025-06')
    expect(payPeriodRange('2025-05')).toEqual({
      start: '2025-04-26',
      end: '2025-05-25',
    })
  })
})
