import { createContext, useContext, useState, useCallback } from 'react'
import { translations } from './translations.js'

// Ngôn ngữ hiện tại ở cấp module — để các hàm thuần (lib) như payPeriodLabel,
// formatLost cũng dịch được mà không cần truyền lang qua từng lời gọi.
let currentLang = 'en'
export function getLang() {
  return currentLang
}

const STORAGE_KEY = 'app-lang'

function initialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (['vi', 'en'].includes(saved)) return saved
  } catch {
    /* ignore */
  }
  return 'en' // mặc định: Tiếng Anh
}

// translate(lang, key, vars) — tra cứu chuỗi theo key; thay {var} bằng giá trị.
export function translate(lang, key, vars) {
  const dict = translations[lang] || translations.en
  let s = dict[key]
  if (s == null) s = translations.en[key]
  if (s == null) s = key
  if (vars) {
    for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]))
  }
  return s
}

const I18nContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (k) => k,
})

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const l = initialLang()
    currentLang = l
    return l
  })

  const setLang = useCallback((l) => {
    currentLang = l
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* ignore */
    }
    setLangState(l)
  }, [])

  const t = useCallback((key, vars) => translate(lang, key, vars), [lang])

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
