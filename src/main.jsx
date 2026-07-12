import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AuthProvider } from './auth/AuthProvider.jsx'
import { LanguageProvider } from './lib/i18n.jsx'
import { CurrencyProvider } from './lib/currency.jsx'
import './lib/theme.js' // áp dụng theme đã lưu trước khi render (tránh nháy)
import './lib/appearance.js' // áp dụng cỡ chữ đã lưu trước khi render
import './styles.css'
import './styles/themes.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      {/* ErrorBoundary trong LanguageProvider (để dịch được) nhưng bọc phần còn lại
          → lỗi render ở CurrencyProvider/AuthProvider/App đều bắt được, không trắng app. */}
      <ErrorBoundary>
        <CurrencyProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </CurrencyProvider>
      </ErrorBoundary>
    </LanguageProvider>
  </React.StrictMode>
)
