// MODEL: truy cập bảng `payrolls` (kỳ lương đã nhận) qua Supabase.
import { supabase } from '../lib/supabase.js'

export function fetchPayrolls() {
  return supabase.from('payrolls').select('*')
}

export function upsertPayroll(userId, periodKey, receivedOn) {
  return supabase
    .from('payrolls')
    .upsert(
      { user_id: userId, period_key: periodKey, received_on: receivedOn },
      { onConflict: 'user_id,period_key' }
    )
}

export function deletePayroll(userId, periodKey) {
  return supabase
    .from('payrolls')
    .delete()
    .eq('user_id', userId)
    .eq('period_key', periodKey)
}
