import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './auth/AuthProvider.jsx'
import LoginForm from './auth/LoginForm.jsx'
import ResetPasswordForm from './auth/ResetPasswordForm.jsx'
import ShiftForm from './components/ShiftForm.jsx'
import Timesheet from './components/Timesheet.jsx'
import ProfileModal from './components/ProfileModal.jsx'
import PayPeriodPanel from './components/PayPeriodPanel.jsx'
import DeductionsCard from './components/DeductionsCard.jsx'
import ScheduleImportModal from './components/ScheduleImportModal.jsx'
import PaydayPrompt from './components/PaydayPrompt.jsx'
import SalaryReminderModal from './components/SalaryReminderModal.jsx'
import { supabase } from './lib/supabase.js'
import {
  shiftTotals,
  computeEffective,
  formatHours,
  MAX_HOURS_PER_DAY,
} from './lib/shiftMath.js'
import {
  payPeriodKeyOf,
  isPeriodEnded,
  paymentWindow,
  localTodayStr,
} from './lib/payPeriod.js'

const pad2 = (n) => String(n).padStart(2, '0')

// Thống kê cho board: tổng giờ/lương kỳ hiện tại + tiền nếu đúng giờ & tiền đã mất
// + số ca ngày/đêm (ca đêm = giờ đêm > giờ ngày).
function boardStats(periodShifts) {
  const t = shiftTotals(periodShifts)
  let lostPay = 0
  let dayShiftCount = 0
  let nightShiftCount = 0
  for (const s of periodShifts) {
    const r = computeEffective(
      s.scheduled_start || '',
      s.scheduled_end || '',
      s.start_time,
      s.end_time
    )
    lostPay += r.lostPay
    if (r.nightHours > r.dayHours) nightShiftCount++
    else dayShiftCount++
  }
  return {
    hours: t.hours,
    dayHours: t.dayHours,
    nightHours: t.nightHours,
    pay: t.pay,
    lostPay,
    idealPay: t.pay + lostPay,
    dayShiftCount,
    nightShiftCount,
  }
}

// Kỳ lương ĐÃ KẾT THÚC, gần nhất mà CHƯA được đánh dấu đã nhận (kỳ đang chờ nhận).
function pendingPeriodKey(shifts, payrolls) {
  const received = new Set((payrolls || []).map((p) => p.period_key))
  const keys = [...new Set(shifts.map((s) => payPeriodKeyOf(s.work_date)))]
  return (
    keys
      .filter((k) => isPeriodEnded(k) && !received.has(k))
      .sort()
      .pop() || null
  )
}

// Tổng giờ của một ca từ thời gian thô (chưa lưu).
function shiftHours(s) {
  return computeEffective(
    s.scheduled_start || '',
    s.scheduled_end || '',
    s.start_time,
    s.end_time
  ).decimalHours
}

// Kiểm tra giới hạn 8 giờ/ngày. Trả về chuỗi lỗi nếu vượt, ngược lại null.
// excludeId: bỏ qua ca đang sửa khi cộng dồn.
function dayLimitError(shifts, workDate, newHours, excludeId = null) {
  const existing = shiftTotals(
    shifts.filter((s) => s.work_date === workDate && s.id !== excludeId)
  ).hours
  const total = existing + newHours
  if (total > MAX_HOURS_PER_DAY + 1e-9) {
    return `Vượt giới hạn ${MAX_HOURS_PER_DAY} giờ/ngày: ngày ${workDate} sẽ thành ${formatHours(
      total
    )}h (đã có ${formatHours(existing)}h). Hãy giảm giờ lại.`
  }
  return null
}

