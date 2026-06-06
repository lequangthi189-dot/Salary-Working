// MODEL: truy cập bảng `shifts` qua Supabase. Không chứa logic UI/nghiệp vụ —
// chỉ đọc/ghi dữ liệu. Trả về nguyên kết quả Supabase ({ data, error }).
import { supabase } from '../lib/supabase.js'

export function fetchShifts() {
  return supabase
    .from('shifts')
    .select('*')
    .order('work_date', { ascending: false })
    .order('created_at', { ascending: false })
}

export function insertShift(shift, userId) {
  return supabase.from('shifts').insert({ ...shift, user_id: userId })
}

export function updateShift(id, fields) {
  return supabase.from('shifts').update(fields).eq('id', id)
}

export function deleteShift(id) {
  return supabase.from('shifts').delete().eq('id', id)
}
