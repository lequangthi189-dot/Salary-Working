import { describe, it, expect } from 'vitest'
import { sumExtraIncome, totalIncome } from './extraIncome.js'

describe('sumExtraIncome', () => {
  it('cộng tổng số tiền (số nguyên VND)', () => {
    expect(sumExtraIncome([{ amount: 100000 }, { amount: 50000 }])).toBe(150000)
  })
  it('danh sách rỗng/null → 0', () => {
    expect(sumExtraIncome([])).toBe(0)
    expect(sumExtraIncome(null)).toBe(0)
  })
  it('bỏ qua amount không hợp lệ', () => {
    expect(sumExtraIncome([{ amount: '20000' }, { amount: null }, {}])).toBe(20000)
  })
})

describe('totalIncome', () => {
  it('lương ca + việc ngoài', () => {
    expect(totalIncome(1000000, 250000)).toBe(1250000)
  })
  it('xử lý số/null an toàn, trả số nguyên', () => {
    expect(totalIncome(null, undefined)).toBe(0)
    expect(totalIncome(1000.4, 0)).toBe(1000)
  })
})
