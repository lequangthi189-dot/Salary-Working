/* Login + Board (the app's home): shift entry, month stats, timesheet.
   Layout copies src/App.jsx — .board-grid is 2fr/3fr on desktop and one column
   under 760px, which is how nearly every real user sees it. */
const NS = window.SalaryWorkingDesignSystem_f6e8d6

function LoginScreen({ lang, onLang, theme, onTheme, onSignIn }) {
  const { TextField, Button, Message, ThemeCycle, Flag } = NS
  const [email, setEmail] = React.useState('cong@xuong.vn')
  const [pw, setPw] = React.useState('••••••••')
  const [showPw, setShowPw] = React.useState(false)
  const [err, setErr] = React.useState(null)
  const LANGS = { vi: 'Tiếng Việt', en: 'English (UK)', us: 'English (US)', au: 'English (AU)' }
  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'safe center', padding: '1rem' }}>
      <div style={{ background: 'var(--card-bg)', backgroundImage: 'var(--card-bg-image)', border: 'var(--card-border)', borderRadius: 'var(--card-radius)', boxShadow: 'var(--card-shadow)', padding: '2rem', width: '100%', maxWidth: 'var(--auth-max-width)' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginBottom: '0.75rem' }}>
          <ThemeCycle value={lang} order={['vi', 'en', 'us', 'au']} label={LANGS[lang]} onChange={onLang} icon={Flag ? <Flag code={lang} /> : null} showLabel={false} />
          <ThemeCycle value={theme} onChange={onTheme} showLabel={false} />
        </div>
        <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem' }}>Salary Working</h1>
        <p style={{ color: 'var(--muted)', margin: '0 0 1.5rem', fontSize: 'var(--text-md)' }}>{tr(lang, 'signInSub')}</p>
        <form
          onSubmit={(e) => { e.preventDefault(); if (!email) { setErr('Wrong email or password.'); return } onSignIn() }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <TextField label={tr(lang, 'email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div style={{ position: 'relative' }}>
            <TextField label={tr(lang, 'password')} type={showPw ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} inputStyle={{ paddingRight: '3.5rem' }} />
            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '0.4rem', bottom: '0.55rem', background: 'none', border: 'none', color: 'var(--accent)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', cursor: 'pointer' }}>
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
          <Button variant="primary" fullWidth type="submit">{tr(lang, 'signIn')}</Button>
          <Button variant="link" style={{ color: 'var(--danger)', alignSelf: 'flex-start' }}>{tr(lang, 'forgot')}</Button>
        </form>
        {err && <Message tone="error">{err}</Message>}
        <Button variant="link" style={{ marginTop: '1rem' }}>{tr(lang, 'noAccount')}</Button>
      </div>
    </div>
  )
}

