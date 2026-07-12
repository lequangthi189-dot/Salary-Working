// Upload ảnh đại diện lên Supabase Storage (bucket "avatars", công khai).
//
// Vì sao XHR chứ không dùng supabase.storage.from().upload(): SDK v2 KHÔNG bắn
// sự kiện tiến độ, nên không có % thật để chạy vòng tròn quanh avatar. XHR có
// `upload.onprogress` cho % THẬT (không đếm giả). Ta gọi thẳng REST endpoint của
// Storage với access token của phiên đăng nhập (RLS ở storage.objects lo phần
// "chỉ được ghi thư mục theo user_id của mình").
import { supabase, supabaseUrl } from './supabase.js'

// Chỉ nhận 3 định dạng ảnh này; tối đa 5MB.
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
export const ACCEPT_ATTR = ACCEPTED_TYPES.join(',')

// Đường dẫn CỐ ĐỊNH theo user → upsert cùng path = ghi đè, không rác Storage.
// Không đuôi file: mỗi user đúng 1 ảnh dù đổi jpg/png/webp; Content-Type set khi
// upload nên trình duyệt vẫn render đúng.
function avatarPath(userId) {
  return `${userId}/avatar`
}

// Validate Ở CLIENT trước khi upload. Trả về khoá lỗi i18n hoặc null nếu hợp lệ.
export function validateAvatarFile(file) {
  if (!file) return 'avatar.errNoFile'
  if (!ACCEPTED_TYPES.includes(file.type)) return 'avatar.errType'
  if (file.size > MAX_SIZE) return 'avatar.errSize'
  return null
}

// Dung lượng đọc được: "1.2 MB" / "820 KB".
export function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

// image/jpeg → "JPEG"; fallback đuôi.
export function fileFormatLabel(file) {
  const t = (file?.type || '').split('/')[1]
  return t ? t.toUpperCase() : '—'
}

// Upload avatar với tiến độ THẬT.
//   file       — File đã validate.
//   userId     — id người dùng (quyết định thư mục ghi).
//   onProgress — (pct | null) => void. pct 0..100 khi biết tổng; null = không
//                đo được (indeterminate — component quay vòng thay vì %).
//   signal     — AbortSignal (tuỳ chọn) để Hủy giữa chừng.
// Trả về { url } (URL công khai + ?t= phá cache) khi xong; ném Error khi lỗi.
export async function uploadAvatar({ file, userId, onProgress, signal }) {
  // Lấy access token TƯƠI (SDK tự refresh) cho REST call.
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('no-session')

  const path = avatarPath(userId)
  const endpoint = `${supabaseUrl}/storage/v1/object/avatars/${path}`

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', endpoint, true)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('Content-Type', file.type)
    // Ghi đè file cũ cùng path (idempotent) + cache 1h ở CDN.
    xhr.setRequestHeader('x-upsert', 'true')
    xhr.setRequestHeader('cache-control', 'max-age=3600')

    xhr.upload.onprogress = (e) => {
      if (!onProgress) return
      // lengthComputable=false (hiếm) → báo null để component quay indeterminate,
      // KHÔNG bịa số.
      onProgress(e.lengthComputable ? Math.round((e.loaded / e.total) * 100) : null)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve()
      // Supabase Storage trả JSON lỗi trong body: { statusCode, error, message }.
      // ĐỪNG nuốt — parse ra + IN NGUYÊN để chốt nguyên nhân (thiếu policy? sai
      // bucket? sai path?). 403=thiếu policy, 404=sai bucket/path, 400=sai tham số.
      let body = xhr.responseText
      let parsed = null
      try {
        parsed = JSON.parse(body)
      } catch {
        // body không phải JSON → giữ nguyên text.
      }
      console.error('[avatar upload] LỖI Supabase Storage', {
        httpStatus: xhr.status,
        statusText: xhr.statusText,
        endpoint,
        path,
        bucket: 'avatars',
        contentType: file.type,
        responseBody: parsed || body,
      })
      const err = new Error(`upload-failed-${xhr.status}`)
      err.httpStatus = xhr.status
      err.storageError = parsed || body
      reject(err)
    }
    xhr.onerror = () => {
      // Mạng/CORS/quota — không có response HTTP nào để đọc.
      console.error('[avatar upload] LỖI mạng/CORS (không có response)', {
        endpoint,
        path,
        bucket: 'avatars',
      })
      reject(new Error('network'))
    }
    xhr.onabort = () => reject(new Error('aborted'))

    if (signal) {
      if (signal.aborted) {
        xhr.abort()
        return
      }
      signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }

    xhr.send(file)
  })

  // Bucket công khai → URL ổn định. Thêm ?t= để header/navbar/tài khoản nạp ảnh
  // MỚI ngay (URL cũ đã bị CDN/trình duyệt cache).
  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
  return { url: `${pub.publicUrl}?t=${Date.now()}` }
}
