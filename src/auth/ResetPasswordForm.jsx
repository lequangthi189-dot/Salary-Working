import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useI18n } from '../lib/i18n.jsx'
import LangToggle from '../components/LangToggle.jsx'

// Hiện sau khi người dùng mở link đặt lại mật khẩu từ email (PASSWORD_RECOVERY).
// Lúc này đã có một session tạm; chỉ cần đặt mật khẩu mới.
export default function ResetPasswordForm({ onDone }) {
  const { t } = useI18n()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage(null)
    if (password !== confirm) {
      setMessage({ type: 'error', text: t('auth.pwMismatch') })
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'info', text: t('reset.done') })
      onDone()
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-lang">
        <LangToggle />
      </div>
      <h1>{t('reset.title')}</h1>
      <p className="subtitle">{t('reset.subtitle')}</p>

      <form onSubmit={handleSubmit}>
        <label>
          {t('reset.newPassword')}
          <div className="pw-wrap">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? t('common.hide') : t('common.show')}
            >
              {showPw ? t('common.hide') : t('common.show')}
            </button>
          </div>
        </label>
        <label>
          {t('reset.confirmNew')}
          <div className="pw-wrap">
            <input
              type={showPw ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? t('common.hide') : t('common.show')}
            >
              {showPw ? t('common.hide') : t('common.show')}
            </button>
          </div>
        </label>

        <button type="submit" disabled={busy}>
          {busy ? '…' : t('reset.submit')}
        </button>
      </form>

      {message && <p className={`msg ${message.type}`}>{message.text}</p>}
    </div>
  )
}
