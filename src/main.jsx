import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthProvider.jsx'
import { LanguageProvider } from './lib/i18n.jsx'
import { CurrencyProvider } from './lib/currency.jsx'
import './lib/theme.js' // áp dụng theme đã lưu trước khi render (tránh nháy)
import './styles.css'
import './styles/themes.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <CurrencyProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </CurrencyProvider>
    </LanguageProvider>
  </React.StrictMode>
)
