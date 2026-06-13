import { useState } from 'react'
import { useI18n } from '../lib/i18n.jsx'
import { THEMES, getTheme, setTheme } from '../lib/theme.js'

// Dropdown chọn phong cách giao diện (dark / glass / neumorph). Tái dùng style
// dropdown của LangToggle (.lang-wrap/.lang-toggle/.lang-menu). up=true → mở lên.
export default function ThemeToggle({ up = false }) {
  const { t } = useI18n()
  const [theme, setThemeState] = useState(getTheme())
  const [open, setOpen] = useState(false)

  function pick(key) {
    setTheme(key)
    setThemeState(key)
    setOpen(false)
  }

  return (
    <div className="lang-wrap theme-wrap">
      <button
        type="button"
        className="lang-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        title={t('theme.label')}
      >
        <span className={`theme-swatch theme-swatch-${theme}`} />
        <span className="title-caret">▾</span>
      </button>
      {open && (
        <>
          <div className="dropdown-overlay" onClick={() => setOpen(false)} />
          <div className={`lang-menu${up ? ' up' : ''}`} role="menu">
            {THEMES.map((key) => (
              <button
                key={key}
                type="button"
                className={theme === key ? 'active' : ''}
                onClick={() => pick(key)}
              >
                <span className={`theme-swatch theme-swatch-${key}`} />
                {t(`theme.${key}`)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
