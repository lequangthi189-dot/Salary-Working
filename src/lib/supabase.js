import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Surfaced in the console to make missing env config obvious during setup.
  console.error(
    'Missing Supabase env vars. Copy .env.example to .env.local and fill in your project values.'
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
