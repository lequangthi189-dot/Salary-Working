// MODEL: truy cập bảng `profiles` (hồ sơ người dùng) qua Supabase.
import { supabase } from '../lib/supabase.js'

export function fetchProfile(userId) {
  return supabase
    .from('profiles')
    .select('payday, full_name, employee_code')
    .eq('id', userId)
    .maybeSingle()
}

// Dùng UPDATE (dòng profile đã được trigger tạo sẵn) — tránh lỗi RLS khi profiles
// không có insert policy.
export function updatePayday(userId, day) {
  return supabase.from('profiles').update({ payday: day }).eq('id', userId)
}
