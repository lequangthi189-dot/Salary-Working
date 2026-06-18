import { useCallback, useEffect, useState } from 'react'
import * as shiftsModel from '../models/shiftsModel.js'
import { periodClosedError, overlapError } from '../lib/shiftRules.js'

// CONTROLLER: state + thao tác cho ca làm việc. View gọi các hàm này, không đụng
// trực tiếp Supabase. Trả lỗi dạng chuỗi cho form, hoặc set loadError cho nền.
export function useShifts(session) {
  const [shifts, setShifts] = useState([])
  const [loadError, setLoadError] = useState(null)

  const reload = useCallback(async () => {
    const { data, error } = await shiftsModel.fetchShifts()
    if (error) setLoadError(error.message)
    else {
      setLoadError(null)
      setShifts(data ?? [])
    }
  }, [])

  useEffect(() => {
    if (session) reload()
    else setShifts([])
  }, [session, reload])

  async function addShift(shift) {
    const closedErr = periodClosedError(shift.work_date)
    if (closedErr) return closedErr
    // Ngày đã có ca LỊCH DỰ KIẾN (chưa check-in: thiếu giờ thực) → "hiện thực hoá"
    // chính ca đó bằng cách cập nhật giờ thực vào nó, thay vì chèn ca thứ hai. Tránh
    // (1) bị overlapError chặn nhầm vì ShiftForm đã kèm sẵn khung giờ dự kiến, và
    // (2) nhân đôi dòng (ca lịch + ca thực) cho cùng một ngày.
    const planned = shifts.find(
      (s) => s.work_date === shift.work_date && !s.start_time && !s.end_time
    )
    if (planned) return updateShift(planned.id, shift)
    const overlapErr = overlapError(shift, shifts)
    if (overlapErr) return overlapErr
    const { error } = await shiftsModel.insertShift(shift, session.user.id)
    if (error) return error.message
    await reload()
    return null
  }

  async function updateShift(id, fields) {
    const overlapErr = overlapError(fields, shifts, id)
    if (overlapErr) return overlapErr
    const { error } = await shiftsModel.updateShift(id, fields)
    if (error) return error.message
    await reload()
    return null
  }

  async function deleteShift(id) {
    const { error } = await shiftsModel.deleteShift(id)
    if (error) setLoadError(error.message)
    else setShifts((prev) => prev.filter((s) => s.id !== id))
  }

  // Tạo nhiều ca cùng lúc từ lịch tuần đã đọc bằng AI. Trả về mảng lỗi (rỗng nếu OK).
  async function importWeekShifts(rows) {
    const errors = []
    // Gộp ca đã có + ca vừa chấp nhận trong CHÍNH lần import này để bắt cả chồng
    // lấn giữa các dòng trong lịch tuần (reload chỉ chạy ở cuối nên `shifts` chưa kịp
    // cập nhật). Mỗi ca tạm gán id giả để overlapError không tự loại nhầm.
    const accepted = [...shifts]
    for (const r of rows) {
      const shift = {
        work_date: r.date,
        // Lịch tuần chỉ là ca DỰ KIẾN → chỉ đổ vào Sched. start/end.
        start_time: null,
        end_time: null,
        scheduled_start: r.start,
        scheduled_end: r.end,
      }
      const closedErr = periodClosedError(r.date)
      if (closedErr) {
        errors.push(`${r.date}: ${closedErr}`)
        continue
      }
      const overlapErr = overlapError(shift, accepted)
      if (overlapErr) {
        errors.push(`${r.date}: ${overlapErr}`)
        continue
      }
      const { error } = await shiftsModel.insertShift(shift, session.user.id)
      if (error) errors.push(`${r.date}: ${error.message}`)
      else accepted.push(shift)
    }
    await reload()
    return errors
  }

  return {
    shifts,
    loadError,
    setLoadError,
    addShift,
    updateShift,
    deleteShift,
    importWeekShifts,
  }
}