export default function App() {
  const { session, loading, signOut, recovery, endRecovery } = useAuth()
  const [shifts, setShifts] = useState([])
  const [payrolls, setPayrolls] = useState([])
  const [deductions, setDeductions] = useState([])
  const [profile, setProfile] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showPaydayPrompt, setShowPaydayPrompt] = useState(false)
  const [showSalary, setShowSalary] = useState(false)
  const [showImport, setShowImport] = useState(false)
  // Đã bỏ qua nhắc nhận lương trong phiên này (reset khi reload → hỏi lại).
  const [reminderDismissed, setReminderDismissed] = useState(false)

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

  const loadPayrolls = useCallback(async () => {
    const { data } = await supabase.from('payrolls').select('*')
    setPayrolls(data ?? [])
  }, [])

  const loadDeductions = useCallback(async () => {
    const { data } = await supabase
      .from('deductions')
      .select('*')
      .order('created_at', { ascending: true })
    setDeductions(data ?? [])
  }, [])

  const loadProfile = useCallback(async () => {
    if (!session) return
    const { data } = await supabase
      .from('profiles')
      .select('payday, full_name, employee_code')
      .eq('id', session.user.id)
      .maybeSingle()
    setProfile(data ?? null)
    // Hỏi ngày nhận lương nếu chưa đặt và chưa từng bỏ qua trên máy này.
    const skipped = localStorage.getItem(`payday-skipped-${session.user.id}`)
    if (data && data.payday == null && !skipped) setShowPaydayPrompt(true)
  }, [session])

  useEffect(() => {
    if (session) {
      loadShifts()
      loadPayrolls()
      loadDeductions()
      loadProfile()
    } else {
      setShifts([])
      setPayrolls([])
      setDeductions([])
      setProfile(null)
    }
  }, [session, loadShifts, loadPayrolls, loadDeductions, loadProfile])

  async function handleAdd(shift) {
    const limitErr = dayLimitError(shifts, shift.work_date, shiftHours(shift))
    if (limitErr) return limitErr
    const { error } = await supabase
      .from('shifts')
      .insert({ ...shift, user_id: session.user.id })
    if (error) return error.message
    await loadShifts()
    return null
  }

  async function handleUpdate(id, fields) {
    const limitErr = dayLimitError(
      shifts,
      fields.work_date,
      shiftHours(fields),
      id
    )
    if (limitErr) return limitErr
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

  async function savePayday(day) {
    // Dùng UPDATE (dòng profile đã được trigger tạo sẵn) — chỉ cần update policy,
    // tránh lỗi RLS khi profiles không có insert policy.
    const { error } = await supabase
      .from('profiles')
      .update({ payday: day })
      .eq('id', session.user.id)
    if (error) return error.message
    await loadProfile()
    return null
  }

  function skipPayday() {
    localStorage.setItem(`payday-skipped-${session.user.id}`, '1')
    setShowPaydayPrompt(false)
  }

  async function markReceived(periodKey, receivedOn) {
    const { error } = await supabase
      .from('payrolls')
      .upsert(
        { user_id: session.user.id, period_key: periodKey, received_on: receivedOn },
        { onConflict: 'user_id,period_key' }
      )
    if (error) setLoadError(error.message)
    await loadPayrolls()
  }

  async function unmarkReceived(periodKey) {
    const { error } = await supabase
      .from('payrolls')
      .delete()
      .eq('user_id', session.user.id)
      .eq('period_key', periodKey)
    if (error) setLoadError(error.message)
    await loadPayrolls()
  }

  async function addDeduction(periodKey, amount, reason, deductDate) {
    const { error } = await supabase.from('deductions').insert({
      user_id: session.user.id,
      period_key: periodKey,
      amount,
      reason,
      deduct_date: deductDate,
    })
    if (error) return error.message
    await loadDeductions()
    return null
  }

  async function deleteDeduction(id) {
    const { error } = await supabase.from('deductions').delete().eq('id', id)
    if (error) setLoadError(error.message)
    else setDeductions((prev) => prev.filter((d) => d.id !== id))
  }

  // Tạo nhiều ca cùng lúc từ lịch tuần đã đọc bằng AI. Trả về mảng lỗi (rỗng nếu OK).
  async function importWeekShifts(rows) {
    const errors = []
    for (const r of rows) {
      const shift = {
        work_date: r.date,
        start_time: r.start,
        end_time: r.end,
        scheduled_start: r.start,
        scheduled_end: r.end,
      }
      const limitErr = dayLimitError(shifts, r.date, shiftHours(shift))
      if (limitErr) {
        errors.push(`${r.date}: ${limitErr}`)
        continue
      }
      const { error } = await supabase
        .from('shifts')
        .insert({ ...shift, user_id: session.user.id })
      if (error) errors.push(`${r.date}: ${error.message}`)
    }
    await loadShifts()
    return errors
  }

  // Đánh dấu kỳ đang chờ nhận = đã nhận (ngày nhận = hôm nay).
  async function receiveSalary() {
    if (!pendingKey) return
    await markReceived(pendingKey, localTodayStr())
    setReminderDismissed(true)
  }

  if (loading) return <div className="center">Loading…</div>
  if (recovery)
    return (
      <div className="center">
        <ResetPasswordForm onDone={endRecovery} />
      </div>
    )
  if (!session)
    return (
      <div className="center">
        <LoginForm />
      </div>
    )

  const pendingKey = pendingPeriodKey(shifts, payrolls)

  // Ẩn các ca thuộc kỳ ĐÃ NHẬN lương khỏi UI dưới board (chúng đã chuyển sang
  // thanh bên "Kỳ lương"). Phần còn lại = kỳ hiện tại + kỳ chưa nhận.
  const receivedKeys = new Set((payrolls || []).map((p) => p.period_key))
  const visibleShifts = shifts.filter(
    (s) => !receivedKeys.has(payPeriodKeyOf(s.work_date))
  )

  // Thống kê tháng hiện tại (kỳ lương chứa hôm nay) cho board.
  const currentKey = payPeriodKeyOf(localTodayStr())
  const monthStats = boardStats(
    shifts.filter((s) => payPeriodKeyOf(s.work_date) === currentKey)
  )
  // Khoản trừ của kỳ hiện tại (cho card trên board).
  const currentDeductions = deductions.filter(
    (d) => d.period_key === currentKey
  )

  // Nhắc nhận lương: chỉ khi đã đặt ngày nhận (payday), có kỳ đang chờ nhận,
  // và hôm nay đã tới/qua ngày nhận trong tháng trả lương.
  let salaryDue = false
  if (pendingKey && profile?.payday) {
    const pw = paymentWindow(pendingKey)
    const dueDate = `${pw.year}-${pad2(pw.month)}-${pad2(profile.payday)}`
    salaryDue = localTodayStr() >= dueDate
  }
  const showReminder = salaryDue && !reminderDismissed && !showPaydayPrompt

  const fullName =
    profile?.full_name || session.user.user_metadata?.full_name || ''
  const employeeCode =
    profile?.employee_code || session.user.user_metadata?.employee_code || ''

  return (
    <div className="app">
      <header className="app-header">
        <h1>Salary Working</h1>
        <div className="user">
          <button
            type="button"
            className="account-btn"
            onClick={() => setShowImport(true)}
          >
            Nhập lịch tuần
          </button>
          <button
            type="button"
            className="account-btn"
            onClick={() => setShowSalary(true)}
          >
            Kỳ lương
          </button>
          <button
            type="button"
            className="account-btn"
            onClick={() => setShowProfile(true)}
          >
            Tài khoản
          </button>
        </div>
      </header>

      <main className="main-layout">
        <div className="main-col">
          <ShiftForm
            onAdd={handleAdd}
            monthStats={monthStats}
            onReceiveSalary={receiveSalary}
            receiveDisabled={!pendingKey}
            receiveDue={salaryDue}
          />
          {loadError && <p className="msg error">{loadError}</p>}
          <Timesheet
            shifts={visibleShifts}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />
        </div>

        <aside className="main-aside">
          <DeductionsCard
            periodKey={currentKey}
            deductions={currentDeductions}
            grossPay={monthStats.pay}
            onAdd={addDeduction}
            onDelete={deleteDeduction}
            defaultOpen
          />
        </aside>
      </main>

      {showSalary && (
        <div className="drawer-overlay" onClick={() => setShowSalary(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <h2>Kỳ lương</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowSalary(false)}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
            <PayPeriodPanel
              shifts={shifts}
              payrolls={payrolls}
              deductions={deductions}
              payday={profile?.payday}
              onMarkReceived={markReceived}
              onUnmark={unmarkReceived}
              onAddDeduction={addDeduction}
              onDeleteDeduction={deleteDeduction}
            />
          </aside>
        </div>
      )}

      {showImport && (
        <ScheduleImportModal
          defaultEmployeeCode={employeeCode}
          onImport={importWeekShifts}
          onClose={() => setShowImport(false)}
        />
      )}

      {showProfile && (
        <ProfileModal
          user={session.user}
          payday={profile?.payday}
          employeeCode={employeeCode}
          onSavePayday={savePayday}
          onClose={() => setShowProfile(false)}
          onSignOut={signOut}
        />
      )}

      {showPaydayPrompt && (
        <PaydayPrompt
          onSave={async (d) => {
            await savePayday(d)
            setShowPaydayPrompt(false)
          }}
          onSkip={skipPayday}
        />
      )}

      {showReminder && (
        <SalaryReminderModal
          fullName={fullName}
          periodKey={pendingKey}
          onReceived={receiveSalary}
          onNotYet={() => setReminderDismissed(true)}
        />
      )}
    </div>
  )
}
