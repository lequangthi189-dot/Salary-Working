// Tên GỌI từ họ-và-tên. Tiếng Việt: họ đứng TRƯỚC, tên gọi là CHỮ CUỐI CÙNG
// ("LÊ QUANG THI" → "Thi", "NGUYỄN TRẦN PHƯƠNG MAI" → "Mai"). Chuẩn hoá Title case
// (hoa chữ đầu, còn lại thường) để khỏi hét HOA. Rỗng/null → '' (để dùng câu chào chung).
export function firstNameOf(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return ''
  const last = parts[parts.length - 1]
  return last.charAt(0).toUpperCase() + last.slice(1).toLowerCase()
}
