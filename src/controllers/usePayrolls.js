import { useCallback, useEffect, useState } from 'react'
import * as payrollsModel from '../models/payrollsModel.js'

// CONTROLLER: state + thao tác cho kỳ lương đã nhận (payrolls).
export function usePayrolls(session, onError) {
  const [payrolls, setPayrolls] = useState([])

  const reload = useCallback(async () => {
    const { data } = await payrollsModel.fetchPayrolls()
    setPayrolls(data ?? [])
  }, [])

  useEffect(() => {
    if (session) reload()
    else setPayrolls([])
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

  return { payrolls, markReceived, unmarkReceived }
}
