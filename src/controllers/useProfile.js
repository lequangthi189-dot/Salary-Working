import { useCallback, useEffect, useState } from 'react'
import * as profileModel from '../models/profileModel.js'
import { setRates } from '../lib/rates.js'
import { setPayPeriod } from '../lib/payPeriod.js'

// Hồ sơ được coi là ĐÃ HOÀN TẤT khi có đủ thông tin nhân viên bắt buộc
// (họ, tên, mã NV, lương 1 giờ). Thiếu → app bắt điền form thông tin.
function isProfileComplete(p) {
  return !!(
    p &&
    p.first_name &&
    p.last_name &&
    Number.isFinite(Number(p.hourly_rate)) &&
    Number(p.hourly_rate) > 0
  )
}

// Nạp đơn giá theo hồ sơ vào module rates (dùng cho mọi phép tính lương).
function applyRates(p) {
  if (!p) return
  setRates({
    dayRate: p.hourly_rate,
    nightPct: p.night_pct,
    holidayDayPct: p.holiday_day_pct,
    holidayNightPct: p.holiday_night_pct,
    hasNightShift: p.has_night_shift !== false,
    nightStart: p.night_start,
    nightEnd: p.night_end,
  })
}

// Nạp kỳ lương (ngày bắt đầu/chốt) theo hồ sơ. Thiếu → mặc định 26/25.
function applyPeriod(p) {
  setPayPeriod({
    startDay: p?.period_start_day ?? 26,
    endDay: p?.period_end_day ?? 25,
  })
}

// CONTROLLER: state + thao tác cho hồ sơ người dùng (profile) + nhắc đặt ngày nhận lương.
export function useProfile(session) {
  const [profile, setProfile] = useState(null)
  const [showPaydayPrompt, setShowPaydayPrompt] = useState(false)
  // `loading` = true tới khi tải hồ sơ CỦA PHIÊN HIỆN TẠI xong (skeleton/gate chờ).
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState(null)

  // Đồng bộ trạng thái theo phiên NGAY TRONG RENDER (không đợi effect): ngay sau khi
  // đăng nhập, nếu chỉ bật `loading` trong effect thì render ĐẦU vẫn thấy loading còn
  // false (đặt từ lúc chưa đăng nhập) → App render app chính một nhịp trước khi kịp
  // chờ hồ sơ. Cập nhật state khi đổi user ngay ở render là mẫu React chuẩn (guard
  // bằng so sánh id) — loại bỏ khe hụt đó. Cũng xoá hồ sơ user cũ để không hiện nhầm
  // khi chuyển tài khoản.
  const uid = session?.user?.id ?? null
  const [trackedUid, setTrackedUid] = useState(null)
  if (uid !== trackedUid) {
    setTrackedUid(uid)
    setLoading(!!uid) // có phiên mới → đang tải; đăng xuất → hết tải
    setProfile(null)
    setProfileError(null)
    if (!uid) setShowPaydayPrompt(false)
  }

  const reload = useCallback(async () => {
    if (!session) return
    const { data, error } = await profileModel.fetchProfile(session.user.id)
    setProfileError(error ? error.message : null)
    setProfile(data ?? null)
    applyRates(data)
    applyPeriod(data)
    // Hỏi ngày nhận lương nếu chưa đặt và chưa từng bỏ qua trên máy này.
    const skipped = localStorage.getItem(`payday-skipped-${session.user.id}`)
    if (data && data.payday == null && !skipped) setShowPaydayPrompt(true)
    setLoading(false) // xong (kể cả lỗi) → thoát skeleton
  }, [session])

  useEffect(() => {
    if (session) reload()
  }, [session, reload])

  async function savePayday(day) {
    const { error } = await profileModel.updatePayday(session.user.id, day)
    if (error) return error.message
    await reload()
    return null
  }

  async function saveEmployeeInfo(info) {
    const { error } = await profileModel.updateEmployeeInfo(session.user.id, info)
    if (error) return error.message
    await reload()
    return null
  }

  // Lưu một/nhiều trường hồ sơ (chỉnh từng thông tin trong Tài khoản).
  async function saveProfileFields(fields) {
    const { error } = await profileModel.updateProfileFields(
      session.user.id,
      fields
    )
    if (error) return error.message
    await reload()
    return null
  }

  function skipPayday() {
    localStorage.setItem(`payday-skipped-${session.user.id}`, '1')
    setShowPaydayPrompt(false)
  }

  return {
    profile,
    loading,
    profileError,
    reload,
    savePayday,
    saveEmployeeInfo,
    saveProfileFields,
    profileComplete: isProfileComplete(profile),
    showPaydayPrompt,
    setShowPaydayPrompt,
    skipPayday,
  }
}
