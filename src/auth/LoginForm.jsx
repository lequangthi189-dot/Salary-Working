import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function LoginForm() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)

    const fn =
      mode === 'signin'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password })

    const { error } = await fn
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else if (mode === 'signup') {
      setMessage({
        type: 'info',
        text: 'Account created. If email confirmation is on, check your inbox; otherwise sign in.',
      })
    }
    setBusy(false)
  }

  return (
    <div className="auth-card">
      <h1>Salary Working</h1>
      <p className="subtitle">
        {mode === 'signin' ? 'Sign in to your timesheet' : 'Create an account'}
      </p>

      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
        </label>

        <button type="submit" disabled={busy}>
          {busy ? '…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </button>
      </form>

      {message && <p className={`msg ${message.type}`}>{message.text}</p>}

      <button
        type="button"
        className="link"
        onClick={() => {
          setMode(mode === 'signin' ? 'signup' : 'signin')
          setMessage(null)
        }}
      >
        {mode === 'signin'
          ? "Don't have an account? Sign up"
          : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}
