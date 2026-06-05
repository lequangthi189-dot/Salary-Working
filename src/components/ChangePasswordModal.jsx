import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Popup riêng để đổi mật khẩu: mật khẩu hiện tại + mật khẩu mới + xác nhận.
export default function ChangePasswordModal({ user, onClose }) {
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
      setMessage({ type: 'error', text: 'Mật khẩu nhập lại không khớp.' })
      return
    }
    if (password === current) {
      setMessage({
        type: 'error',
        text: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
      })
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
      setMessage({ type: 'error', text: 'Mật khẩu hiện tại không đúng.' })
      return
    }

    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'info', text: 'Đã đổi mật khẩu thành công.' })
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
      aria-label={showPw ? 'Hide password' : 'Show password'}
    >
      {showPw ? 'Hide' : 'Show'}
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
          <h2>Đổi mật khẩu</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        <form className="change-pw" onSubmit={handleSubmit}>
          <label>
            Mật khẩu hiện tại
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
              {toggle}
            </div>
          </label>
          <label>
            Xác nhận mật khẩu mới
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
              {busy ? '…' : 'Lưu mật khẩu'}
            </button>
            <button type="button" className="link" onClick={onClose}>
              Hủy
            </button>
          </div>
        </form>

        {message && <p className={`msg ${message.type}`}>{message.text}</p>}
      </div>
    </div>
  )
}
