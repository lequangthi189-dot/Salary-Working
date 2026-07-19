import { describe, it, expect } from 'vitest'
import {
  overlapError,
  partitionImportShifts,
  matchesShiftSearch,
} from './shiftRules.js'

// Helper tạo ca với giờ thực tế.
const shift = (id, work_date, start_time, end_time) => ({
  id,
  work_date,
  start_time,
  end_time,
})

const D = '2026-06-18'

describe('overlapError', () => {
  it('(1) hai ca 22:00–06:00 y hệt → chặn', () => {
    const existing = [shift(1, D, '22:00', '06:00')]
    const cand = { work_date: D, start_time: '22:00', end_time: '06:00' }
    expect(overlapError(cand, existing)).toBeTruthy()
  })

  it('(2) 22:00–06:00 và 02:00–08:00 → chặn (chồng ở 02:00–06:00)', () => {
    const existing = [shift(1, D, '22:00', '06:00')]
    const cand = { work_date: D, start_time: '02:00', end_time: '08:00' }
    expect(overlapError(cand, existing)).toBeTruthy()
  })

  it('(3) 08:00–12:00 và 13:00–17:00 → cho phép', () => {
    const existing = [shift(1, D, '08:00', '12:00')]
    const cand = { work_date: D, start_time: '13:00', end_time: '17:00' }
    expect(overlapError(cand, existing)).toBeNull()
  })

  it('(4) ca qua đêm 22:00–06:00 và ca sáng HÔM SAU 08:00–12:00 → cho phép', () => {
    const existing = [shift(1, D, '22:00', '06:00')]
    const cand = { work_date: '2026-06-19', start_time: '08:00', end_time: '12:00' }
    expect(overlapError(cand, existing)).toBeNull()
  })

  it('ca liền kề không chồng: 08:00–12:00 và 12:00–16:00 → cho phép', () => {
    const existing = [shift(1, D, '08:00', '12:00')]
    const cand = { work_date: D, start_time: '12:00', end_time: '16:00' }
    expect(overlapError(cand, existing)).toBeNull()
  })

  it('khi SỬA: bỏ qua chính ca đang sửa (excludeId)', () => {
    const existing = [shift(1, D, '08:00', '12:00')]
    // Sửa chính ca id=1, giờ trùng với bản gốc của nó → KHÔNG được tự báo chồng.
    const fields = { work_date: D, start_time: '08:00', end_time: '12:00' }
    expect(overlapError(fields, existing, 1)).toBeNull()
  })

  it('khi SỬA: vẫn chặn nếu chồng ca KHÁC', () => {
    const existing = [
      shift(1, D, '08:00', '12:00'),
      shift(2, D, '13:00', '17:00'),
    ]
    // Sửa ca id=1 thành 11:00–14:00 → chồng ca id=2.
    const fields = { work_date: D, start_time: '11:00', end_time: '14:00' }
    expect(overlapError(fields, existing, 1)).toBeTruthy()
  })

  it('so với ca chỉ có lịch dự kiến (chưa check-in) cũng tính chồng', () => {
    const planned = {
      id: 9,
      work_date: D,
      start_time: null,
      end_time: null,
      scheduled_start: '09:00',
      scheduled_end: '17:00',
    }
    const cand = { work_date: D, start_time: '16:00', end_time: '20:00' }
    expect(overlapError(cand, [planned])).toBeTruthy()
  })

  it('thiếu mốc giờ → không kiểm tra (null)', () => {
    const cand = { work_date: D, start_time: null, end_time: null }
    expect(overlapError(cand, [shift(1, D, '08:00', '12:00')])).toBeNull()
  })
})

// Ca DỰ KIẾN nhập từ lịch tuần: chỉ có scheduled_start/end (giờ thực = null).
const planned = (work_date, start, end) => ({
  work_date,
  start_time: null,
  end_time: null,
  scheduled_start: start,
  scheduled_end: end,
})

const D1 = '2026-06-15' // Thứ 2
const D2 = '2026-06-16'
const D3 = '2026-06-17'