function ShiftEntry({ lang, schedByDate, onAdd, receiveDue }) {
  const { TextField, TimeInput, Checkbox, Button } = NS
  const [date, setDate] = React.useState(TODAY)
  const [start, setStart] = React.useState('21:58')
  const [end, setEnd] = React.useState('06:05')
  const [holiday, setHoliday] = React.useState(false)
  const sched = schedByDate.get(date)
  const preview = computeEffective(sched && sched.start, sched && sched.end, start, end, holiday)
  const lost = preview.lostHours > 0
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onAdd({ work_date: date, start_time: start, end_time: end, is_holiday: holiday, scheduled_start: sched && sched.start, scheduled_end: sched && sched.end }) }}
      style={{ background: 'var(--panel-2)', backgroundImage: 'var(--card-bg-image)', border: '1px solid rgba(91,158,198,0.45)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--card-shadow)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}
    >
      <h2 style={{ margin: '0 0 0.15rem', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-title)', color: 'var(--accent)', display: 'inline-block', paddingBottom: '0.3rem', borderBottom: '2px solid var(--accent)', alignSelf: 'flex-start' }}>
        {tr(lang, 'addShift')}
      </h2>
      <TextField label={tr(lang, 'date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: 'var(--text-base)', color: 'var(--muted)' }}>
          {tr(lang, 'checkin')}
          <TimeInput kind="in" value={start} onChange={setStart} style={{ width: '100%' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: 'var(--text-base)', color: 'var(--muted)' }}>
          {tr(lang, 'checkout')}
          <TimeInput kind="out" value={end} onChange={setEnd} style={{ width: '100%' }} />
        </label>
        <Checkbox checked={holiday} onChange={(e) => setHoliday(e.target.checked)} label={tr(lang, 'holiday')} style={{ paddingBottom: '0.6rem' }} />
      </div>
      <p style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', fontVariantNumeric: 'var(--numeric)' }}>
        {tr(lang, 'currentShift')} ({preview.nightHours > preview.dayHours ? tr(lang, 'night') : tr(lang, 'day')}): {fmtHours(preview.decimalHours)} h · {fmtMoney(preview.pay, lang)}
      </p>
      {lost && (
        <p style={{ margin: 0, color: 'var(--pay-negative)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-base)', fontVariantNumeric: 'var(--numeric)' }}>
          {tr(lang, 'lateIn')} {fmtHours(preview.lateIn)}h · −{fmtMoney(preview.lostPay, lang)}
        </p>
      )}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto', paddingTop: '0.25rem' }}>
        {receiveDue && <Button variant="received" style={{ flex: 1 }}>{tr(lang, 'received')}</Button>}
        <Button variant="primary" type="submit" style={{ flex: 1 }}>{tr(lang, 'addShift')}</Button>
      </div>
    </form>
  )
}

function MonthStats({ lang, stats, deductionTotal }) {
  const { SalaryHero, StatCard } = NS
  const net = stats.pay - deductionTotal
  const fxNote = lang === 'vi' ? null : SYMBOLS[lang] + '1 = ' + new Intl.NumberFormat('vi-VN').format(lang === 'en' ? 31000 : lang === 'us' ? 25000 : 16500) + ' VND · updated 08:20'
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: '100%' }}>
      <SalaryHero
        label={tr(lang, 'salaryLabel')}
        expectedLabel={tr(lang, 'expected')}
        lateLabel={tr(lang, 'late')}
        deductionLabel={tr(lang, 'compensation')}
        net={net}
        expected={stats.idealPay}
        latePenalty={stats.lostPay}
        deduction={deductionTotal}
        currencyLocale={LOCALES[lang]}
        fxNote={fxNote}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '0.5rem', flex: '1 1 0' }}>
        <StatCard tone="orange" title={tr(lang, 'totalHours')} value={fmtHours2(stats.hours) + ' (h)'} />
        <StatCard tone="green" title={tr(lang, 'dayHours')} value={fmtHours2(stats.dayHours) + ' (h)'} />
        <StatCard tone="blue" title={tr(lang, 'nightHours')} value={fmtHours2(stats.nightHours) + ' (h)'} />
        <StatCard tone="red" title={tr(lang, 'lateHours')} value={fmtHours2(stats.lostHours) + ' (h)'} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '0.5rem', flex: '1 1 0' }}>
        <StatCard tone="orange" title={tr(lang, 'dayShifts')} value={stats.dayShiftCount} />
        <StatCard tone="blue" title={tr(lang, 'nightShifts')} value={stats.nightShiftCount} />
      </div>
    </section>
  )
}

