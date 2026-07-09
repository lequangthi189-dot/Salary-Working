import { useCallback, useEffect, useRef, useState } from 'react'
import * as deductionsModel from '../models/deductionsModel.js'

// CONTROLLER: state + thao tác cho khoản bị trừ (deductions).
export function useDeductions(session, onError) {
  const [deductions, setDeductions] = useState([])
  // Xem chú thích `loading` ở useShifts: chỉ true tới khi tải đầu tiên xong.
  const [loading, setLoading] = useState(true)
  const loadedFor = useRef(null)

  const reload = useCallback(async () => {
    const { data } = await deductionsModel.fetchDeductions()
    setDeductions(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!session) {
      setDeductions([])
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

  async function addDeduction(periodKey, amount, reason, deductDate) {
    const { error } = await deductionsModel.insertDeduction({
      userId: session.user.id,
      periodKey,
      amount,
      reason,
      deductDate,
    })
    if (error) return error.message
    await reload()
    return null
  }

  async function deleteDeduction(id) {
    const { error } = await deductionsModel.deleteDeduction(id)
    if (error) onError?.(error.message)
    else setDeductions((prev) => prev.filter((d) => d.id !== id))
  }

  return { deductions, loading, reload, addDeduction, deleteDeduction }
}
