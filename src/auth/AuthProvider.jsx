import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { upsertAccount } from '../lib/accounts.js'

const AuthContext = createContext({ session: null, loading: true })

// Ghi nhớ phiên hiện tại vào sổ tài khoản (để chuyển nhanh sau này).
function rememberSession(session) {
  if (!session?.user || !session.refresh_token) return
  upsertAccount({
    id: session.user.id,
    email: session.user.email || '',
    name: session.user.user_metadata?.full_name || session.user.email || '',
    refresh_token: session.refresh_token,
  })
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  // Khi người dùng bấm link "đặt lại mật khẩu" trong email, Supabase phát
  // sự kiện PASSWORD_RECOVERY → hiện form đổi mật khẩu thay vì app.
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      rememberSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(session)
      // SIGNED_IN / TOKEN_REFRESHED → cập nhật refresh_token mới nhất vào sổ.
      rememberSession(session)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const signOut = () => supabase.auth.signOut()
  const endRecovery = () => setRecovery(false)

  // Chuyển sang tài khoản đã lưu (đổi phiên bằng refresh_token, không cần mật khẩu).
  async function switchAccount(refreshToken) {
    const { error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    })
    return error ? error.message : null
  }

  return (
    <AuthContext.Provider
      value={{ session, loading, signOut, recovery, endRecovery, switchAccount }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
