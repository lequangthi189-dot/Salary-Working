import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext({ session: null, loading: true })

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  // Khi người dùng bấm link "đặt lại mật khẩu" trong email, Supabase phát
  // sự kiện PASSWORD_RECOVERY → hiện form đổi mật khẩu thay vì app.
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(session)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const signOut = () => supabase.auth.signOut()
  const endRecovery = () => setRecovery(false)

  return (
    <AuthContext.Provider
      value={{ session, loading, signOut, recovery, endRecovery }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
