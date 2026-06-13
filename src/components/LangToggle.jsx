import { useState } from 'react'
import { useI18n } from '../lib/i18n.jsx'

// Cờ SVG (Windows không render được emoji cờ nên vẽ trực tiếp).
function FlagVN() {
  return (
    <svg className="flag" viewBox="0 0 30 20" aria-hidden="true">
      <rect width="30" height="20" fill="#DA251D" />
      <path
        fill="#FFFF00"
        d="M15 4l1.76 5.42h5.7l-4.61 3.35 1.76 5.42L15 14.84l-4.61 3.35 1.76-5.42-4.61-3.35h5.7z"
      />
    </svg>
  )
}

function FlagGB() {
  return (
    <svg className="flag" viewBox="0 0 60 30" aria-hidden="true">
      <clipPath id="gb-clip">
        <path d="M0 0v30h60V0z" />
      </clipPath>
      <g clipPath="url(#gb-clip)">
        <path d="M0 0v30h60V0z" fill="#012169" />
        <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6" />
        <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
        <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  )
}

function FlagUS() {
  const h = 20 / 13
  const stripes = [1, 3, 5, 7, 9, 11].map((i) => (
    <rect key={i} x="0" y={i * h} width="38" height={h} fill="#fff" />
  ))
  return (
    <svg className="flag" viewBox="0 0 38 20" aria-hidden="true">
      <rect width="38" height="20" fill="#B22234" />
      {stripes}
      <rect width="16" height={h * 7} fill="#3C3B6E" />
    </svg>
  )
}

function FlagAU() {
  return (
    <svg className="flag" viewBox="0 0 60 30" aria-hidden="true">
      <rect width="60" height="30" fill="#012169" />
      {/* Canton: Union Jack thu nhỏ (góc trên trái) */}
      <g>
        <path d="M0 0L30 15M30 0L0 15" stroke="#fff" strokeWidth="3" />
        <path d="M15 0V15M0 7.5H30" stroke="#fff" strokeWidth="5" />
        <path d="M15 0V15M0 7.5H30" stroke="#C8102E" strokeWidth="3" />
      </g>
      {/* Sao Liên bang + chòm Nam Thập Tự (đơn giản hoá bằng chấm trắng) */}
      <circle cx="15" cy="23" r="3" fill="#fff" />
      <circle cx="45" cy="7" r="1.6" fill="#fff" />
      <circle cx="52" cy="14" r="1.6" fill="#fff" />
      <circle cx="45" cy="21" r="1.6" fill="#fff" />
      <circle cx="38" cy="14" r="1.6" fill="#fff" />
      <circle cx="46" cy="14" r="1" fill="#fff" />
    </svg>
  )
}

// Export để các nơi khác (vd menu Ngôn ngữ trong NavBar) tái dùng đúng bộ cờ.
export const FLAGS = { vi: FlagVN, en: FlagGB, us: FlagUS, au: FlagAU }
const NAMES = {
  vi: 'Tiếng Việt',
  en: 'English (UK)',
  us: 'English (US)',
  au: 'English (AU)',
}
const ORDER = ['vi', 'en', 'us', 'au']

// Dropdown chọn ngôn ngữ: VI (₫) · English-UK (£) · English-US ($).
// up=true → menu mở LÊN trên (dùng ở đáy sidebar).
export default function LangToggle({ className = '', up = false, onPick }) {
  const { lang, setLang } = useI18n()
  const [open, setOpen] = useState(false)
  const Cur = FLAGS[lang] || FlagGB
  // Khi đã đăng nhập, cha truyền onPick để lưu ngôn ngữ vào hồ sơ; nếu không thì
  // chỉ đổi ngôn ngữ tại chỗ (vẫn lưu localStorage trong setLang).
  const pick = onPick || setLang

  return (
    <div className={`lang-wrap ${className}`.trim()}>
      <button
        type="button"
        className="lang-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Cur />
        <span className="title-caret">▾</span>
      </button>
      {open && (
        <>
          <div className="dropdown-overlay" onClick={() => setOpen(false)} />
          <div className={`lang-menu${up ? ' up' : ''}`} role="menu">
            {ORDER.map((code) => {
              const F = FLAGS[code]
              return (
                <button
                  key={code}
                  type="button"
                  className={lang === code ? 'active' : ''}
                  onClick={() => {
                    pick(code)
                    setOpen(false)
                  }}
                >
                  <F />
                  {NAMES[code]}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
