import { useState, useEffect } from 'react'
import { useAuth } from './auth/AuthProvider.jsx'
import LoginForm from './auth/LoginForm.jsx'
import ResetPasswordForm from './auth/ResetPasswordForm.jsx'
import ShiftForm from './components/ShiftForm.jsx'
import MonthStats from './components/MonthStats.jsx'
import Timesheet from './components/Timesheet.jsx'
import ProfileModal from './components/ProfileModal.jsx'
import PayPeriodPage from './components/PayPeriodPage.jsx'
import CompensationModal from './components/CompensationModal.jsx'
import ExtraIncomeModal from './components/ExtraIncomeModal.jsx'
import SalaryChat from './components/SalaryChat.jsx'
import ChatbotAvatar from './components/ChatbotAvatar.jsx'
import ScheduleImportModal from './components/ScheduleImportModal.jsx'
import PaydayPrompt from './components/PaydayPrompt.jsx'
import SalaryReminderModal from './components/SalaryReminderModal.jsx'
import WelcomeGuide from './components/WelcomeGuide.jsx'
import NavBar from './components/NavBar.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import ToolsSheet from './components/ToolsSheet.jsx'
import { FLAGS } from './components/LangToggle.jsx'
import EmployeeInfoForm from './components/EmployeeInfoForm.jsx'
import WhatsNewModal from './components/WhatsNewModal.jsx'
import Loader from './components/Loader.jsx'
import ReconcileModal from './components/ReconcileModal.jsx'
import { APP_VERSION, entriesSince } from './lib/changelog.js'
import { useI18n } from './lib/i18n.jsx'
import { useCurrency } from './lib/currency.jsx'
import { useShifts } from './controllers/useShifts.js'
import { usePayrolls } from './controllers/usePayrolls.js'
import { useDeductions } from './controllers/useDeductions.js'
import { useExtraIncome } from './controllers/useExtraIncome.js'
import { useProfile } from './controllers/useProfile.js'
import { periodStats } from './lib/shiftMath.js'
import { getDayRate, getNightRate } from './lib/rates.js'
import { THEMES, getTheme, setTheme } from './lib/theme.js'
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
  const { t, lang, setLang } = useI18n()
  const { updatedAt: fxUpdatedAt } = useCurrency()
  const { session, loading, signOut, recovery, endRecovery, switchAccount } =
    useAuth()
  const [addingAccount, setAddingAccount] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showReconcile, setShowReconcile] = useState(false)
  const [showDeductions, setShowDeductions] = useState(false)
  const [showExtraIncome, setShowExtraIncome] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [whatsNew, setWhatsNew] = useState(null) // mảng entries cần hiện, hoặc null
  const [showPayPeriod, setShowPayPeriod] = useState(false) // popup Kỳ lương
  const [showToolsSheet, setShowToolsSheet] = useState(false) // bottom sheet Công cụ
  const [theme, setThemeSt] = useState(getTheme()) // phong cách hiện tại (cho ThemeToggle)
  // Đã bỏ qua nhắc nhận lương trong phiên này (reset khi reload → hỏi lại).
  const [reminderDismissed, setReminderDismissed] = useState(false)

  // Người mới: tự hiện hướng dẫn lần đầu (lưu "đã xem" theo user trên máy này).
  // Người cũ: nếu có bản cập nhật mới (APP_VERSION khác bản đã xem) → hiện "Có cập nhật mới".
  useEffect(() => {
    if (!session) return
    const seenWelcome = localStorage.getItem(`welcome-seen-${session.user.id}`)
    if (!seenWelcome) {
      setShowWelcome(true)
      return
    }
    const seenVer = localStorage.getItem('whatsnew-version')
    if (seenVer !== APP_VERSION) {
      const entries = entriesSince(seenVer)
      if (entries.length) setWhatsNew(entries)
    }
  }, [session])

  // Đăng nhập xong tài khoản mới (đổi user) → tắt chế độ "thêm tài khoản".
  useEffect(() => {
    setAddingAccount(false)
  }, [session?.user?.id])

  function closeWelcome() {
    if (session) localStorage.setItem(`welcome-seen-${session.user.id}`, '1')
    // Người mới vừa xem hướng dẫn → coi như đã biết bản hiện tại, không hiện What's new.
    localStorage.setItem('whatsnew-version', APP_VERSION)
    setShowWelcome(false)
  }

  function closeWhatsNew() {
    localStorage.setItem('whatsnew-version', APP_VERSION)
    setWhatsNew(null)
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
    extraIncome,
    addExtraIncome,
    updateExtraIncome,
    deleteExtraIncome,
  } = useExtraIncome(session, setLoadError)
  const {
    profile,
    profileComplete,
    savePayday,
    saveEmployeeInfo,
    saveProfileFields,
    showPaydayPrompt,
    setShowPaydayPrompt,
    skipPayday,
  } = useProfile(session)

  // Khi hồ sơ nạp xong (đăng nhập), áp dụng ngôn ngữ đã lưu theo tài khoản. Nhờ
  // vậy đăng nhập lại (kể cả máy khác) giữ đúng ngôn ngữ người dùng đã chọn.
  useEffect(() => {
    const saved = profile?.lang
    if (saved && ['vi', 'en', 'us', 'au'].includes(saved) && saved !== lang) {
      setLang(saved)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.lang])

  // Đổi ngôn ngữ khi đã đăng nhập: đổi tại chỗ + lưu vào hồ sơ (để lần sau giữ).
  function changeLang(code) {
    setLang(code)
    if (profile) saveProfileFields({ lang: code })
  }

  // Khi hồ sơ nạp xong, áp dụng phong cách đã lưu theo tài khoản (giữ qua các máy).
  useEffect(() => {
    const saved = profile?.theme
    if (saved && THEMES.includes(saved) && saved !== theme) {
      setTheme(saved)
      setThemeSt(saved)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.theme])

  // Đổi phong cách: áp tại chỗ (setTheme lưu localStorage) + lưu theo tài khoản.
  function changeTheme(key) {
    setTheme(key)
    setThemeSt(key)
    if (profile) saveProfileFields({ theme: key })
  }

  // Đánh dấu kỳ đang chờ nhận = đã nhận (ngày nhận = hôm nay).
  async function receiveSalary() {
    if (!pendingKey) return
    await markReceived(pendingKey, localTodayStr())
    setReminderDismissed(true)
  }

  if (loading) return <Loader fullscreen label={t('common.loading')} />
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

  // Đang THÊM tài khoản: hiện màn đăng nhập dù vẫn còn phiên cũ (không đăng xuất,
  // để tài khoản cũ vẫn chuyển lại được). Đăng nhập xong → useEffect tắt cờ này.
  if (addingAccount)
    return (
      <div className="center">
        <LoginForm onCancel={() => setAddingAccount(false)} />
      </div>
    )

  // Bắt buộc điền thông tin nhân viên (họ/tên, mã NV, lương) trước khi vào app.
  if (profile && !profileComplete)
    return (
      <div className="center">
        <EmployeeInfoForm
          initial={profile}
          onSave={(info) => saveEmployeeInfo(info)}
          onBack={() => {
            // Quay lại đăng ký: đăng xuất + mở sẵn chế độ Đăng ký ở màn auth.
            localStorage.setItem('auth-mode', 'signup')
            signOut()
          }}
        />
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
  // Cửa hàng có ca đêm không (mặc định có nếu hồ sơ chưa đặt).
  const hasNightShift = profile?.has_night_shift !== false
  // Số liệu cho Trợ lý lương: lương kỳ này + ĐƠN GIÁ 1 GIỜ ngày/đêm (để tính số GIỜ
  // cần làm theo lương 1 giờ) + TB mỗi ca (cho câu hỏi chung).
  const allStats = periodStats(shifts)
  const allShiftCount = allStats.dayShiftCount + allStats.nightShiftCount
  const chatSnapshot = {
    currentPay: monthStats.pay - currentDeductionTotal,
    dayRate: getDayRate(),
    nightRate: getNightRate(),
    hasNightShift,
    avgPerShift: allShiftCount ? allStats.pay / allShiftCount : 0,
    avgHoursPerShift: allShiftCount ? allStats.hours / allShiftCount : 0,
    shiftCount: allShiftCount,
  }
  const schedByDate = buildSchedByDate(shifts)
  const salaryDue = isSalaryDue(pendingKey, profile?.payday, paymentWindow)
  const showReminder = salaryDue && !reminderDismissed && !showPaydayPrompt

  const fullName =
    profile?.full_name ||
    [profile?.last_name, profile?.first_name].filter(Boolean).join(' ') ||
    session.user.user_metadata?.full_name ||
    ''
  const employeeCode =
    profile?.employee_code || session.user.user_metadata?.employee_code || ''

  // Mục điều hướng cho NavBar pill: 3 mục từ sidebar cũ (Kỳ lương / Tài khoản /
  // Hướng dẫn) + Công cụ + Ngôn ngữ (menu chọn ngược lên). Phong cách đã chuyển ra
  // thanh gạt ThemeToggle ở header (cạnh chatbot).
  const LANG_NAMES = {
    vi: 'Tiếng Việt',
    en: 'English (UK)',
    us: 'English (US)',
    au: 'English (AU)',
  }
  // 4 công cụ (trước nằm trong dropdown "Công cụ") → mở bottom sheet, mỗi ô gọi
  // đúng hàm/mở đúng modal như cũ.
  const toolItems = [
    { key: 'import', icon: 'calendarPlus', label: t('nav.importWeek'), onClick: () => setShowImport(true) },
    { key: 'reconcile', icon: 'clipboardCheck', label: t('reconcile.title'), onClick: () => setShowReconcile(true) },
    { key: 'deductions', icon: 'coin', label: t('nav.deductions'), onClick: () => setShowDeductions(true) },
    { key: 'extra', icon: 'briefcase', label: t('nav.extraIncome'), onClick: () => setShowExtraIncome(true) },
  ]
  const navItems = [
    { key: 'payPeriod', icon: 'payPeriod', label: t('nav.payPeriod') },
    { key: 'tools', icon: 'tools', label: t('nav.tools') },
    { key: 'account', icon: 'account', label: t('nav.account') },
    { key: 'guide', icon: 'guide', label: t('nav.guide') },
    {
      key: 'lang',
      icon: 'lang',
      label: t('nav.language'),
      menu: ['vi', 'en', 'us', 'au'].map((code) => {
        const Flag = FLAGS[code]
        return {
          key: code,
          label: LANG_NAMES[code],
          node: <Flag />,
          active: lang === code,
          onPick: () => changeLang(code),
        }
      }),
    },
  ]
  // App không dùng router → "route" = panel/modal đang mở. Suy ra mục active theo
  // KEY (không phụ thuộc chỉ số cứng); -1 = không mở gì (giữ vị trí indicator).
  const activeKey = showPayPeriod
    ? 'payPeriod'
    : showToolsSheet
      ? 'tools'
      : showProfile
        ? 'account'
        : showWelcome
          ? 'guide'
          : null
  const activeNav = activeKey ? navItems.findIndex((it) => it.key === activeKey) : -1
  // Item thường mở modal/sheet tương ứng; Ngôn ngữ tự mở menu trong NavBar.
  function onNavSelect(i) {
    const key = navItems[i]?.key
    if (key === 'payPeriod') setShowPayPeriod(true)
    else if (key === 'tools') setShowToolsSheet(true)
    else if (key === 'account') setShowProfile(true)
    else if (key === 'guide') setShowWelcome(true)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <img className="app-logo" src="/logo.svg" alt="Salary Working logo" />
          <h1 className="app-title">Salary Working</h1>
        </div>
        <div className="header-actions">
          <ThemeToggle theme={theme} onChange={changeTheme} />
          <button
            type="button"
            className="chat-avatar-btn"
            onClick={() => setShowChat(true)}
            aria-label={t('chat.title')}
            title={t('chat.title')}
          >
            <ChatbotAvatar size={34} />
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
            hasNightShift={hasNightShift}
          />
          <MonthStats
            stats={monthStats}
            deductionTotal={currentDeductionTotal}
            fxUpdatedAt={fxUpdatedAt}
            hasNightShift={hasNightShift}
          />
        </div>
        {loadError && <p className="msg error">{loadError}</p>}
        <Timesheet
          shifts={visibleShifts}
          onDelete={deleteShift}
          onUpdate={updateShift}
          hasNightShift={hasNightShift}
        />
      </main>

      <NavBar items={navItems} active={activeNav} onSelect={onNavSelect} />

      {showToolsSheet && (
        <ToolsSheet tools={toolItems} onClose={() => setShowToolsSheet(false)} />
      )}

      {showPayPeriod && (
        <div className="modal-overlay" onClick={() => setShowPayPeriod(false)}>
          <div
            className="modal-card wide"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h2>{t('nav.payPeriod')}</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowPayPeriod(false)}
                aria-label={t('common.close')}
              >
                ×
              </button>
            </div>
            <PayPeriodPage
              shifts={shifts}
              payrolls={payrolls}
              deductions={deductions}
              extraIncome={extraIncome}
              payday={profile?.payday}
              onMarkReceived={markReceived}
              onUnmark={unmarkReceived}
              onAddDeduction={addDeduction}
              onDeleteDeduction={deleteDeduction}
              hasNightShift={hasNightShift}
            />
          </div>
        </div>
      )}

      {showDeductions && (
        <CompensationModal
          periodKey={currentKey}
          deductions={currentDeductions}
          grossPay={monthStats.pay}
          onAdd={addDeduction}
          onDelete={deleteDeduction}
          onClose={() => setShowDeductions(false)}
        />
      )}

      {showExtraIncome && (
        <ExtraIncomeModal
          periodKey={currentKey}
          shiftPay={monthStats.pay}
          extraIncome={extraIncome}
          onAdd={addExtraIncome}
          onUpdate={updateExtraIncome}
          onDelete={deleteExtraIncome}
          onClose={() => setShowExtraIncome(false)}
        />
      )}

      {/* Luôn mount để GIỮ tin nhắn khi đóng/mở; chỉ reset khi reload trang. */}
      <SalaryChat
        open={showChat}
        snapshot={chatSnapshot}
        shifts={shifts}
        deductions={deductions}
        extraIncome={extraIncome}
        onAddDeduction={addDeduction}
        onAddExtraIncome={addExtraIncome}
        onAddShift={addShift}
        onOpenImport={() => {
          setShowChat(false)
          setShowImport(true)
        }}
        onOpenReconcile={() => {
          setShowChat(false)
          setShowReconcile(true)
        }}
        onClose={() => setShowChat(false)}
      />

      {showImport && (
        <ScheduleImportModal
          employeeCode={employeeCode}
          fullName={fullName}
          phone={profile?.phone || ''}
          onImport={importWeekShifts}
          onClose={() => setShowImport(false)}
        />
      )}

      {showReconcile && (
        <ReconcileModal
          employeeCode={employeeCode}
          fullName={fullName}
          phone={profile?.phone || ''}
          shifts={shifts}
          onClose={() => setShowReconcile(false)}
        />
      )}

      {showProfile && (
        <ProfileModal
          user={session.user}
          profile={profile}
          payday={profile?.payday}
          employeeCode={employeeCode}
          onSavePayday={savePayday}
          onSaveField={saveProfileFields}
          onClose={() => setShowProfile(false)}
          onSignOut={signOut}
          onSwitchAccount={async (refreshToken) => {
            const err = await switchAccount(refreshToken)
            if (!err) setShowProfile(false)
            return err
          }}
          onAddAccount={() => {
            setShowProfile(false)
            setAddingAccount(true)
          }}
        />
      )}

      {showWelcome && <WelcomeGuide onClose={closeWelcome} />}

      {whatsNew && !showWelcome && (
        <WhatsNewModal entries={whatsNew} onClose={closeWhatsNew} />
      )}

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
