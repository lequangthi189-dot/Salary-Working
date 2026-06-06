// MODEL: truy cập bảng `deductions` (khoản bị trừ theo kỳ) qua Supabase.
import { supabase } from '../lib/supabase.js'

export function fetchDeductions() {
  return supabase
    .from('deductions')
    .select('*')
    .order('created_at', { ascending: true })
}

export function insertDeduction({ userId, periodKey, amount, reason, deductDate }) {
  return supabase.from('deductions').insert({
    user_id: userId,
    period_key: periodKey,
    amount,
    reason,
    deduct_date: deductDate,
  })
}

export function deleteDeduction(id) {
  return supabase.from('deductions').delete().eq('id', id)
}
