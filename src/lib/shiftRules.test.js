import { describe, it, expect } from 'vitest'
import { overlapError } from './shiftRules.js'

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
