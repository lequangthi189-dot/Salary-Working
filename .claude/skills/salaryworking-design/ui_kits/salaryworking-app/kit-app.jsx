/* App shell: content column (max 980px, 7rem bottom clearance for the dock), the
   dock itself, and the floating assistant button. Theme / language / text-size are
   applied to the root element exactly as src/lib/theme.js + appearance.js do. */
const NS_A = window.SalaryWorkingDesignSystem_f6e8d6

function App() {
  const { Dock, ThemeCycle, Flag } = NS_A
const THEME_LABEL = { dark: 'Sleek Dark', glass: 'Glassmorphism', neumorph: 'Soft UI' }
const THEME_SWATCH = { dark: { background: 'linear-gradient(135deg, #23272c 55%, #6aa9c9 55%)' } }
  const [signedIn, setSignedIn] = React.useState(false)
  const [view, setView] = React.useState('board')
  const [overlay, setOverlay] = React.useState(null)
  const [chat, setChat] = React.useState(false)
  const [lang, setLang] = React.useState('en')
  const [theme, setTheme] = React.useState('dark')
  const [fontScale, setFontScale] = React.useState('md')
  const [shifts, setShifts] = React.useState(SHIFTS)
  const [avatar, setAvatar] = React.useState(null)

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-font', fontScale)
  }, [theme, fontScale])

  const schedByDate = new Map(shifts.filter((s) => s.scheduled_start).map((s) => [s.work_date, { start: s.scheduled_start, end: s.scheduled_end }]))
  const stats = periodStats(shifts)
  const dedTotal = DEDUCTIONS.reduce((a, d) => a + d.amount, 0)

  function addShift(data) {
    setShifts((list) => [{ id: Date.now(), ...data }, ...list.filter((s) => !(s.work_date === data.work_date && !s.start_time))]
      .sort((a, b) => String(b.work_date).localeCompare(String(a.work_date))))
  }
  function importWeek() {
    setShifts((list) => [
      ...IMPORT_ROWS.filter((r) => !r.off).map((r, i) => ({ id: 900 + i, work_date: r.date, scheduled_start: r.in, scheduled_end: r.out })),
      ...list
    ].sort((a, b) => String(b.work_date).localeCompare(String(a.work_date))))
    setOverlay(null)
  }

  if (!signedIn) {
    return <LoginScreen lang={lang} onLang={setLang} theme={theme} onTheme={setTheme} onSignIn={() => setSignedIn(true)} />
  }

  const dockItems = [
    { key: 'period', label: tr(lang, 'payPeriod'), icon: 'payPeriod' },
    { key: 'tools', label: tr(lang, 'tools'), icon: 'tools' },
    { key: 'account', label: tr(lang, 'account'), icon: 'account', avatarUrl: avatar, initials: avatar ? undefined : PROFILE.name },
    { key: 'guide', label: tr(lang, 'guide'), icon: 'guide' }
  ]
  const activeIndex = view === 'period' ? 0 : ['tools', 'import', 'reconcile', 'deductions', 'extra'].includes(overlay) ? 1 : overlay === 'account' ? 2 : overlay === 'guide' ? 3 : -1

  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      <div style={{ maxWidth: 'var(--app-max-width)', margin: '0 auto', padding: '1.5rem 1rem 7rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <button type="button" onClick={() => setView('board')} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)' }}>
            <img src={(window.__resources && window.__resources.logoMark) || '../../assets/logo/a-bangkep-icon-light.svg'} alt="" width="28" height="28" />
            <span style={{ fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-lg)', letterSpacing: '0.01em' }}>Salary Working</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', fontVariantNumeric: 'var(--numeric)' }}>
              {view === 'board' ? '26/7 → 25/8 · payday day ' + PROFILE.payday : tr(lang, 'payPeriod')}
            </span>
            <ThemeCycle
              value={lang}
              order={['vi', 'en', 'us', 'au']}
              label={{ vi: 'Tiếng Việt', en: 'English (UK)', us: 'English (US)', au: 'English (AU)' }[lang]}
              onChange={setLang}
              icon={Flag ? <Flag code={lang} /> : null}
              showLabel={false}
            />
            <ThemeCycle value={theme} onChange={setTheme} order={['dark', 'glass', 'neumorph']} label={THEME_LABEL[theme]} swatch={THEME_SWATCH[theme]} showLabel={false} />
          </div>
        </header>

        {view === 'board' ? (
          <BoardScreen
            lang={lang}
            shifts={shifts}
            stats={stats}
            deductionTotal={dedTotal}
            schedByDate={schedByDate}
            onAdd={addShift}
            onDelete={(id) => setShifts((l) => l.filter((s) => s.id !== id))}
          />
        ) : (
          <PayPeriodScreen lang={lang} shifts={shifts} deductions={DEDUCTIONS} extraIncome={EXTRA_INCOME} />
        )}
      </div>

      <Dock
        items={dockItems}
        active={activeIndex}
        onSelect={(i) => {
          if (i === 0) { setView('period'); setOverlay(null) }
          else if (i === 1) setOverlay('tools')
          else if (i === 2) setOverlay('account')
          else setOverlay('guide')
        }}
      />

      <button
        type="button"
        onClick={() => setChat(!chat)}
        aria-label="Salary assistant"
        style={{ position: 'fixed', right: '1rem', bottom: '5.5rem', zIndex: 55, width: 52, height: 52, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--panel)', backgroundImage: 'var(--card-bg-image)', boxShadow: 'var(--shadow-dock)', color: 'var(--accent)', font: 'inherit', fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-md)', cursor: 'pointer', display: chat ? 'none' : 'block' }}
      >
        ₫?
      </button>
      {chat && <SalaryChat lang={lang} onClose={() => setChat(false)} />}

      {overlay === 'tools' && (
        <ToolsSheet lang={lang} onClose={() => setOverlay(null)} onImport={() => setOverlay('import')} onReconcile={() => setOverlay('reconcile')} onDeductions={() => setOverlay('deductions')} onExtra={() => setOverlay('extra')} />
      )}
      {overlay === 'import' && <ScheduleImportModal lang={lang} onClose={() => setOverlay(null)} onCreate={importWeek} />}
      {overlay === 'reconcile' && <ReconcileModal lang={lang} onClose={() => setOverlay(null)} />}
      {overlay === 'deductions' && <DeductionsModal lang={lang} onClose={() => setOverlay(null)} />}
      {overlay === 'extra' && <ExtraIncomeModal lang={lang} onClose={() => setOverlay(null)} />}
      {overlay === 'account' && (
        <AccountModal lang={lang} theme={theme} onTheme={setTheme} onLang={setLang} fontScale={fontScale} onFont={setFontScale} avatar={avatar} onAvatar={setAvatar} onClose={() => setOverlay(null)} onSignOut={() => { setOverlay(null); setSignedIn(false) }} />
      )}
      {overlay === 'guide' && <GuideModal onClose={() => setOverlay(null)} />}
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
