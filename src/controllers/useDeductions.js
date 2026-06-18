import { useCallback, useEffect, useState } from 'react'
import * as deductionsModel from '../models/deductionsModel.js'

// CONTROLLER: state + thao tác cho khoản bị trừ (deductions).
export function useDeductions(session, onError) {
  const [deductions, setDeductions] = useState([])

  const reload = useCallback(async () => {
    const { data } = await deductionsModel.fetchDeductions()
    setDeductions(data ?? [])
  }, [])

  useEffect(() => {
    if (session) reload()
    else setDeductions([])
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

  return { deductions, addDeduction, deleteDeduction }
}
