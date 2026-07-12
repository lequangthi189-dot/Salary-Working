import { describe, it, expect } from 'vitest'
import { localTodayStr } from './payPeriod.js'
import {
  deaccent,
  detectLang,
  parseAmountVnd,
  findMoney,
  findTimes,
  matchWeekday,
  parseDayReq,
  resolveDate,
  addDaysStr,
  extractDates,
  parseTimesheetReq,
  parseShiftIntent,
  parseDeductionAdd,
  parseDeductionQuery,
  parseExtraIncomeAdd,
  parseExtraIncomeQuery,
  parseExtraIncomeBatch,
  parsePlannedReq,
  parseFeasibilityReq,
  parseProjectionReq,
  parseOpenTool,
} from './chatParse.js'

// Đuôi "-MM-DD" của một ngày (bỏ năm để khỏi phụ thuộc năm chạy test).
const md = (iso) => iso.slice(4)

describe('detectLang', () => {
  it('có dấu tiếng Việt → vi', () => {
    expect(detectLang('tôi làm bao nhiêu ca')).toBe('vi')
  })
  it('câu tiếng Anh → en', () => {
    expect(detectLang('how many shifts this month')).toBe('en')
  })
  it('trung tính (chỉ số/giờ) → null', () => {
    expect(detectLang('200k 22h')).toBe(null)
  })
  it('lệnh Anh không dấu nhận đúng en (không bị chặn trên UI en)', () => {
    expect(detectLang('add night shift tomorrow')).toBe('en')
    expect(detectLang('open timesheet')).toBe('en')
  })
})

describe('parseAmountVnd', () => {
  it('VN: k / tr / số trần', () => {
    expect(parseAmountVnd('200k')).toBe(200000)
    expect(parseAmountVnd('2tr')).toBe(2000000)
    expect(parseAmountVnd('2 trieu')).toBe(2000000)
    expect(parseAmountVnd('200000')).toBe(200000)
    expect(parseAmountVnd('500')).toBe(null) // < 1000 không đơn vị
  })
  it('EN: million / mil', () => {
    expect(parseAmountVnd('5 million')).toBe(5000000)
    expect(parseAmountVnd('2mil')).toBe(2000000)
  })
})

describe('findMoney (bỏ qua giờ)', () => {
  it('có đơn vị / số lớn', () => {
    expect(findMoney('200k mỗi buổi')).toBe(200000)
    expect(findMoney('3 million each')).toBe(3000000)
    expect(findMoney('trả 250000')).toBe(250000)
  })
  it('không nhầm giờ', () => {
    expect(findMoney('14h-22h')).toBe(null)
  })
})

describe('findTimes', () => {
  it('VN: 22:00 / 22h / 9h30', () => {
    expect(findTimes('22:00 06:00')).toEqual(['22:00', '06:00'])
    expect(findTimes('9h30 den 17h')).toEqual(['09:30', '17:00'])
  })
  it('EN: am/pm', () => {
    expect(findTimes('8am-4pm')).toEqual(['08:00', '16:00'])
    expect(findTimes('9:30am to 6pm')).toEqual(['09:30', '18:00'])
    expect(findTimes('12pm 12am')).toEqual(['12:00', '00:00'])
  })
})

describe('matchWeekday', () => {
  it('VN', () => {
    expect(matchWeekday('thu 2')).toBe(1)
    expect(matchWeekday('thu 7')).toBe(6)
    expect(matchWeekday('chu nhat')).toBe(0)
    expect(matchWeekday('cn')).toBe(0)
  })
  it('EN đầy đủ + viết tắt', () => {
    expect(matchWeekday('monday')).toBe(1)
    expect(matchWeekday('fri')).toBe(5)
    expect(matchWeekday('sunday')).toBe(0)
    expect(matchWeekday('thursday')).toBe(4)
    expect(matchWeekday('sat')).toBe(6)
  })
  it('không khớp bừa', () => {
    expect(matchWeekday('hello')).toBe(null)
  })
})

describe('parseDayReq (DD/MM cho mọi ngôn ngữ)', () => {
  it('DD/MM và DD/MM/YYYY', () => {
    expect(parseDayReq('ngày 10/6/2026', false)).toBe('2026-06-10')
    expect(md(parseDayReq('10/6', false))).toBe('-06-10')
  })
  it('VN "ngày D tháng M"', () => {
    expect(parseDayReq('ngày 8 tháng 6 năm 2026', false)).toBe('2026-06-08')
  })
  it('EN tên tháng: "10 june" / "june 10"', () => {
    expect(parseDayReq('10 june 2026', false)).toBe('2026-06-10')
    expect(parseDayReq('june 10 2026', false)).toBe('2026-06-10')
  })
})

describe('resolveDate (tương đối)', () => {
  const today = localTodayStr()
  it('hôm nay / today', () => {
    expect(resolveDate('hôm nay')).toBe(today)
    expect(resolveDate('add shift today')).toBe(today)
  })
  it('mai / tomorrow = +1', () => {
    expect(resolveDate('ngày mai')).toBe(addDaysStr(today, 1))
    expect(resolveDate('tomorrow')).toBe(addDaysStr(today, 1))
  })
  it('mốt / day after tomorrow = +2 (không nhầm thành +1)', () => {
    expect(resolveDate('ngày mốt')).toBe(addDaysStr(today, 2))
    expect(resolveDate('day after tomorrow')).toBe(addDaysStr(today, 2))
  })
})

