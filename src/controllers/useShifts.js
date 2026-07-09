import { useCallback, useEffect, useRef, useState } from 'react'
import * as shiftsModel from '../models/shiftsModel.js'
import {
  periodClosedError,
  overlapError,
  partitionImportShifts,
} from '../lib/shiftRules.js'

// CONTROLLER: state + thao tác cho ca làm việc. View gọi các hàm này, không đụng
// trực tiếp Supabase. Trả lỗi dạng chuỗi cho form, hoặc set loadError cho nền.
export function useShifts(session) {
  const [shifts, setShifts] = useState([])
  const [loadError, setLoadError] = useState(null)
  // `loading` = true chỉ tới khi lần tải ĐẦU TIÊN xong (dùng để hiện skeleton).
  // Các lần reload sau (thêm/sửa ca) chạy nền, không bật lại skeleton.
  const [loading, setLoading] = useState(true)
  const loadedFor = useRef(null)

  const reload = useCallback(async () => {
    const { data, error } = await shiftsModel.fetchShifts()
    if (error) setLoadError(error.message)
    else {
      setLoadError(null)
      setShifts(data ?? [])
    }
    setLoading(false) // xong (kể cả lỗi) → thoát skeleton
  }, [])

  useEffect(() => {
    if (!session) {
      setShifts([])
      loadedFor.current = null
      setLoading(false)
      return
    }
    // Chỉ bật skeleton khi ĐỔI người dùng (đăng nhập/chuyển tài khoản), không phải
    // mỗi lần session đổi tham chiếu (vd token tự làm mới) → tránh chớp vô nghĩa.
    if (loadedFor.current !== session.user.id) {
      loadedFor.current = session.user.id
      setLoading(true)
    }
    reload()
  }, [session, reload])

  async function addShift(shift) {
    const closedErr = periodClosedError(shift.work_date)
    if (closedErr) return closedErr
    // Ngày đã có ca LỊCH DỰ KIẾN (chưa check-in: thiếu giờ thực) → "hiện thực hoá"
    // chính ca đó bằng cách ghi giờ thực vào nó, thay vì chèn ca thứ hai. Tránh
    // (1) bị overlapError chặn nhầm vì ShiftForm đã kèm sẵn khung giờ dự kiến, và
    // (2) nhân đôi dòng (ca lịch + ca thực) cho cùng một ngày.
    // Ghi THẲNG qua model — KHÔNG gọi updateShift (nút "Lưu" của thẻ ca) để hai
    // chức năng "Thêm ca" và "Lưu thẻ ca" tách bạch, không phụ thuộc nhau.
    const planned = shifts.find(
      (s) => s.work_date === shift.work_date && !s.start_time && !s.end_time
    )
    if (planned) {
      const overlapErr = overlapError(shift, shifts, planned.id)
      if (overlapErr) return overlapErr
      const { error } = await shiftsModel.updateShift(planned.id, shift)
      if (error) return error.message
      await reload()
      return null
    }
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

  // Tạo nhiều ca cùng lúc từ lịch tuần đã đọc bằng AI (hoặc nhập tay). CHỐNG TRÙNG:
  // ca nào ĐÃ CÓ (trùng/chồng giờ với ca có sẵn trong DB của user, qua RLS) → BỎ QUA,
  // chỉ insert ca CHƯA CÓ. Trả về { created, skipped, errors } để view báo tóm tắt.
  async function importWeekShifts(rows) {
    const errors = []
    // Dựng ca DỰ KIẾN từ từng dòng; tách sớm ngày thuộc kỳ ĐÃ CHỐT thành lỗi (không
    // phải "đã có" — đây là lỗi không nhập được).
    const candidates = []
    for (const r of rows) {
      const closedErr = periodClosedError(r.date)
      if (closedErr) {
        errors.push(`${r.date}: ${closedErr}`)
        continue
      }
      candidates.push({
        work_date: r.date,
        // Lịch tuần chỉ là ca DỰ KIẾN → chỉ đổ vào Sched. start/end.
        start_time: null,
        end_time: null,
        scheduled_start: r.start,
        scheduled_end: r.end,
      })
    }
    // BỎ QUA ca trùng/chồng giờ với ca đã có (và giữa các dòng trong CHÍNH lượt nhập
    // này — `shifts` chỉ reload ở cuối). Dùng đúng overlapError; chỉ tạo ca CHƯA CÓ.
    const { toCreate, skipped } = partitionImportShifts(candidates, shifts)
    let created = 0
    for (const shift of toCreate) {
      const { error } = await shiftsModel.insertShift(shift, session.user.id)
      if (error) errors.push(`${shift.work_date}: ${error.message}`)
      else created++
    }
    await reload()
    return { created, skipped: skipped.length, errors }
  }

  return {
    shifts,
    loading,
    loadError,
    setLoadError,
    addShift,
    updateShift,
    deleteShift,
    importWeekShifts,
  }
}
