import { describe, it, expect } from 'vitest'
import {
  overlapError,
  partitionImportShifts,
  matchesShiftSearch,
  buildSchedByDate,
  pickPlannedShift,
  shiftTimeKey,
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

// ── pickPlannedShift / buildSchedByDate ─────────────────────────────────────
// Một ngày có thể có NHIỀU ca dự kiến rời giờ (vd 06–10, 12–16, 18–22). Ca dự kiến
// có id để chấm công ghi được vào ĐÚNG dòng.
const sched = (id, work_date, start, end) => ({
  id,
  work_date,
  start_time: null,
  end_time: null,
  scheduled_start: start,
  scheduled_end: end,
})
// Ca dự kiến ĐÃ chấm công (có giờ thực) — không còn là ứng viên.
const schedDone = (id, work_date, start, end, aStart, aEnd) => ({
  ...sched(id, work_date, start, end),
  start_time: aStart,
  end_time: aEnd,
})
const cand = (work_date, start_time, end_time) => ({
  work_date,
  start_time,
  end_time,
})

describe('pickPlannedShift', () => {
  it('ngày không có ca dự kiến nào → null', () => {
    const shifts = [shift(1, D, '08:00', '12:00')]
    expect(pickPlannedShift(shifts, cand(D, '13:00', '17:00'))).toBeNull()
  })

  it('ĐÚNG MỘT ca dự kiến → trả ca đó DÙ KHÔNG giao giờ (giữ hành vi cũ)', () => {
    // Đây là điều kiện không-hồi-quy cho mọi dữ liệu một-lịch-một-ngày: lịch 08–16
    // mà chấm công 18–22 thì vẫn gắn vào chính ca đó như trước.
    const shifts = [sched(1, D, '08:00', '16:00')]
    expect(pickPlannedShift(shifts, cand(D, '18:00', '22:00')).id).toBe(1)
  })

  it('nhiều ca rời giờ → chọn ca GIAO NHIỀU PHÚT NHẤT', () => {
    const shifts = [
      sched(1, D, '06:00', '10:00'),
      sched(2, D, '12:00', '16:00'),
      sched(3, D, '18:00', '22:00'),
    ]
    expect(pickPlannedShift(shifts, cand(D, '12:05', '16:00')).id).toBe(2)
    expect(pickPlannedShift(shifts, cand(D, '06:05', '10:00')).id).toBe(1)
    expect(pickPlannedShift(shifts, cand(D, '18:10', '22:00')).id).toBe(3)
  })

  it('KHÔNG phụ thuộc thứ tự mảng nguồn (shifts sắp theo created_at)', () => {
    const rows = [
      sched(1, D, '06:00', '10:00'),
      sched(2, D, '12:00', '16:00'),
      sched(3, D, '18:00', '22:00'),
    ]
    const c = cand(D, '06:05', '10:00')
    expect(pickPlannedShift(rows, c).id).toBe(1)
    expect(pickPlannedShift([...rows].reverse(), c).id).toBe(1)
  })

  it('không ca nào giao giờ → chọn ca có giờ BẮT ĐẦU gần nhất', () => {
    const shifts = [sched(1, D, '06:00', '10:00'), sched(2, D, '18:00', '22:00')]
    // 13:00 cách 06:00 là 7h, cách 18:00 là 5h → ca chiều gần hơn.
    expect(pickPlannedShift(shifts, cand(D, '13:00', '15:00')).id).toBe(2)
  })

  it('ca dự kiến QUA NỬA ĐÊM khớp đúng giờ chấm công qua nửa đêm', () => {
    const shifts = [sched(1, D, '08:00', '12:00'), sched(2, D, '22:00', '06:00')]
    expect(pickPlannedShift(shifts, cand(D, '22:05', '06:00')).id).toBe(2)
  })

  it('ca ĐÃ chấm công không phải ứng viên', () => {
    const shifts = [
      schedDone(1, D, '06:00', '10:00', '06:05', '10:00'),
      sched(2, D, '12:00', '16:00'),
    ]
    expect(pickPlannedShift(shifts, cand(D, '12:00', '16:00')).id).toBe(2)
  })

  it('ca dự kiến của NGÀY KHÁC không lẫn vào', () => {
    const shifts = [sched(1, D1, '06:00', '10:00'), sched(2, D2, '06:00', '10:00')]
    expect(pickPlannedShift(shifts, cand(D2, '06:05', '10:00')).id).toBe(2)
  })
})

describe('buildSchedByDate', () => {
  it('ngày nhiều lịch → trả ĐỦ, sắp theo giờ bắt đầu tăng dần', () => {
    // Mảng nguồn theo created_at (ca tạo sau đứng trước) — kết quả vẫn theo giờ.
    const map = buildSchedByDate([
      sched(3, D, '18:00', '22:00'),
      sched(1, D, '06:00', '10:00'),
      sched(2, D, '12:00', '16:00'),
    ])
    expect(map.get(D).map((x) => x.id)).toEqual([1, 2, 3])
    expect(map.get(D).map((x) => x.start)).toEqual(['06:00', '12:00', '18:00'])
    expect(map.get(D)[0].end).toBe('10:00')
  })

  it('checkedIn đánh dấu đúng ca đã có giờ thực', () => {
    const map = buildSchedByDate([
      schedDone(1, D, '06:00', '10:00', '06:05', '10:00'),
      sched(2, D, '12:00', '16:00'),
    ])
    expect(map.get(D).map((x) => x.checkedIn)).toEqual([true, false])
  })

  it('ca KHÔNG có lịch dự kiến → không tạo entry', () => {
    const map = buildSchedByDate([shift(1, D, '08:00', '12:00')])
    expect(map.has(D)).toBe(false)
  })

  it('gom theo từng ngày, không trộn lẫn', () => {
    const map = buildSchedByDate([sched(1, D1, '06:00', '10:00'), sched(2, D2, '12:00', '16:00')])
    expect(map.get(D1).map((x) => x.id)).toEqual([1])
    expect(map.get(D2).map((x) => x.id)).toEqual([2])
  })
})

describe('shiftTimeKey', () => {
  it('ưu tiên giờ THỰC TẾ, chưa chấm công thì lấy giờ LỊCH', () => {
    expect(shiftTimeKey(shift(1, D, '06:05', '10:00'))).toBe('06:05')
    expect(shiftTimeKey(sched(2, D, '12:00', '16:00'))).toBe('12:00')
    // Ca có cả hai → giờ thực thắng (đó mới là lúc thật sự vào ca).
    expect(shiftTimeKey(schedDone(3, D, '18:00', '22:00', '18:10', '22:00'))).toBe('18:10')
  })

  it('thiếu cả hai mốc → chuỗi rỗng (xếp lên đầu, không văng lỗi)', () => {
    expect(shiftTimeKey({ work_date: D })).toBe('')
  })

  it('so sánh từ điển ra ĐÚNG thứ tự thời gian (khoá sắp xếp hợp lệ)', () => {
    const rows = [
      sched(3, D, '18:00', '22:00'),
      shift(1, D, '06:05', '10:00'),
      sched(2, D, '12:00', '16:00'),
    ]
    const sorted = [...rows].sort((a, b) => shiftTimeKey(a).localeCompare(shiftTimeKey(b)))
    expect(sorted.map((s) => s.id)).toEqual([1, 2, 3])
  })
})
