import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
// Chấp nhận cả hai tên biến để tránh lỗi "Invalid value" khi deploy đặt sai tên.
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !anonKey) {
  // Surfaced in the console to make missing env config obvious during setup.
  console.error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY ' +
      '(trong .env.local khi chạy local, hoặc Environment Variables trên Vercel).'
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    // Lưu phiên đăng nhập vào localStorage để khi reload/đóng-mở lại web
    // người dùng vẫn đăng nhập và dữ liệu ca làm tự load lại từ Supabase.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'salaryworking-auth',
  },
})
