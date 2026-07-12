import { useCallback, useEffect, useRef, useState } from 'react'
import * as payrollsModel from '../models/payrollsModel.js'

// CONTROLLER: state + thao tác cho kỳ lương đã nhận (payrolls).
export function usePayrolls(session, onError) {
  const [payrolls, setPayrolls] = useState([])
  // Xem chú thích `loading` ở useShifts: chỉ true tới khi tải đầu tiên xong.
  const [loading, setLoading] = useState(true)
  const loadedFor = useRef(null)

  const reload = useCallback(async () => {
    const { data, error } = await payrollsModel.fetchPayrolls()
    // Lỗi tải nền (mạng/RLS) → báo qua onError thay vì nuốt lặng; GIỮ dữ liệu cũ
    // (không ghi đè bằng rỗng) để không mất danh sách đang hiển thị.
    if (error) onError?.(error.message)
    else setPayrolls(data ?? [])
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!session) {
      setPayrolls([])
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

  async function markReceived(periodKey, receivedOn) {
    const { error } = await payrollsModel.upsertPayroll(
      session.user.id,
      periodKey,
      receivedOn
    )
    if (error) onError?.(error.message)
    await reload()
  }

  async function unmarkReceived(periodKey) {
    const { error } = await payrollsModel.deletePayroll(session.user.id, periodKey)
    if (error) onError?.(error.message)
    await reload()
  }

  return { payrolls, loading, reload, markReceived, unmarkReceived }
}
