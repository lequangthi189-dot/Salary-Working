import { useI18n, LANGS } from '../lib/i18n.jsx'
import { nextIn } from '../lib/cycle.js'
import { FLAGS } from './LangToggle.jsx'
import './ThemeToggle.css'

// Nút gạt 1 núc XOAY VÒNG ngôn ngữ (vi ↔ en) — cùng hình thức với nút phong cách
// (.theme-cycle). Hiện cờ + tên ngôn ngữ; bấm để chuyển sang ngôn ngữ kế tiếp.
// onChange (App truyền changeLang) lo đổi tại chỗ + lưu theo tài khoản.
const NAMES = {
  vi: 'Tiếng Việt',
  en: 'English (UK)',
  us: 'English (US)',
  au: 'English (AU)',
}

export default function LangCycle({ onChange, className = '' }) {
  const { t, lang, setLang } = useI18n()
  const pick = onChange || setLang

  function cycle() {
    pick(nextIn(LANGS, lang))
  }

  const Flag = FLAGS[lang] || FLAGS.en
  const name = NAMES[lang] || lang
  return (
    <button
      type="button"
      className={`theme-cycle ${className}`.trim()}
      onClick={cycle}
      title={`${t('nav.language')}: ${name} · Alt+L`}
      aria-label={`${t('nav.language')}: ${name}`}
    >
      <Flag />
      <span className="theme-cycle__name">{name}</span>
    </button>
  )
}