describe('partitionImportShifts', () => {
  it('(1) tuần TRỐNG → tạo HẾT, không bỏ ca nào', () => {
    const candidates = [
      planned(D1, '08:00', '12:00'),
      planned(D2, '09:00', '17:00'),
      planned(D3, '22:00', '06:00'),
    ]
    const { toCreate, skipped } = partitionImportShifts(candidates, [])
    expect(toCreate).toHaveLength(3)
    expect(skipped).toHaveLength(0)
  })

  it('(2) tuần đã có VÀI ca → chỉ tạo ca mới, bỏ ca trùng/chồng', () => {
    // Đã có: D1 đúng khít (08:00–12:00) và D3 chồng giờ (02:00–08:00 vs 22:00–06:00).
    const existing = [
      shift(1, D1, '08:00', '12:00'),
      shift(2, D3, '02:00', '08:00'),
    ]
    const candidates = [
      planned(D1, '08:00', '12:00'), // trùng khít → bỏ
      planned(D2, '09:00', '17:00'), // mới → tạo
      planned(D3, '22:00', '06:00'), // chồng ở 02:00–06:00 → bỏ
    ]
    const { toCreate, skipped } = partitionImportShifts(candidates, existing)
    expect(toCreate).toHaveLength(1)
    expect(toCreate[0].work_date).toBe(D2)
    expect(skipped.map((s) => s.work_date)).toEqual([D1, D3])
  })

  it('(3) tuần đã ĐỦ → không tạo thêm ca nào', () => {
    const existing = [
      shift(1, D1, '08:00', '12:00'),
      shift(2, D2, '09:00', '17:00'),
    ]
    const candidates = [
      planned(D1, '08:00', '12:00'),
      planned(D2, '09:00', '17:00'),
    ]
    const { toCreate, skipped } = partitionImportShifts(candidates, existing)
    expect(toCreate).toHaveLength(0)
    expect(skipped).toHaveLength(2)
  })

  it('chống trùng GIỮA CÁC DÒNG trong cùng lượt nhập (chưa có trong DB)', () => {
    // Hai dòng cùng ngày chồng giờ nhau: dòng đầu được tạo, dòng sau bị bỏ.
    const candidates = [
      planned(D1, '08:00', '12:00'),
      planned(D1, '10:00', '14:00'), // chồng dòng trước → bỏ
    ]
    const { toCreate, skipped } = partitionImportShifts(candidates, [])
    expect(toCreate).toHaveLength(1)
    expect(skipped).toHaveLength(1)
  })
})

describe('matchesShiftSearch (tìm ca)', () => {
  const day = shift(1, '2026-06-10', '08:00', '12:00') // ca NGÀY 10/6
  const night = shift(2, '2026-06-10', '22:00', '06:00') // ca ĐÊM 10/6
  const plan = planned('2026-06-05', '08:00', '12:00') // chỉ có LỊCH, chưa check-in

  it('query rỗng / chỉ khoảng trắng → khớp hết (không lọc)', () => {
    expect(matchesShiftSearch(day, 'day', '')).toBe(true)
    expect(matchesShiftSearch(day, 'day', '   ')).toBe(true)
  })

  it('NGÀY: nhiều định dạng gõ ngày đều khớp work_date', () => {
    for (const q of ['2026-06-10', '10/6', '10/06', '10/6/2026', '10-6', '10.6', '10']) {
      expect(matchesShiftSearch(day, 'day', q)).toBe(true)
    }
    expect(matchesShiftSearch(day, 'day', '6')).toBe(true) // tháng 6
    expect(matchesShiftSearch(day, 'day', '2026')).toBe(true) // năm
  })

  it('NGÀY: ngày KHÔNG khớp → false', () => {
    expect(matchesShiftSearch(day, 'day', '11/6')).toBe(false)
    expect(matchesShiftSearch(day, 'day', '2025-06-10')).toBe(false)
  })

  it('GIỜ: khớp giờ vào/ra, chuẩn hoá 6:00 = 06:00', () => {
    expect(matchesShiftSearch(night, 'night', '22:00')).toBe(true) // giờ vào
    expect(matchesShiftSearch(night, 'night', '06:00')).toBe(true) // giờ ra
    expect(matchesShiftSearch(night, 'night', '6:00')).toBe(true) // ra, không số 0
    expect(matchesShiftSearch(night, 'night', '06')).toBe(true)
    expect(matchesShiftSearch(night, 'night', '2200')).toBe(true)
    expect(matchesShiftSearch(day, 'day', '09:00')).toBe(false) // ca 08–12 không có
  })

  it('GIỜ: ca chỉ có LỊCH (chưa check-in) vẫn khớp theo giờ lịch dự kiến', () => {
    expect(matchesShiftSearch(plan, 'day', '08:00')).toBe(true)
    expect(matchesShiftSearch(plan, 'day', '8:00')).toBe(true)
    expect(matchesShiftSearch(plan, 'day', '5/6')).toBe(true) // ngày 5/6
  })

  it('LOẠI CA: song ngữ đêm/ngày, không phân biệt dấu & hoa/thường', () => {
    expect(matchesShiftSearch(night, 'night', 'đêm')).toBe(true)
    expect(matchesShiftSearch(night, 'night', 'ĐÊM')).toBe(true)
    expect(matchesShiftSearch(night, 'night', 'dem')).toBe(true)
    expect(matchesShiftSearch(night, 'night', 'night')).toBe(true)
    expect(matchesShiftSearch(night, 'night', 'ngày')).toBe(false)
    expect(matchesShiftSearch(day, 'day', 'ngày')).toBe(true)
    expect(matchesShiftSearch(day, 'day', 'Ngày')).toBe(true)
    expect(matchesShiftSearch(day, 'day', 'day')).toBe(true)
    expect(matchesShiftSearch(day, 'day', 'đêm')).toBe(false)
  })

  it('KẾT HỢP: gõ chuỗi vừa-ngày-vừa-loại không khớp cả hai → false', () => {
    // "10/6 đêm" là một chuỗi liền → không có biểu diễn nào chứa nguyên cụm này.
    expect(matchesShiftSearch(night, 'night', '10/6 đêm')).toBe(false)
  })
})
