import { Component } from 'react'
import { getLang, translate } from '../lib/i18n.jsx'

// ErrorBoundary: bắt lỗi RENDER của cây con để app không trắng màn hình. Phải là
// class component (React chỉ hỗ trợ error boundary qua class). Không dùng hook được
// nên dịch qua translate(getLang(), …) ở cấp module thay vì useI18n. Đặt BÊN TRONG
// LanguageProvider (xem main.jsx) để getLang() có ngôn ngữ người dùng.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
    this.handleReload = this.handleReload.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Log NGUYÊN lỗi + component stack để chẩn đoán (không nuốt).
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  handleReload() {
    window.location.reload()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const t = (k) => translate(getLang(), k)
    return (
      <div className="center">
        <div className="modal-card" role="alert">
          <div className="modal-head">
            <h2>⚠️ {t('error.title')}</h2>
          </div>
          <p className="muted">{t('error.body')}</p>
          {import.meta.env.DEV && (
            <pre
              style={{
                maxHeight: '9rem',
                overflow: 'auto',
                fontSize: '0.75rem',
                whiteSpace: 'pre-wrap',
                opacity: 0.75,
              }}
            >
              {String(error?.stack || error?.message || error)}
            </pre>
          )}
          <button
            type="button"
            className="btn-addshift"
            onClick={this.handleReload}
          >
            {t('error.reload')}
          </button>
        </div>
      </div>
    )
  }
}
