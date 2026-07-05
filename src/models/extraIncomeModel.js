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

// fields = { date?, description?, amount?, received?, received_at? }
export function updateExtraIncome(id, fields) {
  return supabase.from('extra_income').update(fields).eq('id', id)
}

// Đặt trạng thái nhận cho NHIỀU khoản cùng lúc (1 query). receivedAt = ngày nhận
// (hôm nay) khi received=true, null khi bỏ nhận.
export function setReceivedMany(ids, received, receivedAt) {
  return supabase
    .from('extra_income')
    .update({ received, received_at: receivedAt })
    .in('id', ids)
}

export function deleteExtraIncome(id) {
  return supabase.from('extra_income').delete().eq('id', id)
}
