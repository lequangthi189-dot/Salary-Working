import { useCallback, useEffect, useState } from 'react'
import * as model from '../models/extraIncomeModel.js'
import { localTodayStr } from '../lib/payPeriod.js'

// CONTROLLER: state + CRUD cho thu nhập việc ngoài. Tách biệt với ca làm; KHÔNG
// dính tới shiftMath/rates. View gọi các hàm này, không đụng Supabase trực tiếp.
export function useExtraIncome(session, onError) {
  const [extraIncome, setExtraIncome] = useState([])

  const reload = useCallback(async () => {
    const { data, error } = await model.fetchExtraIncome()
    if (error) onError?.(error.message)
    else setExtraIncome(data ?? [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (session) reload()
    else setExtraIncome([])
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
    const { error } = await model.updateExtraIncome(id, {
      received,
      received_at: received ? localTodayStr() : null,
    })
    if (error) return error.message
    await reload()
    return null
  }

  return {
    extraIncome,
    addExtraIncome,
    updateExtraIncome,
    deleteExtraIncome,
    setReceived,
  }
}
