import { useCallback, useEffect, useState } from 'react'
import * as profileModel from '../models/profileModel.js'

// CONTROLLER: state + thao tác cho hồ sơ người dùng (profile) + nhắc đặt ngày nhận lương.
export function useProfile(session) {
  const [profile, setProfile] = useState(null)
  const [showPaydayPrompt, setShowPaydayPrompt] = useState(false)

  const reload = useCallback(async () => {
    if (!session) return
    const { data } = await profileModel.fetchProfile(session.user.id)
    setProfile(data ?? null)
    // Hỏi ngày nhận lương nếu chưa đặt và chưa từng bỏ qua trên máy này.
    const skipped = localStorage.getItem(`payday-skipped-${session.user.id}`)
    if (data && data.payday == null && !skipped) setShowPaydayPrompt(true)
  }, [session])

  useEffect(() => {
    if (session) reload()
    else setProfile(null)
  }, [session, reload])

  async function savePayday(day) {
    const { error } = await profileModel.updatePayday(session.user.id, day)
    if (error) return error.message
    await reload()
    return null
  }

  function skipPayday() {
    localStorage.setItem(`payday-skipped-${session.user.id}`, '1')
    setShowPaydayPrompt(false)
  }

  return { profile, reload, savePayday, showPaydayPrompt, setShowPaydayPrompt, skipPayday }
}
