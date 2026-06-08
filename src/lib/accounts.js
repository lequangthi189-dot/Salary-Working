// Sổ tài khoản đã đăng nhập trên máy này (để chuyển nhanh không cần mật khẩu).
// Lưu refresh_token của từng tài khoản trong localStorage.
// LƯU Ý BẢO MẬT: refresh_token nằm ở localStorage — chỉ dùng trên máy tin cậy.
const KEY = 'sw-accounts'

export function listAccounts() {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(a) ? a : []
  } catch {
    return []
  }
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

// Thêm/cập nhật một tài khoản (mới nhất lên đầu). Cần id + refresh_token.
export function upsertAccount(acc) {
  if (!acc || !acc.id || !acc.refresh_token) return
  const rest = listAccounts().filter((a) => a.id !== acc.id)
  save([{ ...acc }, ...rest])
}

export function removeAccount(id) {
  save(listAccounts().filter((a) => a.id !== id))
}
