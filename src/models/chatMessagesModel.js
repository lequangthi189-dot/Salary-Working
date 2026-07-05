// MODEL: truy cập bảng `chat_messages` (bộ nhớ trợ lý lương) qua Supabase.
// QUYỀN RIÊNG TƯ: KHÔNG truyền user_id khi insert — cột có DEFAULT auth.uid() nên
// DB tự điền theo phiên đăng nhập; RLS chặn đọc/ghi chéo giữa các user.
import { supabase } from '../lib/supabase.js'

// Nạp `limit` tin GẦN NHẤT của user hiện tại (RLS lọc sẵn theo auth.uid()).
// Lấy mới→cũ rồi đảo lại để hiển thị cũ→mới. Chỉ lấy cột cần (không lộ user_id thừa).
export async function fetchRecentMessages(limit = 30) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return { data: null, error }
  return { data: (data || []).reverse(), error: null }
}

// Ghi 1 tin. role: 'user' | 'bot'. KHÔNG truyền user_id (default auth.uid()).
export function insertMessage(role, content) {
  return supabase.from('chat_messages').insert({ role, content })
}
