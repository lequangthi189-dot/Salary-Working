// MODEL: truy cập bảng `profiles` (hồ sơ người dùng) qua Supabase.
import { supabase } from '../lib/supabase.js'

// Lấy '*' cho BỀN: nếu DB chưa có cột mới (chưa chạy migration) thì chỉ thiếu cột
// đó (dùng mặc định ở client) thay vì lỗi cả SELECT làm "mất" hồ sơ.
export function fetchProfile(userId) {
  return supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
}

// Dùng UPDATE (dòng profile đã được trigger tạo sẵn) — tránh lỗi RLS khi profiles
// không có insert policy.
export function updatePayday(userId, day) {
  return supabase.from('profiles').update({ payday: day }).eq('id', userId)
}

// Cập nhật một phần hồ sơ (chỉnh từng trường). fields = { cột: giá trị }.
export function updateProfileFields(userId, fields) {
  return supabase.from('profiles').update(fields).eq('id', userId)
}

// Lưu thông tin nhân viên: họ/tên, mã NV, lương 1 giờ + các phụ cấp (%).
export function updateEmployeeInfo(userId, info) {
  return supabase
    .from('profiles')
    .update({
      first_name: info.firstName,
      last_name: info.lastName,
      full_name: `${info.lastName} ${info.firstName}`.trim(),
      employee_code: info.employeeCode,
      hourly_rate: info.hourlyRate,
      night_pct: info.nightPct,
      holiday_day_pct: info.holidayDayPct,
      holiday_night_pct: info.holidayNightPct,
      has_night_shift: info.hasNightShift,
      period_start_day: info.periodStartDay,
      period_end_day: info.periodEndDay,
    })
    .eq('id', userId)
}
