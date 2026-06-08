import { useCallback, useEffect, useState } from 'react'
import * as shiftsModel from '../models/shiftsModel.js'
import {
  periodClosedError,
  dayLimitError,
  shiftHours,
} from '../lib/shiftRules.js'

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
    const limitErr = dayLimitError(shifts, shift.work_date, shiftHours(shift))
    if (limitErr) return limitErr
    const { error } = await shiftsModel.insertShift(shift, session.user.id)
    if (error) return error.message
    await reload()
    return null
  }

  async function updateShift(id, fields) {
    const limitErr = dayLimitError(shifts, fields.work_date, shiftHours(fields), id)
    if (limitErr) return limitErr
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
      const limitErr = dayLimitError(shifts, r.date, shiftHours(shift))
      if (limitErr) {
        errors.push(`${r.date}: ${limitErr}`)
        continue
      }
      const { error } = await shiftsModel.insertShift(shift, session.user.id)
      if (error) errors.push(`${r.date}: ${error.message}`)
    }
    await reload()
    return errors
  }

  return {
    shifts,
    loadError,
    setLoadError,
    reload,
    addShift,
    updateShift,
    deleteShift,
    importWeekShifts,
  }
}
