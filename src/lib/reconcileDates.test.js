import { describe, it, expect } from 'vitest'
import {
  dayNumsToDates,
  weekStartFromDayNums,
  resolveWeek,
  anchorFor,
  sheetYearMonth,
  weekSpanWarning,
  daysBetween,
  dayInPeriod,
} from './reconcileDates.js'

// Dựng nhanh data.days từ mảng số ngày (Mon..Sun) + tuỳ chọn date ISO / sheet tháng.
const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
function mkData(dayNums, opts = {}) {
  const isoDates = opts.dates || []
  return {
    sheet_month: opts.sheet_month ?? 0,
    sheet_year: opts.sheet_year ?? 0,
    days: WD.map((wd, i) => ({
      weekday: wd,
      day: dayNums[i] ?? 0,
      date: isoDates[i] || '',
      start: '',
      end: '',
      off: !dayNums[i],
      raw: '',
    })),
  }
}

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

describe('sheetYearMonth / anchorFor — ưu tiên tháng đọc trong ảnh', () => {
  it('có sheet_month + year → anchor về ngày 01 của tháng đó', () => {
    const data = mkData([8, 9, 10, 11, 12, 13, 14], { sheet_month: 7, sheet_year: 2025 })
    expect(sheetYearMonth(data)).toEqual({ month: 7, year: 2025 })
    expect(anchorFor(data, '2026-06-01')).toBe('2025-07-01')
  })

  it('có tháng nhưng thiếu năm → mượn năm từ ô Tuần đầu', () => {
    const data = mkData([1, 2, 3, 4, 5, 6, 7], { sheet_month: 7 })
    expect(anchorFor(data, '2026-06-01')).toBe('2026-07-01')
  })

  it('không có tháng trong ảnh → dùng nguyên ô Tuần đầu', () => {
    const data = mkData([1, 2, 3, 4, 5, 6, 7])
    expect(sheetYearMonth(data)).toBeNull()
    expect(anchorFor(data, '2026-06-22')).toBe('2026-06-22')
  })
})

describe('resolveWeek — ưu tiên ISO → số ngày → null', () => {
  it('1) ảnh in sẵn ngày ISO → dùng trực tiếp', () => {
    const data = mkData([8, 9, 10, 11, 12, 13, 14], {
      dates: ['2024-03-04', '2024-03-05', '', '', '', '', ''],
    })
    const r = resolveWeek(data, '2026-06-01')
    expect(r.source).toBe('iso')
    expect(r.weekStart).toBe('2024-03-04')
    expect(r.dates[6]).toBe('2024-03-10')
  })

  it('2a) số ngày trần + tháng trong ảnh → source=sheet', () => {
    const data = mkData([8, 9, 10, 11, 12, 13, 14], { sheet_month: 7, sheet_year: 2026 })
    const r = resolveWeek(data, '2026-06-01')
    expect(r.source).toBe('sheet')
    expect(r.weekStart).toBe('2026-07-08')
  })

  it('2b) số ngày trần, không tháng → ghép từ ô Tuần đầu, source=anchor', () => {
    const data = mkData([26, 27, 28, 29, 30, 1, 2])
    const r = resolveWeek(data, '2026-06-01')
    expect(r.source).toBe('anchor')
    expect(r.weekStart).toBe('2026-06-26')
    expect(r.dates).toEqual([
      '2026-06-26', '2026-06-27', '2026-06-28', '2026-06-29',
      '2026-06-30', '2026-07-01', '2026-07-02',
    ])
  })

  it('3) không ngày lẫn số ngày → null', () => {
    expect(resolveWeek(mkData([0, 0, 0, 0, 0, 0, 0]), '2026-06-01')).toBeNull()
  })
})