describe('parseTimesheetReq', () => {
  it('VN: bảng công tháng 3 tuần 2', () => {
    expect(parseTimesheetReq('xem bảng công tháng 3 tuần 2')).toEqual({
      month: 3,
      week: 2,
      year: null,
    })
  })
  it('EN: timesheet for month 7 / tên tháng', () => {
    expect(parseTimesheetReq('timesheet for month 7')).toEqual({
      month: 7,
      week: null,
      year: null,
    })
    expect(parseTimesheetReq('show timesheet for march week 2')).toEqual({
      month: 3,
      week: 2,
      year: null,
    })
  })
  it('không có bảng công → null', () => {
    expect(parseTimesheetReq('lương tháng 3')).toBe(null)
  })
})

describe('parseShiftIntent', () => {
  it('VN: thêm ca đêm mai', () => {
    const r = parseShiftIntent('thêm ca đêm mai')
    expect(r).toMatchObject({ type: 'night' })
    expect(r.date).toBe(addDaysStr(localTodayStr(), 1))
  })
  it('EN: add night shift tomorrow', () => {
    const r = parseShiftIntent('add night shift tomorrow')
    expect(r).toMatchObject({ type: 'night' })
    expect(r.date).toBe(addDaysStr(localTodayStr(), 1))
  })
  it('EN: book shift friday 8am-4pm (đủ giờ)', () => {
    const r = parseShiftIntent('book shift friday 8am-4pm')
    expect(r.times).toEqual(['08:00', '16:00'])
  })
  it('câu hỏi → null', () => {
    expect(parseShiftIntent('how many night shifts?')).toBe(null)
  })
})

describe('parseDeduction', () => {
  it('VN add (lý do lấy từ chuỗi đã bỏ dấu — hành vi cũ giữ nguyên)', () => {
    expect(parseDeductionAdd('trừ 200k lý do đi trễ')).toMatchObject({
      amount: 200000,
      reason: 'di tre',
    })
  })
  it('EN add: deduct / compensation', () => {
    expect(parseDeductionAdd('deduct 200k reason late')).toMatchObject({
      amount: 200000,
      reason: 'late',
    })
    expect(parseDeductionAdd('compensation 500k for broken cup')).toMatchObject({
      amount: 500000,
      reason: 'broken cup',
    })
  })
  it('query VN + EN', () => {
    expect(parseDeductionQuery('bồi thường tháng 5')).toEqual({ month: 5, year: null })
    expect(parseDeductionQuery('deductions for month 5')).toEqual({ month: 5, year: null })
  })
})

describe('parseExtraIncome', () => {
  it('VN add', () => {
    expect(parseExtraIncomeAdd('việc ngoài 500k sửa máy')).toMatchObject({
      amount: 500000,
    })
  })
  it('EN add', () => {
    const r = parseExtraIncomeAdd('extra income 500k fixing AC')
    expect(r.amount).toBe(500000)
    expect(r.description.toLowerCase()).toContain('fixing')
  })
  it('query EN', () => {
    expect(parseExtraIncomeQuery('extra income month 6')).toEqual({ month: 6, year: null })
  })
  it('batch EN: nhiều ngày + tiền/buổi', () => {
    const r = parseExtraIncomeBatch('12/6, 19/6 side job 200k each')
    expect(r.dates.length).toBe(2)
    expect(r.amount).toBe(200000)
  })
})

describe('parsePlannedReq', () => {
  it('VN + EN', () => {
    expect(parsePlannedReq('lịch dự kiến tuần này')).toEqual({ scope: 'week' })
    expect(parsePlannedReq('show my planned schedule')).toEqual({ scope: 'week' })
    expect(parsePlannedReq('lương tháng này')).toBe(null)
  })
})

describe('parseFeasibilityReq', () => {
  it('VN', () => {
    const r = parseFeasibilityReq('tháng này làm được 5 triệu không khả thi')
    expect(r.target).toBe(5000000)
  })
  it('EN + "in N days"', () => {
    const r = parseFeasibilityReq('can I reach 3 million in 10 days')
    expect(r).toMatchObject({ target: 3000000, withinDays: 10 })
  })
})

describe('parseProjectionReq', () => {
  it('VN', () => {
    expect(parseProjectionReq('làm thêm 3 ca đêm nữa thì bao nhiêu')).toEqual({
      count: 3,
      type: 'night',
    })
  })
  it('EN', () => {
    expect(parseProjectionReq('how much if I work 3 more night shifts?')).toEqual({
      count: 3,
      type: 'night',
    })
  })
})

describe('parseOpenTool', () => {
  it('import / reconcile (không cần "mở")', () => {
    expect(parseOpenTool('nhập lịch')).toBe('import')
    expect(parseOpenTool('import schedule')).toBe('import')
    expect(parseOpenTool('reconcile timesheet')).toBe('reconcile')
    expect(parseOpenTool('đối chiếu')).toBe('reconcile')
  })
  it('"important" KHÔNG bị nhầm thành import', () => {
    expect(parseOpenTool('this is important')).toBe(null)
  })
  it('cần động từ "mở/open/show" cho các đích khác', () => {
    expect(parseOpenTool('open profile')).toBe('profile')
    expect(parseOpenTool('open pay period')).toBe('payPeriod')
    expect(parseOpenTool('open compensation')).toBe('deductions')
    expect(parseOpenTool('pay period this month?')).toBe(null) // không có động từ mở
  })
})

describe('deaccent', () => {
  it('bỏ dấu + đ→d + thường hoá', () => {
    expect(deaccent('Đối Chiếu CÔNG')).toBe('doi chieu cong')
  })
})

describe('extractDates', () => {
  it('DD/MM list', () => {
    expect(extractDates('12/6, 19/6, 26/6')).toEqual([
      expect.stringMatching(/-06-12$/),
      expect.stringMatching(/-06-19$/),
      expect.stringMatching(/-06-26$/),
    ])
  })
})
