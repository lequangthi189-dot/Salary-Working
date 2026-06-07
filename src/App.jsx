import { useState, useEffect } from 'react'
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
import WelcomeGuide from './components/WelcomeGuide.jsx'
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
  sumDeductions,
} from './lib/payPeriod.js'

export default function App() {
  const { session, loading, signOut, recovery, endRecovery } = useAuth()
  const [showProfile, setShowProfile] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showDeductions, setShowDeductions] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [showTitleMenu, setShowTitleMenu] = useState(false)
  // Đã bỏ qua nhắc nhận lương trong phiên này (reset khi reload → hỏi lại).
  const [reminderDismissed, setReminderDismissed] = useState(false)

  // Người mới: tự hiện hướng dẫn lần đầu (lưu "đã xem" theo user trên máy này).
  useEffect(() => {
    if (session && !localStorage.getItem(`welcome-seen-${session.user.id}`)) {
      setShowWelcome(true)
    }
  }, [session])

  function closeWelcome() {
    if (session) localStorage.setItem(`welcome-seen-${session.user.id}`, '1')
    setShowWelcome(false)
  }

  // Mở một mục từ sidebar rồi đóng sidebar lại.
  function openFromSidebar(setter) {
    setShowSidebar(false)
    setter(true)
  }

  // Mở một mục từ dropdown tiêu đề rồi đóng dropdown lại.
  function openFromTitle(setter) {
    setShowTitleMenu(false)
    setter(true)
  }

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
  const currentDeductionTotal = sumDeductions(currentDeductions)
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
        <div className="header-left">
          <button
            type="button"
            className="menu-toggle"
            onClick={() => setShowSidebar(true)}
            aria-label="Mở menu"
          >
            <img className="app-logo" src="/logo.svg" alt="Salary Working logo" />
          </button>
          <div className="title-menu">
            <button
              type="button"
              className="title-btn"
              onClick={() => setShowTitleMenu((o) => !o)}
              aria-expanded={showTitleMenu}
              aria-haspopup="true"
            >
              <h1>Salary Working</h1>
              <span className="title-caret">▾</span>
            </button>
            {showTitleMenu && (
              <>
                <div
                  className="dropdown-overlay"
                  onClick={() => setShowTitleMenu(false)}
                />
                <div className="dropdown-menu" role="menu">
                  <button
                    type="button"
                    onClick={() => openFromTitle(setShowDeductions)}
                  >
                    Tiền bồi thường
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          className="account-btn header-import"
          onClick={() => setShowImport(true)}
        >
          Nhập lịch tuần
        </button>
      </header>

      {showSidebar && (
        <div className="sidebar-overlay" onClick={() => setShowSidebar(false)}>
          <aside className="sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="sidebar-head">
              <span className="sidebar-title">Kỳ lương</span>
              <button
                type="button"
                className="sidebar-close"
                onClick={() => setShowSidebar(false)}
                aria-label="Đóng menu"
              >
                ×
              </button>
            </div>
            <div className="sidebar-scroll">
              <PayPeriodPage
                shifts={shifts}
                payrolls={payrolls}
                deductions={deductions}
                payday={profile?.payday}
                onMarkReceived={markReceived}
                onUnmark={unmarkReceived}
                onAddDeduction={addDeduction}
                onDeleteDeduction={deleteDeduction}
              />
            </div>
            <div className="sidebar-footer">
              <button type="button" onClick={() => openFromSidebar(setShowProfile)}>
                Tài khoản
              </button>
              <button type="button" onClick={() => openFromSidebar(setShowWelcome)}>
                Hướng dẫn
              </button>
            </div>
          </aside>
        </div>
      )}

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
          <MonthStats stats={monthStats} deductionTotal={currentDeductionTotal} />
        </div>
        {loadError && <p className="msg error">{loadError}</p>}
        <Timesheet
          shifts={visibleShifts}
          onDelete={deleteShift}
          onUpdate={updateShift}
        />
      </main>

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

      {showWelcome && <WelcomeGuide onClose={closeWelcome} />}

      {showPaydayPrompt && !showWelcome && (
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
