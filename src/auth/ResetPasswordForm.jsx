import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Hiện sau khi người dùng mở link đặt lại mật khẩu từ email (PASSWORD_RECOVERY).
// Lúc này đã có một session tạm; chỉ cần đặt mật khẩu mới.
export default function ResetPasswordForm({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage(null)
    if (password !== confirm) {
      setMessage({ type: 'error', text: 'Mật khẩu nhập lại không khớp.' })
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'info', text: 'Đã đổi mật khẩu. Đang vào app…' })
      onDone()
    }
  }

  return (
    <div className="auth-card">
      <h1>Đặt lại mật khẩu</h1>
      <p className="subtitle">Nhập mật khẩu mới cho tài khoản của bạn.</p>

      <form onSubmit={handleSubmit}>
        <label>
          Mật khẩu mới
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
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>
        <label>
          Nhập lại mật khẩu mới
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
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        <button type="submit" disabled={busy}>
          {busy ? '…' : 'Đổi mật khẩu'}
        </button>
      </form>

      {message && <p className={`msg ${message.type}`}>{message.text}</p>}
    </div>
  )
}