describe('weekSpanWarning — chặn giới hạn nhảy tháng', () => {
  it('các tuần liên tiếp trong 1–2 tháng → KHÔNG cảnh báo', () => {
    expect(weekSpanWarning(['2026-06-01', '2026-06-08', '2026-06-15'])).toBeNull()
    // trải 2 tháng liền nhau là bình thường
    expect(weekSpanWarning(['2026-06-22', '2026-06-29', '2026-07-06'])).toBeNull()
  })

  it('khoảng trống > 2 tuần giữa các ảnh → cảnh báo', () => {
    // 06-01 rồi nhảy thẳng 07-06 (35 ngày) → nghi sai mốc
    const w = weekSpanWarning(['2026-06-01', '2026-07-06'])
    expect(w).not.toBeNull()
    expect(w.months).toEqual(['2026-06', '2026-07'])
  })

  it('trải ≥ 3 tháng → cảnh báo', () => {
    const w = weekSpanWarning(['2026-06-01', '2026-07-06', '2026-08-03'])
    expect(w).not.toBeNull()
    expect(w.months.length).toBe(3)
  })

  it('dưới 2 mốc → không cảnh báo', () => {
    expect(weekSpanWarning(['2026-06-01'])).toBeNull()
    expect(weekSpanWarning([])).toBeNull()
  })
})

describe('dayInPeriod — ghép số ngày vào kỳ lương, bỏ qua tháng AI tự suy', () => {
  // Kỳ "tháng 6/2026": 26/05 → 25/06 (vắt 2 tháng).
  const start = '2026-05-26'
  const end = '2026-06-25'

  it('ngày >= ngày-bắt-đầu (26) → thuộc tháng đầu (05)', () => {
    expect(dayInPeriod(26, start, end)).toBe('2026-05-26')
    expect(dayInPeriod(27, start, end)).toBe('2026-05-27')
    expect(dayInPeriod(31, start, end)).toBe('2026-05-31')
  })

  it('ngày <= ngày-chốt (25) → thuộc tháng chốt (06)', () => {
    expect(dayInPeriod(1, start, end)).toBe('2026-06-01')
    expect(dayInPeriod(17, start, end)).toBe('2026-06-17')
    expect(dayInPeriod(25, start, end)).toBe('2026-06-25')
  })

  it('phản hồi đúng dữ liệu lỗi thật: AI lệch +1 tháng vẫn ghép về kỳ', () => {
    // AI trả 2026-06-27 (lệch tháng) → lấy số ngày 27 → 2026-05-27 trong kỳ.
    expect(dayInPeriod(Number('2026-06-27'.slice(8, 10)), start, end)).toBe('2026-05-27')
    expect(dayInPeriod(Number('2026-07-17'.slice(8, 10)), start, end)).toBe('2026-06-17')
  })

  it('ngoài kỳ (vd ngày trong khoảng trống không tồn tại) → null', () => {
    // Kỳ 26/05–25/06: không có số ngày nào rơi vào "khoảng trống" vì chuỗi liền,
    // nhưng số không hợp lệ phải trả null.
    expect(dayInPeriod(0, start, end)).toBeNull()
    expect(dayInPeriod(32, start, end)).toBeNull()
    expect(dayInPeriod(NaN, start, end)).toBeNull()
  })

  it('kỳ trong CÙNG một tháng (vd 01–31/03) → mọi ngày thuộc tháng đó', () => {
    expect(dayInPeriod(15, '2026-03-01', '2026-03-31')).toBe('2026-03-15')
    expect(dayInPeriod(1, '2026-03-01', '2026-03-31')).toBe('2026-03-01')
    expect(dayInPeriod(31, '2026-03-01', '2026-03-31')).toBe('2026-03-31')
  })
})

describe('daysBetween', () => {
  it('tính đúng khoảng cách ngày qua tháng', () => {
    expect(daysBetween('2026-06-01', '2026-06-08')).toBe(7)
    expect(daysBetween('2026-06-22', '2026-07-06')).toBe(14)
    expect(daysBetween('2026-06-01', '2026-07-06')).toBe(35)
  })
})
