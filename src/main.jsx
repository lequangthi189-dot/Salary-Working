import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthProvider.jsx'
import { LanguageProvider } from './lib/i18n.jsx'
import { CurrencyProvider } from './lib/currency.jsx'
import './styles.css'

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
