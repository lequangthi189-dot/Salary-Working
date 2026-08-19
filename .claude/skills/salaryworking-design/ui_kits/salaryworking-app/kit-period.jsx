/* Pay period screen — period cards → charts popup → detailed timesheet popup.
   Donut is hand-drawn SVG with stroke-dasharray exactly as in
   src/components/PayPeriodPage.jsx; slices carry no labels, the legend does. */
const NS_P = window.SalaryWorkingDesignSystem_f6e8d6

function Donut({ segments, centerValue, centerLabel, size = 104, stroke = 18 }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const cx = size / 2
  let acc = 0
  return (
    <svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size} style={{ maxWidth: '100%', height: 'auto' }}>
      <g transform={'rotate(-90 ' + cx + ' ' + cx + ')'}>
        {total > 0 ? segments.map((seg) => {
          const len = (seg.value / total) * circ
          const el = <circle key={seg.label} cx={cx} cy={cx} r={r} fill="none" stroke={seg.color} strokeWidth={stroke} strokeDasharray={len + ' ' + (circ - len)} strokeDashoffset={-acc} />
          acc += len
          return el
        }) : <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--panel-2)" strokeWidth={stroke} />}
      </g>
      <text x={cx} y={cx} dy="-2" textAnchor="middle" dominantBaseline="middle" style={{ fill: 'var(--text)', fontSize: 14, fontWeight: 700 }}>{centerValue}</text>
      <text x={cx} y={cx} dy="11" textAnchor="middle" dominantBaseline="middle" style={{ fill: 'var(--muted)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{centerLabel}</text>
    </svg>
  )
}

function DonutBlock({ title, segments, centerValue, centerLabel }) {
  return (
    <div style={{ flex: '0 1 150px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <span style={{ fontSize: '0.78rem', fontWeight: 'var(--weight-semibold)', color: 'var(--muted)', marginBottom: '0.2rem' }}>{title}</span>
      <Donut segments={segments} centerValue={centerValue} centerLabel={centerLabel} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.12rem', marginTop: '0.25rem', fontSize: '0.7rem', color: 'var(--muted)' }}>
        {segments.map((s) => (
          <span key={s.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '0.7rem', height: '0.7rem', borderRadius: 3, background: s.color, flex: '0 0 auto' }} />
            {s.label}: <strong style={{ fontVariantNumeric: 'var(--numeric)' }}>{s.display}</strong>
          </span>
        ))}
      </div>
    </div>
  )
}

function PayPeriodScreen({ lang, shifts, deductions, extraIncome }) {
  const { Modal, TimesheetTable, PeriodCard, FilterTabs, Button } = NS_P
  const [scope, setScope] = React.useState(null)
  const [sheet, setSheet] = React.useState(false)
  const [week, setWeek] = React.useState('all')
  const periods = [
    { key: '2026-08', label: '26/7 → 25/8', range: '26/07 – 25/08', shifts: shifts },
    { key: '2026-07', label: '26/6 → 25/7', range: '26/06 – 25/07', shifts: [], received: true, receivedOn: '03/08', pay: 7126500 }
  ]
  const dedTotal = deductions.reduce((a, d) => a + d.amount, 0)
  const extraTotal = extraIncome.filter((x) => x.received).reduce((a, x) => a + x.amount, 0)
  const st = periodStats(shifts)
  const net = st.pay - dedTotal
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) + '%' : '—')
  const money = (v) => fmtMoney(v, lang)
  const rows = shifts.filter((s) => s.start_time).map((s) => { const e = enrich(s); return { id: s.id, date: dm(s.work_date), start: s.start_time, end: s.end_time, pay: e.eff.pay } }).reverse()
  const card = { background: 'var(--card-bg)', backgroundImage: 'var(--card-bg-image)', border: 'var(--card-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--card-shadow)', padding: '0.5rem 0.75rem', color: 'var(--text)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.1rem', textAlign: 'left', font: 'inherit', cursor: 'pointer' }
  return (
    <div>
      <p style={{ margin: '0 0 0.75rem', fontSize: 'var(--text-base)', color: 'var(--muted)' }}>{tr(lang, 'scopeHint')}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '0.75rem' }}>
        <button type="button" onClick={() => setScope('all')} style={{ ...card, borderColor: 'var(--green)' }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>{tr(lang, 'allPeriods')}</span>
          <span style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--green)', fontVariantNumeric: 'var(--numeric)' }}>{fmtHours(st.hours)} h · {money(st.pay)}</span>
          <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--danger)', fontVariantNumeric: 'var(--numeric)' }}>Lost to late −{money(st.lostPay)}</span>
        </button>
        {periods.map((p) => (
          <button key={p.key} type="button" onClick={() => setScope(p.key)} style={card}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>{p.label}</span>
            <span style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--green)', fontVariantNumeric: 'var(--numeric)' }}>
              {p.key === '2026-08' ? fmtHours(st.hours) + ' h · ' + money(st.pay) : '176 h · ' + money(p.pay)}
            </span>
            {p.key === '2026-08' && <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--danger)', fontVariantNumeric: 'var(--numeric)' }}>Lost to late −{money(st.lostPay)}</span>}
          </button>
        ))}
      </div>

      <h2 style={{ margin: '1.75rem 0 0.75rem', fontSize: '1rem' }}>{tr(lang, 'receivedPeriods')}</h2>
      <div style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.75rem 0.9rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>Total net received (after deductions)</span>
        <span style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-bold)', color: 'var(--green)', fontVariantNumeric: 'var(--numeric)' }}>{money(7126500)}</span>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', fontVariantNumeric: 'var(--numeric)' }}>Before deductions {money(7326500)} · deducted −{money(200000)}</span>
      </div>
      <PeriodCard label="26/6 → 25/7" dateRange="26/06 – 25/07" meta={'22 shifts · 176.00 h'} pay={7126500} received receivedOn="03/08" currencyLocale={LOCALES[lang]} onClick={() => setScope('2026-07')} />
      <PeriodCard label="26/5 → 25/6" dateRange="26/05 – 25/06" meta={'21 shifts · 168.50 h'} pay={6842000} received receivedOn="04/07" currencyLocale={LOCALES[lang]} onClick={() => setScope('2026-06')} />

      {scope && !sheet && (
        <Modal width="wide" title={scope === 'all' ? tr(lang, 'allPeriods') : '26/7 → 25/8'} onClose={() => setScope(null)}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.6rem 1rem' }}>
            <DonutBlock title="Salary" centerValue={pct(net, st.idealPay)} centerLabel="net"
              segments={[
                { label: 'Net', value: Math.max(0, net), color: 'var(--green)', display: money(net) },
                { label: 'Compensation', value: dedTotal, color: 'var(--checkin)', display: money(dedTotal) },
                { label: 'Lost to late', value: st.lostPay, color: 'var(--danger)', display: money(st.lostPay) }
              ]} />
            <DonutBlock title="Total income" centerValue={money(st.pay + extraTotal)} centerLabel="total"
              segments={[
                { label: 'Shift pay', value: st.pay, color: 'var(--green)', display: money(st.pay) },
                { label: 'Extra income', value: extraTotal, color: 'var(--checkin)', display: money(extraTotal) }
              ]} />
            <DonutBlock title="Day / night hours" centerValue={fmtHours(st.hours) + 'h'} centerLabel="total hours"
              segments={[
                { label: 'Day hours', value: st.dayHours, color: 'var(--checkin)', display: fmtHours(st.dayHours) + ' h' },
                { label: 'Night hours', value: st.nightHours, color: 'var(--accent)', display: fmtHours(st.nightHours) + ' h' },
                { label: 'Late hours', value: st.lostHours, color: 'var(--danger)', display: fmtHours(st.lostHours) + ' h' }
              ]} />
            <DonutBlock title="Day / night shifts" centerValue={String(st.dayShiftCount + st.nightShiftCount)} centerLabel="total shifts"
              segments={[
                { label: 'Day shifts', value: st.dayShiftCount, color: 'var(--checkin)', display: st.dayShiftCount + ' shifts' },
                { label: 'Night shifts', value: st.nightShiftCount, color: 'var(--accent)', display: st.nightShiftCount + ' shifts' }
              ]} />
          </div>
          <button type="button" onClick={() => setSheet(true)} style={{ width: '100%', marginTop: '1rem', background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', font: 'inherit', fontWeight: 'var(--weight-semibold)', padding: '0.6rem', cursor: 'pointer' }}>
            {tr(lang, 'detail')}
          </button>
        </Modal>
      )}

      {sheet && (
        <Modal width="wide" title={'26/7 → 25/8 · ' + tr(lang, 'detail')} onClose={() => setSheet(false)}>
          <FilterTabs value={week} onChange={setWeek} options={[{ value: 'all', label: 'All' }, { value: 'w1', label: 'Week 1' }, { value: 'w2', label: 'Week 2' }]} style={{ marginBottom: '0.85rem' }} />
          <TimesheetTable rows={week === 'all' ? rows : rows.slice(0, 3)} totalHours={st.hours} totalPay={st.pay} currencyLocale={LOCALES[lang]} />
        </Modal>
      )}
    </div>
  )
}

Object.assign(window, { PayPeriodScreen, Donut, DonutBlock })
