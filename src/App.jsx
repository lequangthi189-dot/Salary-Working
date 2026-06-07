import { useState } from 'react'
import { useAuth } from './auth/AuthProvider.jsx'
import LoginForm from './auth/LoginForm.jsx'
import ResetPasswordForm from './auth/ResetPasswordForm.jsx'
import ShiftForm from './components/ShiftForm.jsx'
import MonthStats from './components/MonthStats.jsx'
import Timesheet from './components/Timesheet.jsx'
import ProfileModal from './components/ProfileModal.jsx'
import PayPeriodPage from './components/PayPeriodPage.jsx'
import DeductionsCard from './components/DeductionsCard.jsx'
import ScheduleImportModal from './components/ScheduleImportModal.jsx'
import PaydayPrompt from './components/PaydayPrompt.jsx'
import SalaryReminderModal from './components/SalaryReminderModal.jsx'
import { useShifts } from './controllers/useShifts.js'
import { usePayrolls } from './controllers/usePayrolls.js'
import { useDeductions } from './controllers/useDeductions.js'
import { useProfile } from './controllers/useProfile.js'
import { periodStats } from './lib/shiftMath.js'
import {
  pendingPeriodKey,
  visibleBoardShifts,
  buildSchedByDate,
  isSalaryDue,
} from './lib/shiftRules.js'
import {
  payPeriodKeyOf,
  payPeriodRange,
  paymentWindow,
  localTodayStr,
} from './lib/payPeriod.js'

export default function App() {
  const { session, loading, signOut, recovery, endRecovery } = useAuth()
  const [showProfile, setShowProfile] = useState(false)
  const [showSalary, setShowSalary] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showDeductions, setShowDeductions] = useState(false)
  // Đã bỏ qua nhắc nhận lương trong phiên này (reset khi reload → hỏi lại).
  const [reminderDismissed, setReminderDismissed] = useState(false)

  // Controllers (custom hooks): mỗi hook giữ state + thao tác của một loại dữ liệu.
  const {
    shifts,
    loadError,
    setLoadError,
    addShift,
    updateShift,
    deleteShift,
    importWeekShifts,
  } = useShifts(session)
  const { payrolls, markReceived, unmarkReceived } = usePayrolls(session, setLoadError)
  const { deductions, addDeduction, deleteDeduction } = useDeductions(
    session,
    setLoadError
  )
  const {
    profile,
    savePayday,
    showPaydayPrompt,
    setShowPaydayPrompt,
    skipPayday,
  } = useProfile(session)

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

  // ---- Dữ liệu suy ra cho View (ráp từ nhiều controller) ----
  const pendingKey = pendingPeriodKey(shifts, payrolls)
  const visibleShifts = visibleBoardShifts(shifts, payrolls)
  const currentKey = payPeriodKeyOf(localTodayStr())
  // Ngày sớm nhất được phép nhập công = đầu kỳ hiện tại (26 của tháng trước).
  const minWorkDate = payPeriodRange(currentKey).start
  const monthStats = periodStats(
    shifts.filter((s) => payPeriodKeyOf(s.work_date) === currentKey)
  )
  const currentDeductions = deductions.filter((d) => d.period_key === currentKey)
  const schedByDate = buildSchedByDate(shifts)
  const salaryDue = isSalaryDue(pendingKey, profile?.payday, paymentWindow)
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
            onClick={() => setShowDeductions(true)}
          >
            Tiền bồi thường
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

      <main className="main-col">
        {/* Khối chính: Nhập ca (trái 40%) + Thống kê (phải 60%); 1 cột trên mobile */}
        <div className="board-grid">
          <ShiftForm
            onAdd={addShift}
            minWorkDate={minWorkDate}
            schedByDate={schedByDate}
            onReceiveSalary={receiveSalary}
            receiveDisabled={!pendingKey}
            receiveDue={salaryDue}
          />
          <MonthStats stats={monthStats} />
        </div>
        {loadError && <p className="msg error">{loadError}</p>}
        <Timesheet
          shifts={visibleShifts}
          onDelete={deleteShift}
          onUpdate={updateShift}
        />
      </main>

      {showSalary && (
        <PayPeriodPage
          shifts={shifts}
          payrolls={payrolls}
          deductions={deductions}
          payday={profile?.payday}
          onMarkReceived={markReceived}
          onUnmark={unmarkReceived}
          onAddDeduction={addDeduction}
          onDeleteDeduction={deleteDeduction}
          onClose={() => setShowSalary(false)}
        />
      )}

      {showDeductions && (
        <div className="modal-overlay" onClick={() => setShowDeductions(false)}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h2>Tiền bồi thường</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowDeductions(false)}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
            <DeductionsCard
              periodKey={currentKey}
              deductions={currentDeductions}
              grossPay={monthStats.pay}
              onAdd={addDeduction}
              onDelete={deleteDeduction}
              embedded
            />
          </div>
        </div>
      )}

      {showImport && (
        <ScheduleImportModal
          employeeCode={employeeCode}
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
