// MODEL: truy cập bảng `extra_income` (thu nhập việc ngoài) qua Supabase.
// Khoản tiền việc làm thêm KHÔNG cố định — tách hoàn toàn khỏi tính lương ca.
import { supabase } from '../lib/supabase.js'

export function fetchExtraIncome() {
  return supabase
    .from('extra_income')
    .select('*')
    .order('date', { ascending: false })
}

export function insertExtraIncome({ userId, date, description, amount }) {
  return supabase.from('extra_income').insert({
    user_id: userId,
    date,
    description,
    amount,
  })
}

// fields = { date?, description?, amount? }
export function updateExtraIncome(id, fields) {
  return supabase.from('extra_income').update(fields).eq('id', id)
}

export function deleteExtraIncome(id) {
  return supabase.from('extra_income').delete().eq('id', id)
}
