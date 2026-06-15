// Quản lý TÙY BIẾN GIAO DIỆN: hiện tại là CỠ CHỮ. Áp ngay lên <html> (data-font)
// TRƯỚC khi React render để không bị nháy. Lưu localStorage cho lần mở sau; App
// đồng bộ thêm theo tài khoản (profile) để mọi máy thấy đúng lựa chọn.
//   fontScale — 'sm' | 'md' | 'lg': đổi font-size gốc → mọi cỡ chữ (rem) co giãn theo.

export const FONT_SCALES = ['sm', 'md', 'lg']

const FONT_KEY = 'app-font'
let currentFont = 'md'

export function getFontScale() {
  return currentFont
}

function readAllowed(key, allow, fallback) {
  try {
    const v = localStorage.getItem(key)
    if (allow.includes(v)) return v
  } catch {
    /* ignore */
  }
  return fallback
}

export function setFontScale(scale) {
  if (!FONT_SCALES.includes(scale)) return
  currentFont = scale
  document.documentElement.setAttribute('data-font', scale)
  try {
    localStorage.setItem(FONT_KEY, scale)
  } catch {
    /* ignore */
  }
}

// Áp ngay lúc import (trước render) để tránh nháy giao diện.
setFontScale(readAllowed(FONT_KEY, FONT_SCALES, 'md'))
