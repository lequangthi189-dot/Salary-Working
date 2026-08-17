import React from 'react'

/* Country flags drawn as SVG, not emoji — Windows does not render flag emoji at
   all, and the product must show the same mark on every device. Geometry copied
   verbatim from src/components/LangToggle.jsx: VN, GB, US, AU (the Australian
   canton and Southern Cross are simplified to dots at this size, as upstream). */
const FlagVN = (
  <>
    <rect width="30" height="20" fill="#DA251D" />
    <path fill="#FFFF00" d="M15 4l1.76 5.42h5.7l-4.61 3.35 1.76 5.42L15 14.84l-4.61 3.35 1.76-5.42-4.61-3.35h5.7z" />
  </>
)
const FlagGB = (
  <>
    <path d="M0 0v30h60V0z" fill="#012169" />
    <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6" />
    <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
    <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" />
  </>
)
const US_H = 20 / 13
const FlagUS = (
  <>
    <rect width="38" height="20" fill="#B22234" />
    {[1, 3, 5, 7, 9, 11].map((i) => (
      <rect key={i} x="0" y={i * US_H} width="38" height={US_H} fill="#fff" />
    ))}
    <rect width="16" height={US_H * 7} fill="#3C3B6E" />
  </>
)
const FlagAU = (
  <>
    <rect width="60" height="30" fill="#012169" />
    <path d="M0 0L30 15M30 0L0 15" stroke="#fff" strokeWidth="3" />
    <path d="M15 0V15M0 7.5H30" stroke="#fff" strokeWidth="5" />
    <path d="M15 0V15M0 7.5H30" stroke="#C8102E" strokeWidth="3" />
    <circle cx="15" cy="23" r="3" fill="#fff" />
    <circle cx="45" cy="7" r="1.6" fill="#fff" />
    <circle cx="52" cy="14" r="1.6" fill="#fff" />
    <circle cx="45" cy="21" r="1.6" fill="#fff" />
    <circle cx="38" cy="14" r="1.6" fill="#fff" />
    <circle cx="46" cy="14" r="1" fill="#fff" />
  </>
)
const FLAG_ART = { vi: FlagVN, en: FlagGB, us: FlagUS, au: FlagAU }
const VIEWBOX = { vi: '0 0 30 20', en: '0 0 60 30', us: '0 0 38 20', au: '0 0 60 30' }
const LANG_NAMES = { vi: 'Tiếng Việt', en: 'English (UK)', us: 'English (US)', au: 'English (AU)' }
const LANG_CURRENCY = { vi: '₫', en: '£', us: '$', au: 'A$' }

export function Flag({ code = 'en', width = 20, style }) {
  const art = FLAG_ART[code] || FlagGB
  return (
    <svg
      viewBox={VIEWBOX[code] || VIEWBOX.en}
      width={width}
      aria-hidden="true"
      style={{ display: 'block', flex: 'none', height: 'auto', borderRadius: 2, border: '1px solid rgba(127,127,127,0.35)', ...style }}
    >
      {art}
    </svg>
  )
}

export const LANGUAGES = ['vi', 'en', 'us', 'au']
export { LANG_NAMES, LANG_CURRENCY }
