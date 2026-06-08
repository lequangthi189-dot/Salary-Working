import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useI18n } from '../lib/i18n.jsx'

// Popup riêng để đổi mật khẩu: mật khẩu hiện tại + mật khẩu mới + xác nhận.
export default function ChangePasswordModal({ user, onClose }) {
  const { t } = useI18n()
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage(null)
    if (password !== confirm) {
      setMessage({ type: 'error', text: t('auth.pwMismatch') })
      return
    }
    if (password === current) {
      setMessage({ type: 'error', text: t('changePw.mustDiffer') })
      return
    }
    setBusy(true)

    // Xác minh mật khẩu hiện tại bằng cách đăng nhập lại ngầm.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    })
    if (verifyError) {
      setBusy(false)
      setMessage({ type: 'error', text: t('changePw.currentWrong') })
      return
    }

    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'info', text: t('changePw.success') })
      setCurrent('')
      setPassword('')
      setConfirm('')
    }
  }

  const toggle = (
    <button
      type="button"
      className="pw-toggle"
      onClick={() => setShowPw((v) => !v)}
      aria-label={showPw ? t('common.hide') : t('common.show')}
    >
      {showPw ? t('common.hide') : t('common.show')}
    </button>
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{t('changePw.title')}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>

        <form className="change-pw" onSubmit={handleSubmit}>
          <label>
            {t('changePw.current')}
            <div className="pw-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                autoComplete="current-password"
              />
              {toggle}
            </div>
          </label>
          <label>
            {t('changePw.new')}
            <div className="pw-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
              {toggle}
            </div>
          </label>
          <label>
            {t('changePw.confirm')}
            <div className="pw-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
              {toggle}
            </div>
          </label>

          <div className="change-pw-actions">
            <button type="submit" disabled={busy}>
              {busy ? '…' : t('changePw.save')}
            </button>
            <button type="button" className="link" onClick={onClose}>
              {t('common.cancel')}
            </button>
          </div>
        </form>

        {message && <p className={`msg ${message.type}`}>{message.text}</p>}
      </div>
    </div>
  )
}