function BoardScreen({ lang, shifts, stats, deductionTotal, schedByDate, onAdd, onDelete }) {
  const { SearchInput, FilterTabs, DateGroup, ShiftCard, EmptyState, Modal, Button } = NS
  const [q, setQ] = React.useState('')
  const [filter, setFilter] = React.useState('all')
  // Deleting a shift always asks first — the row is the user's evidence of a day worked.
  const [pendingDelete, setPendingDelete] = React.useState(null)
  const rows = shifts.map(enrich).filter((s) => {
    const kind = s.eff.nightHours > 0 ? 'night' : 'day'
    if (filter !== 'all' && kind !== filter) return false
    if (q.trim() && !(s.work_date + ' ' + dm(s.work_date) + ' ' + (s.start_time || '') + ' ' + (s.end_time || '') + ' ' + kind).includes(q.trim())) return false
    return true
  })
  const groups = []
  const byDate = new Map()
  for (const s of rows) {
    if (!byDate.has(s.work_date)) { const g = { date: s.work_date, items: [] }; byDate.set(s.work_date, g); groups.push(g) }
    byDate.get(s.work_date).items.push(s)
  }
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'var(--board-columns)', gap: 'var(--board-gap)', alignItems: 'stretch' }} className="board-grid">
        <ShiftEntry lang={lang} schedByDate={schedByDate} onAdd={onAdd} receiveDue />
        <MonthStats lang={lang} stats={stats} deductionTotal={deductionTotal} />
      </div>
      <div style={{ marginTop: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem 0.75rem', marginBottom: '0.85rem' }}>
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder={tr(lang, 'search')} />
          <FilterTabs value={filter} onChange={setFilter} options={[{ value: 'all', label: tr(lang, 'all') }, { value: 'day', label: tr(lang, 'dayFilter') }, { value: 'night', label: tr(lang, 'nightFilter') }]} />
        </div>
        {groups.length === 0 && <EmptyState>{q ? 'No shifts match your search.' : tr(lang, 'emptyShifts')}</EmptyState>}
        {groups.map((g) => {
          const t = g.items.reduce((a, s) => ({
            hours: a.hours + s.eff.decimalHours,
            dayHours: a.dayHours + s.eff.dayHours,
            nightHours: a.nightHours + s.eff.nightHours,
            lostHours: a.lostHours + (s.eff.lostHours || 0),
            pay: a.pay + s.eff.pay
          }), { hours: 0, dayHours: 0, nightHours: 0, lostHours: 0, pay: 0 })
          return (
            <DateGroup key={g.date} date={g.date} totalHours={t.hours} dayHours={t.dayHours} nightHours={t.nightHours} lostHours={t.lostHours} pay={t.pay} currencyLocale={LOCALES[lang]}>
              {g.items.map((s) => (
                <ShiftCard
                  key={s.id}
                  start={s.start_time}
                  end={s.end_time}
                  scheduledStart={s.scheduled_start}
                  scheduledEnd={s.scheduled_end}
                  pay={s.eff.pay}
                  lostHours={s.eff.lostHours}
                  lateInHours={s.eff.lateIn}
                  earlyOutHours={s.eff.earlyOut}
                  state={s.state}
                  currencyLocale={LOCALES[lang]}
                  onDelete={() => setPendingDelete(s)}
                />
              ))}
            </DateGroup>
          )
        })}
      </div>
      {pendingDelete && (
        <Modal
          title="Delete this shift?"
          onClose={() => setPendingDelete(null)}
          footer={
            <>
              <Button variant="save" style={{ flex: 1 }} onClick={() => { onDelete(pendingDelete.id); setPendingDelete(null) }}>Yes</Button>
              <Button variant="cancel" style={{ flex: 1 }} onClick={() => setPendingDelete(null)}>No</Button>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: 'var(--text-base)', color: 'var(--muted)' }}>This action cannot be undone.</p>
          <p style={{ margin: '0.6rem 0 0', fontSize: 'var(--text-base)', fontVariantNumeric: 'var(--numeric)' }}>
            {pendingDelete.work_date} · {pendingDelete.start_time || pendingDelete.scheduled_start || '—'} – {pendingDelete.end_time || pendingDelete.scheduled_end || '—'}
            {pendingDelete.eff && pendingDelete.eff.pay > 0 ? ' · ' + fmtMoney(pendingDelete.eff.pay, lang) : ''}
          </p>
        </Modal>
      )}
    </div>
  )
}

Object.assign(window, { LoginScreen, BoardScreen, ShiftEntry, MonthStats })
