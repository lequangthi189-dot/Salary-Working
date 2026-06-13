// Quản lý PHONG CÁCH GIAO DIỆN (theme). Áp dụng qua thuộc tính data-theme trên
// <html>; CSS trong styles/themes.css hoán đổi biến màu + hiệu ứng bề mặt theo đó.
// Lưu localStorage để giữ lựa chọn cho lần mở sau.
//   dark     — Sleek Dark & Minimalist (mặc định, chính là giao diện hiện tại)
//   glass    — Modern Glassmorphism (kính mờ, trong suốt + blur)
//   neumorph — Soft UI / Neumorphism (nền sáng, bóng mềm nổi/chìm)
export const THEMES = ['dark', 'glass', 'neumorph']

const STORAGE_KEY = 'app-theme'
let currentTheme = 'dark'

export function getTheme() {
  return currentTheme
}

function initialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (THEMES.includes(saved)) return saved
  } catch {
    /* ignore */
  }
  return 'dark'
}

export function setTheme(theme) {
  if (!THEMES.includes(theme)) return
  currentTheme = theme
  document.documentElement.setAttribute('data-theme', theme)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* ignore */
  }
}

// Áp dụng ngay lúc import (trước khi React render) để không bị nháy theme.
setTheme(initialTheme())
