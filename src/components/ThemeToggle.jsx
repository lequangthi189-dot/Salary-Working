import { THEMES } from '../lib/theme.js'
import './ThemeToggle.css'

// Tên phong cách LUÔN hiển thị tiếng Anh (không đổi theo ngôn ngữ app).
const THEME_NAMES = { dark: 'Sleek Dark', glass: 'Glassmorphism', neumorph: 'Soft UI' }

// Nút gạt 1 núc XOAY VÒNG phong cách: bấm để chuyển sang theme kế tiếp theo vòng
// dark → glass → neumorph → dark. Controlled — App giữ `theme` (đồng bộ + lưu theo
// tài khoản), nút chỉ hiển thị ô màu preview + tên rồi gọi onChange(theme kế tiếp).
export default function ThemeToggle({ theme, onChange, className = '' }) {
  function cycle() {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]
    onChange(next)
  }

  const name = THEME_NAMES[theme] || theme
  return (
    <button
      type="button"
      className={`theme-cycle ${className}`.trim()}
      onClick={cycle}
      title="Theme"
      aria-label={`Theme: ${name}`}
    >
      <span className={`theme-swatch theme-swatch-${theme}`} />
      <span className="theme-cycle__name">{name}</span>
    </button>
  )
}
