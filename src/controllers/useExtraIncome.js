import { useCallback, useEffect, useRef, useState } from 'react'
import * as model from '../models/extraIncomeModel.js'
import { localTodayStr } from '../lib/payPeriod.js'

// CONTROLLER: state + CRUD cho thu nhập việc ngoài. Tách biệt với ca làm; KHÔNG
// dính tới shiftMath/rates. View gọi các hàm này, không đụng Supabase trực tiếp.
export function useExtraIncome(session, onError) {
  const [extraIncome, setExtraIncome] = useState([])
  // `loading` = true tới khi tải ĐẦU xong (nhất quán với các controller khác để
  // view chờ được trước khi hiện số). Chỉ bật lại skeleton khi ĐỔI user.
  const [loading, setLoading] = useState(true)
  const loadedFor = useRef(null)

  const reload = useCallback(async () => {
    const { data, error } = await model.fetchExtraIncome()
    if (error) onError?.(error.message)
    else setExtraIncome(data ?? [])
    setLoading(false) // xong (kể cả lỗi) → thoát skeleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!session) {
      setExtraIncome([])
      loadedFor.current = null
      setLoading(false)
      return
    }
    if (loadedFor.current !== session.user.id) {
      loadedFor.current = session.user.id
      setLoading(true)
    }
    reload()
  }, [session, reload])

  async function addExtraIncome({ date, description, amount }) {
    const { error } = await model.insertExtraIncome({
      userId: session.user.id,
      date,
      description,
      amount,
    })
    if (error) return error.message
    await reload()
    return null
  }

  async function updateExtraIncome(id, fields) {
    const { error } = await model.updateExtraIncome(id, fields)
    if (error) return error.message
    await reload()
    return null
  }

  async function deleteExtraIncome(id) {
    const { error } = await model.deleteExtraIncome(id)
    if (error) onError?.(error.message)
    else setExtraIncome((prev) => prev.filter((x) => x.id !== id))
  }

  // Đổi trạng thái ĐÃ NHẬN ↔ CHƯA NHẬN. Khi nhận: ghi received_at = hôm nay (quyết
  // định khoản vào KỲ LƯƠNG nào). Khi bỏ nhận: xoá received_at, khoản về treo.
  async function setReceived(id, received) {
    return setReceivedMany([id], received)
  }

  // HÀNG LOẠT: đặt trạng thái nhận cho nhiều khoản (1 query + reload 1 lần). Trả
  // message lỗi nếu DB lỗi (caller giữ nguyên UI cũ), null nếu OK.
  async function setReceivedMany(ids, received) {
    if (!ids || ids.length === 0) return null
    const { error } = await model.setReceivedMany(
      ids,
      received,
      received ? localTodayStr() : null
    )
    if (error) return error.message
    await reload()
    return null
  }

  return {
    extraIncome,
    loading,
    addExtraIncome,
    updateExtraIncome,
    deleteExtraIncome,
    setReceived,
    setReceivedMany,
  }
}
