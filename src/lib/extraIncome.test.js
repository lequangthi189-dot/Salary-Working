import { describe, it, expect } from 'vitest'
import {
  sumExtraIncome,
  sumReceivedExtraIncome,
  receivedItems,
  pendingItems,
  isReceived,
  totalIncome,
} from './extraIncome.js'

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

describe('trạng thái nhận (received)', () => {
  const list = [
    { amount: 100000, received: true },
    { amount: 50000, received: false },
    { amount: 30000 }, // thiếu cờ → coi như chưa nhận
  ]
  it('isReceived chỉ true khi received === true', () => {
    expect(isReceived({ received: true })).toBe(true)
    expect(isReceived({ received: false })).toBe(false)
    expect(isReceived({})).toBe(false)
    expect(isReceived(null)).toBe(false)
  })
  it('receivedItems / pendingItems tách đúng', () => {
    expect(receivedItems(list)).toHaveLength(1)
    expect(pendingItems(list)).toHaveLength(2)
  })
  it('sumReceivedExtraIncome CHỈ cộng khoản đã nhận', () => {
    expect(sumReceivedExtraIncome(list)).toBe(100000)
  })
  it('không có khoản đã nhận → 0', () => {
    expect(sumReceivedExtraIncome([{ amount: 99000, received: false }])).toBe(0)
    expect(sumReceivedExtraIncome([])).toBe(0)
    expect(sumReceivedExtraIncome(null)).toBe(0)
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
