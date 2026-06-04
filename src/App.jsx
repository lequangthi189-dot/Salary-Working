import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './auth/AuthProvider.jsx'
import LoginForm from './auth/LoginForm.jsx'
import ShiftForm from './components/ShiftForm.jsx'
import Timesheet from './components/Timesheet.jsx'
import { supabase } from './lib/supabase.js'

export default function App() {
  const { session, loading, signOut } = useAuth()
  const [shifts, setShifts] = useState([])
  const [loadError, setLoadError] = useState(null)

  const loadShifts = useCallback(async () => {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .order('work_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) setLoadError(error.message)
    else {
      setLoadError(null)
      setShifts(data ?? [])
    }
  }, [])

  useEffect(() => {
    if (session) loadShifts()
    else setShifts([])
  }, [session, loadShifts])

  async function handleAdd(shift) {
    const { error } = await supabase
      .from('shifts')
      .insert({ ...shift, user_id: session.user.id })
    if (error) return error.message
    await loadShifts()
    return null
  }

  async function handleUpdate(id, fields) {
    const { error } = await supabase.from('shifts').update(fields).eq('id', id)
    if (error) return error.message
    await loadShifts()
    return null
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('shifts').delete().eq('id', id)
    if (error) setLoadError(error.message)
    else setShifts((prev) => prev.filter((s) => s.id !== id))
  }

  if (loading) return <div className="center">Loading…</div>
  if (!session)
    return (
      <div className="center">
        <LoginForm />
      </div>
    )

  return (
    <div className="app">
      <header className="app-header">
        <h1>Salary Working</h1>
        <div className="user">
          <span>{session.user.email}</span>
          <button type="button" className="link" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <main>
        <ShiftForm onAdd={handleAdd} />
        {loadError && <p className="msg error">{loadError}</p>}
        <Timesheet
          shifts={shifts}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      </main>
    </div>
  )
}
