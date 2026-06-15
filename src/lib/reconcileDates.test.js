import { describe, it, expect } from 'vitest'
import {
  dayNumsToDates,
  weekStartFromDayNums,
} from './reconcileDates.js'

// Các test này XÁC NHẬN logic ghép số ngày trần → ngày đầy đủ + xử lý giáp tháng,
// dùng đúng 3 dải người dùng nêu (8–14, 1–7, 26–31) + các ca giáp tháng.
// Cột theo thứ tự Mon..Sun.

describe('dayNumsToDates — trong cùng một tháng', () => {
  const anchor = '2026-06-01' // Tuần đầu = đầu tháng 6

  it('dải 1–7 → tháng 6', () => {
    expect(dayNumsToDates([1, 2, 3, 4, 5, 6, 7], anchor)).toEqual([
      '2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04',
      '2026-06-05', '2026-06-06', '2026-06-07',
    ])
  })

  it('dải 8–14 → tháng 6', () => {
    expect(dayNumsToDates([8, 9, 10, 11, 12, 13, 14], anchor)).toEqual([
      '2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11',
      '2026-06-12', '2026-06-13', '2026-06-14',
    ])
  })

  it('dải 26–31 (tháng 6 chỉ có 30) → 26–30 tháng 6 rồi 1 tháng 7', () => {
    // Header ghi 26,27,28,29,30,1,2 (tuần giáp cuối tháng 6 sang tháng 7).
    expect(dayNumsToDates([26, 27, 28, 29, 30, 1, 2], anchor)).toEqual([
      '2026-06-26', '2026-06-27', '2026-06-28', '2026-06-29',
      '2026-06-30', '2026-07-01', '2026-07-02',
    ])
  })
})

describe('dayNumsToDates — giáp tháng trong một ảnh', () => {
  it('29,30,31 → 1,2,3,4 (tháng 5 có 31 ngày) sang tháng 6', () => {
    expect(
      dayNumsToDates([29, 30, 31, 1, 2, 3, 4], '2026-05-25')
    ).toEqual([
      '2026-05-29', '2026-05-30', '2026-05-31', '2026-06-01',
      '2026-06-02', '2026-06-03', '2026-06-04',
    ])
  })

  it('giáp năm: 28..31 tháng 12 → 1..3 tháng 1 năm sau', () => {
    expect(
      dayNumsToDates([28, 29, 30, 31, 1, 2, 3], '2026-12-28')
    ).toEqual([
      '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31',
      '2027-01-01', '2027-01-02', '2027-01-03',
    ])
  })
})

describe('dayNumsToDates — anchor cuối tháng, ảnh có ngày nhỏ → tháng kế', () => {
  const anchor = '2026-06-22' // Tuần đầu nằm cuối tháng 6

  it('ảnh dải 6–12 (nhỏ hơn ngày anchor 22) → tháng 7', () => {
    expect(dayNumsToDates([6, 7, 8, 9, 10, 11, 12], anchor)).toEqual([
      '2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09',
      '2026-07-10', '2026-07-11', '2026-07-12',
    ])
  })

  it('ảnh chính tuần anchor 22–28 → vẫn tháng 6', () => {
    expect(dayNumsToDates([22, 23, 24, 25, 26, 27, 28], anchor)).toEqual([
      '2026-06-22', '2026-06-23', '2026-06-24', '2026-06-25',
      '2026-06-26', '2026-06-27', '2026-06-28',
    ])
  })
})

describe('dayNumsToDates — cột off/không đọc được', () => {
  it('giữ null cho cột off, không phá thứ tự tháng', () => {
    expect(
      dayNumsToDates([8, 0, 10, null, 12, 13, 14], '2026-06-01')
    ).toEqual([
      '2026-06-08', null, '2026-06-10', null,
      '2026-06-12', '2026-06-13', '2026-06-14',
    ])
  })
})

describe('weekStartFromDayNums — Thứ 2 thật của ảnh + thứ tự sort', () => {
  const anchor = '2026-06-01'

  it('mỗi dải ra weekStart KHÁC nhau (theo cột Monday)', () => {
    expect(weekStartFromDayNums([1, 2, 3, 4, 5, 6, 7], anchor)).toBe('2026-06-01')
    expect(weekStartFromDayNums([8, 9, 10, 11, 12, 13, 14], anchor)).toBe('2026-06-08')
    expect(weekStartFromDayNums([26, 27, 28, 29, 30, 1, 2], anchor)).toBe('2026-06-26')
  })

  it('cột Monday off → suy weekStart lùi từ cột có ngày đầu tiên', () => {
    // Mon off, Tue=9 → weekStart = 9 - 1 = 8
    expect(weekStartFromDayNums([0, 9, 10, 11, 12, 13, 14], anchor)).toBe('2026-06-08')
  })

  it('3 ảnh chọn lộn xộn → sort theo weekStart ra đúng thứ tự thời gian', () => {
    const imgs = [
      [26, 27, 28, 29, 30, 1, 2], // tuần 4
      [1, 2, 3, 4, 5, 6, 7], //      tuần 1
      [8, 9, 10, 11, 12, 13, 14], //  tuần 2
    ]
    const weeks = imgs.map((d) => weekStartFromDayNums(d, anchor))
    expect([...weeks].sort((a, b) => a.localeCompare(b))).toEqual([
      '2026-06-01', '2026-06-08', '2026-06-26',
    ])
  })

  it('null khi cả ảnh không có số ngày nào', () => {
    expect(weekStartFromDayNums([0, 0, null, 0, 0, 0, 0], anchor)).toBeNull()
  })
})
