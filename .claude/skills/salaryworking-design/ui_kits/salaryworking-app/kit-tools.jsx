/* Tools sheet, weekly-schedule image import (with the OCR cross-check layer),
   account sheet, guide, and the floating salary assistant. Copy is taken from
   src/lib/translations.js so the tone is the product's own. */
const NS_T = window.SalaryWorkingDesignSystem_f6e8d6

// Stand-in for an uploaded profile photo (the real flow crops and uploads to Supabase).
const SAMPLE_AVATAR = (window.__resources && window.__resources.logoMark) || '../../assets/logo/a-bangkep-icon-light.svg'

function ToolsSheet({ lang, onClose, onImport, onReconcile, onDeductions, onExtra }) {
  const { Modal } = NS_T
  const item = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', font: 'inherit', fontWeight: 'var(--weight-semibold)', padding: '0.7rem 0.85rem', cursor: 'pointer' }
  return (
    <Modal title={tr(lang, 'tools')} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button type="button" style={item} onClick={onImport}>{tr(lang, 'importWeek')}<span style={{ color: 'var(--muted)' }}>›</span></button>
        <button type="button" style={item} onClick={onReconcile}>{tr(lang, 'reconcile')}<span style={{ color: 'var(--muted)' }}>›</span></button>
        <button type="button" style={item} onClick={onDeductions}>{tr(lang, 'deductions')}<span style={{ color: 'var(--muted)' }}>›</span></button>
        <button type="button" style={item} onClick={onExtra}>{tr(lang, 'extra')}<span style={{ color: 'var(--muted)' }}>›</span></button>
      </div>
    </Modal>
  )
}

const IMPORT_ROWS = [
  { day: 'Mon', date: '2026-08-17', in: '14:00', out: '22:00', ocr: 'ok' },
  { day: 'Tue', date: '2026-08-18', in: '14:00', out: '22:00', ocr: 'ok' },
  { day: 'Wed', date: '2026-08-19', in: '22:00', out: '06:00', ocr: 'mismatch' },
  { day: 'Thu', date: '2026-08-20', in: '22:00', out: '06:00', ocr: 'ok' },
  { day: 'Fri', date: '2026-08-21', in: '', out: '', off: true, ocr: 'ok' },
  { day: 'Sat', date: '2026-08-22', in: '06:00', out: '14:00', ocr: 'unchecked' }
]

function ScheduleImportModal({ lang, onClose, onCreate }) {
  const { Modal, Button, ProgressButton, Badge, Checkbox } = NS_T
  const [stage, setStage] = React.useState('pick')
  const [pct, setPct] = React.useState(0)
  React.useEffect(() => {
    if (stage !== 'reading') return undefined
    setPct(0)
    const id = setInterval(() => setPct((p) => {
      if (p >= 100) { clearInterval(id); setStage('review'); return 100 }
      return p + 8
    }), 130)
    return () => clearInterval(id)
  }, [stage])
  const mismatches = IMPORT_ROWS.filter((r) => r.ocr === 'mismatch').length
  const cell = { border: '1px solid var(--border)', padding: '0.25rem 0.35rem', fontSize: 'var(--text-xs)', whiteSpace: 'nowrap', fontVariantNumeric: 'var(--numeric)' }
  return (
    <Modal width="wide" title="Import weekly schedule from image" onClose={onClose}>
      {stage === 'pick' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', textAlign: 'center', color: 'var(--muted)', fontSize: 'var(--text-base)' }}>
            <p style={{ margin: '0 0 0.35rem', color: 'var(--text)', fontWeight: 'var(--weight-semibold)' }}>Drop images here</p>
            <p style={{ margin: 0 }}>or <span style={{ color: 'var(--accent)' }}>browse images</span> · one image</p>
          </div>
          <p style={{ margin: 0, fontSize: 'var(--text-base)', color: 'var(--muted)' }}>Employee code (from profile): <strong style={{ color: 'var(--text)' }}>{PROFILE.code}</strong></p>
          <Button variant="primary" fullWidth onClick={() => setStage('reading')}>Read schedule</Button>
          <Button variant="link" onClick={() => setStage('review')}>Enter manually</Button>
        </div>
      )}
      {stage === 'reading' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'center' }}>
          <ProgressButton value={pct} label={pct < 40 ? 'Uploading image…' : pct < 90 ? 'Reading schedule…' : 'Processing…'} />
          <ProgressButton indeterminate label="Cross-checking with OCR…" />
        </div>
      )}
      {stage === 'review' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {mismatches > 0 && (
            <p style={{ margin: 0, fontSize: 'var(--text-base)', color: 'var(--sw-amber-500)' }}>
              {mismatches} cell(s) where the reading and OCR differ — check carefully before saving.
            </p>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Day', 'Date', 'In', 'Out', 'Off'].map((h) => (
                  <th key={h} style={{ ...cell, color: 'var(--muted)', textAlign: 'left', fontWeight: 'var(--weight-semibold)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {IMPORT_ROWS.map((r) => (
                <tr key={r.date}>
                  <td style={cell}>{r.day}</td>
                  <td style={cell}>{dm(r.date)}</td>
                  <td style={{ ...cell, color: r.ocr === 'mismatch' ? 'var(--sw-amber-500)' : 'var(--time-in)' }}>
                    {r.in || '—'}{r.ocr === 'mismatch' && <Badge kind="ocr">check</Badge>}
                  </td>
                  <td style={{ ...cell, color: 'var(--time-out)' }}>{r.out || '—'}</td>
                  <td style={cell}><Checkbox checked={!!r.off} onChange={() => {}} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
            Values read from the image are never written straight in — confirm them and they become planned shifts.
          </p>
          <Button variant="primary" fullWidth onClick={onCreate}>Create whole week</Button>
        </div>
      )}
    </Modal>
  )
}


const RECONCILE_ROWS = [
  { date: '2026-08-10', image: '06:00 – 14:00', actual: '06:00 – 14:12', sched: '06:00 – 14:00', result: 'match' },
  { date: '2026-08-11', image: '22:00 – 06:00', actual: null, sched: '22:00 – 06:00', result: 'missing' },
  { date: '2026-08-12', image: '22:00 – 06:00', actual: '22:00 – 06:00', sched: '22:00 – 06:00', result: 'match' },
  { date: '2026-08-13', image: '22:00 – 06:00', actual: '22:06 – 06:02', sched: '22:00 – 06:00', result: 'diff' },
  { date: '2026-08-14', image: 'Off', actual: '21:52 – 06:04', sched: '22:00 – 06:00', result: 'extra' }
]

// Đối chiếu công: read a photo of the company timesheet and compare it, day by day,
// with what the user logged. The app never overwrites — it reports.
function ReconcileModal({ lang, onClose }) {
  const { Modal, Button, ProgressButton, Badge, FilterTabs, StatTile } = NS_T
  const [scope, setScope] = React.useState('week')
  const [stage, setStage] = React.useState('pick')
  const [pct, setPct] = React.useState(0)
  React.useEffect(() => {
    if (stage !== 'reading') return undefined
    setPct(0)
    const id = setInterval(() => setPct((p) => {
      if (p >= 100) { clearInterval(id); setStage('result'); return 100 }
      return p + 9
    }), 130)
    return () => clearInterval(id)
  }, [stage])
  const L = lang === 'vi'
    ? { title: 'Đối chiếu công', scope: 'Đối chiếu theo', week: 'Tuần', weeks: 'Nhiều tuần', month: 'Cả kỳ lương', first: 'Tuần đầu bắt đầu (Thứ 2)', check: 'Đọc & đối chiếu', stage: 'Đang đối chiếu công…', colDate: 'Ngày', colImage: 'Theo ảnh', colActual: 'Thực tế', colResult: 'Kết quả', match: '✓ Khớp', diff: '✗ Lệch', missing: 'Chưa chấm công', extra: 'Dư (ảnh nghỉ)', summary: 'Khớp {m}/{t} ngày', lost: 'Giờ mất', note: 'Số đọc từ ảnh không bao giờ tự ghi đè — chỉ báo lệch để bạn kiểm tra.' }
    : { title: 'Verify timesheet', scope: 'Reconcile by', week: 'Week', weeks: 'Multiple weeks', month: 'Whole pay period', first: 'First week start (Monday)', check: 'Read & compare', stage: 'Comparing hours…', colDate: 'Date', colImage: 'From image', colActual: 'Actual', colResult: 'Result', match: '✓ Match', diff: '✗ Mismatch', missing: 'Not logged', extra: 'Extra (off in image)', summary: 'Matched {m}/{t} days', lost: 'Lost hours', note: 'Values read from the image never overwrite yours — mismatches are only flagged.' }
  const matched = RECONCILE_ROWS.filter((r) => r.result === 'match').length
  const cell = { border: '1px solid var(--border)', padding: '0.25rem 0.35rem', fontSize: 'var(--text-xs)', whiteSpace: 'nowrap', fontVariantNumeric: 'var(--numeric)' }
  const RESULT = {
    match: { text: L.match, color: 'var(--green)' },
    diff: { text: L.diff, color: 'var(--danger)' },
    missing: { text: L.missing, color: 'var(--status-missing)' },
    extra: { text: L.extra, color: 'var(--checkin)' }
  }
  return (
    <Modal width="wide" title={L.title} onClose={onClose}>
      {stage === 'pick' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontSize: 'var(--text-base)', color: 'var(--muted)' }}>{L.scope}</span>
            <FilterTabs value={scope} onChange={setScope} options={[{ value: 'week', label: L.week }, { value: 'weeks', label: L.weeks }, { value: 'month', label: L.month }]} />
          </div>
          <div style={{ fontSize: 'var(--text-base)', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>{L.first}</span><strong style={{ color: 'var(--text)', fontVariantNumeric: 'var(--numeric)' }}>10/08/2026</strong>
          </div>
          <div style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', textAlign: 'center', color: 'var(--muted)', fontSize: 'var(--text-base)' }}>
            <p style={{ margin: '0 0 0.35rem', color: 'var(--text)', fontWeight: 'var(--weight-semibold)' }}>Drop images here</p>
            <p style={{ margin: 0 }}>or <span style={{ color: 'var(--accent)' }}>browse images</span> · multiple images supported</p>
          </div>
          <Button variant="primary" fullWidth onClick={() => setStage('reading')}>{L.check}</Button>
        </div>
      )}
      {stage === 'reading' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'center' }}>
          <ProgressButton value={pct} label={L.stage} />
          <ProgressButton indeterminate label={lang === 'vi' ? 'Đang đối chiếu OCR…' : 'Cross-checking with OCR…'} />
        </div>
      )}
      {stage === 'result' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '0.5rem' }}>
            <StatTile label={L.summary.replace('{m}', matched).replace('{t}', RECONCILE_ROWS.length)} value={matched + '/' + RECONCILE_ROWS.length} variant="total" />
            <StatTile label={L.lost} value="0.53 h" variant="negative" />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {[L.colDate, L.colImage, L.colActual, L.colResult].map((h) => (
                  <th key={h} style={{ ...cell, color: 'var(--muted)', textAlign: 'left', fontWeight: 'var(--weight-semibold)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RECONCILE_ROWS.map((r) => (
                <tr key={r.date}>
                  <td style={cell}>{dm(r.date)}</td>
                  <td style={{ ...cell, color: 'var(--muted)' }}>{r.image}<Badge kind="ocr">OCR</Badge></td>
                  <td style={cell}>{r.actual || '—'}</td>
                  <td style={{ ...cell, color: RESULT[r.result].color, fontWeight: 'var(--weight-semibold)' }}>{RESULT[r.result].text}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>{L.note}</p>
        </div>
      )}
    </Modal>
  )
}


// Tiền bồi thường (deductions): amount + reason + date, attached to the pay period.
// A deduction never touches the hourly maths — it is subtracted from the period total.
function DeductionsModal({ lang, onClose }) {
  const { Modal, TextField, Button, EmptyState, StatTile } = NS_T
  const [rows, setRows] = React.useState(DEDUCTIONS)
  const [amount, setAmount] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [date, setDate] = React.useState(TODAY)
  const [err, setErr] = React.useState(null)
  const L = lang === 'vi'
    ? { title: 'Tiền bồi thường', amount: 'Số tiền', reason: 'Lý do (bắt buộc)', date: 'Ngày bị trừ', add: '+ Thêm', empty: 'Kỳ này chưa có khoản trừ nào.', net: 'Thực nhận sau khi trừ', total: 'Tổng bị trừ', errAmount: 'Nhập số tiền bị trừ (> 0).', errReason: 'Phải có lý do.' }
    : { title: 'Compensation', amount: 'Amount', reason: 'Reason (required)', date: 'Deduction date', add: '+ Add', empty: 'No deductions in this period yet.', net: 'Net after deductions', total: 'Total deducted', errAmount: 'Enter a deduction amount (> 0).', errReason: 'A reason is required.' }
  const total = rows.reduce((a, d) => a + Number(d.amount), 0)
  function add() {
    const n = Number(String(amount).replace(/[^\d]/g, ''))
    if (!n) { setErr(L.errAmount); return }
    if (!reason.trim()) { setErr(L.errReason); return }
    setRows((l) => [{ id: Date.now(), amount: n, reason: reason.trim(), deduct_date: date }, ...l])
    setAmount(''); setReason(''); setErr(null)
  }
  return (
    <Modal title={L.title} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          <TextField label={L.amount} numeric value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="120000" />
          <TextField label={L.date} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <TextField label={L.reason} value={reason} onChange={(e) => setReason(e.target.value)} error={err} />
        <Button variant="primary" fullWidth onClick={add}>{L.add}</Button>
        <StatTile label={L.total} value={fmtMoney(total, lang)} variant="negative" />
        {rows.length === 0 ? (
          <EmptyState>{L.empty}</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {rows.map((d) => (
              <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: '0.6rem', background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.7rem', fontSize: 'var(--text-base)' }}>
                <span>
                  {d.reason}
                  <span style={{ display: 'block', color: 'var(--muted)', fontSize: 'var(--text-sm)', fontVariantNumeric: 'var(--numeric)' }}>{dm(d.deduct_date)}</span>
                </span>
                <strong style={{ color: 'var(--pay-negative)', fontVariantNumeric: 'var(--numeric)' }}>−{fmtMoney(d.amount, lang)}</strong>
                <button type="button" aria-label="Delete deduction" onClick={() => setRows((l) => l.filter((x) => x.id !== d.id))} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.15rem', lineHeight: 1, cursor: 'pointer' }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

// Thu nhập việc ngoài (extra income): flat-fee side jobs, kept OUT of the hourly
// formula. Unreceived amounts stay pending and roll into the period they land in.
function ExtraIncomeModal({ lang, onClose }) {
  const { Modal, TextField, Button, EmptyState, Badge, StatTile } = NS_T
  const [rows, setRows] = React.useState(EXTRA_INCOME)
  const [desc, setDesc] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [date, setDate] = React.useState(TODAY)
  const [err, setErr] = React.useState(null)
  const L = lang === 'vi'
    ? { title: 'Thu nhập việc ngoài', date: 'Ngày', desc: 'Diễn giải', amount: 'Số tiền', add: '+ Thêm', empty: 'Kỳ này chưa có thu nhập việc ngoài.', received: 'Đã nhận', pending: 'Chưa nhận', mark: '✓ Đã nhận', undo: 'Hoàn lại', sumExtra: 'Thu nhập ngoài', sumPending: 'Đang treo', errAmount: 'Nhập số tiền (> 0).' }
    : { title: 'Extra income', date: 'Date', desc: 'Description', amount: 'Amount', add: '+ Add', empty: 'No extra income in this period yet.', received: 'Received', pending: 'Not received', mark: '✓ Received', undo: 'Undo', sumExtra: 'Extra income', sumPending: 'Pending (held)', errAmount: 'Enter an amount (> 0).' }
  const got = rows.filter((x) => x.received).reduce((a, x) => a + Number(x.amount), 0)
  const pending = rows.filter((x) => !x.received).reduce((a, x) => a + Number(x.amount), 0)
  function add() {
    const n = Number(String(amount).replace(/[^\d]/g, ''))
    if (!n) { setErr(L.errAmount); return }
    setRows((l) => [{ id: Date.now(), date, desc: desc.trim() || '—', amount: n, received: false }, ...l])
    setDesc(''); setAmount(''); setErr(null)
  }
  return (
    <Modal title={L.title} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          <TextField label={L.date} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <TextField label={L.amount} numeric value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500000" error={err} />
        </div>
        <TextField label={L.desc} value={desc} onChange={(e) => setDesc(e.target.value)} />
        <Button variant="primary" fullWidth onClick={add}>{L.add}</Button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <StatTile label={L.sumExtra} value={fmtMoney(got, lang)} variant="pay" />
          <StatTile label={L.sumPending} value={fmtMoney(pending, lang)} />
        </div>
        {rows.length === 0 ? (
          <EmptyState>{L.empty}</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {rows.map((x) => (
              <div key={x.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '0.6rem', background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.7rem', fontSize: 'var(--text-base)' }}>
                <span>
                  {x.desc}
                  {x.received ? <Badge kind="received">{L.received}</Badge> : <Badge kind="planned">{L.pending}</Badge>}
                  <span style={{ display: 'block', color: 'var(--muted)', fontSize: 'var(--text-sm)', fontVariantNumeric: 'var(--numeric)' }}>{dm(x.date)}</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong style={{ color: x.received ? 'var(--pay-positive)' : 'var(--text)', fontVariantNumeric: 'var(--numeric)' }}>{fmtMoney(x.amount, lang)}</strong>
                  <Button variant="link" onClick={() => setRows((l) => l.map((y) => (y.id === x.id ? { ...y, received: !y.received } : y)))}>
                    {x.received ? L.undo : L.mark}
                  </Button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

function AccountModal({ lang, theme, onTheme, onLang, fontScale, onFont, avatar, onAvatar, onClose, onSignOut }) {
  const { Modal, ThemeCycle, FilterTabs, Button, Flag, Avatar, Message } = NS_T
  const LANGS = { vi: 'Tiếng Việt', en: 'English (UK)', us: 'English (US)', au: 'English (AU)' }
  const row = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', fontSize: 'var(--text-base)', color: 'var(--muted)' }
  return (
    <Modal title="Account info" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {Avatar ? <Avatar src={avatar} name={PROFILE.name} size={48} /> : null}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 'var(--weight-bold)' }}>{PROFILE.name}</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', fontVariantNumeric: 'var(--numeric)' }}>{PROFILE.code} · {PROFILE.phone}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
              <Button variant="link" onClick={() => onAvatar(avatar ? null : SAMPLE_AVATAR)}>
                {avatar ? 'Remove photo' : 'Choose photo'}
              </Button>
              <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--muted)' }}>JPG, PNG, WEBP — up to 5MB</span>
            </div>
          </div>
        </div>
        <div style={row}><span>Hourly rate</span><strong style={{ color: 'var(--text)', fontVariantNumeric: 'var(--numeric)' }}>{fmtMoney(PROFILE.hourly, lang)}</strong></div>
        <div style={row}><span>Night supplement</span><strong style={{ color: 'var(--text)', fontVariantNumeric: 'var(--numeric)' }}>+{PROFILE.nightPct}%</strong></div>
        <div style={row}><span>Payday</span><strong style={{ color: 'var(--text)' }}>Day {PROFILE.payday}</strong></div>
        <div style={row}><span>Theme</span><ThemeCycle value={theme} onChange={onTheme} order={['dark', 'glass', 'neumorph']} /></div>
        <div style={row}><span>Language</span><ThemeCycle value={lang} order={['vi', 'en', 'us', 'au']} label={LANGS[lang]} onChange={onLang} icon={Flag ? <Flag code={lang} /> : null} showLabel={false} /></div>
        <div style={row}><span>Text size</span><FilterTabs value={fontScale} onChange={onFont} options={[{ value: 'sm', label: 'S' }, { value: 'md', label: 'M' }, { value: 'lg', label: 'L' }]} /></div>
        <Button variant="cancel" fullWidth onClick={onSignOut}>Sign out</Button>
      </div>
    </Modal>
  )
}

const GUIDE_STEPS = [
  ['Add a shift', 'Pick a date, enter Check-in / Check-out, then press "Add shift".'],
  ['Planned schedule', 'Tools → Import weekly schedule reads a roster from a photo or lets you type it. Future shifts get an amber "Planned" badge; a past day never clocked in shows a red warning.'],
  ['Automatic salary', 'Day hours (06–22h) and night hours (22–06h) use different rates. The month total is in the stats block.'],
  ['Compensation', 'Tools → Compensation adds a period deduction, with a reason.'],
  ['Extra income', 'Tools → Extra income logs side jobs paid as a flat amount, kept out of the hourly maths.'],
  ['Pay period & timesheet', 'Pay period: charts per month, a detailed Excel-style timesheet, and marking salary as received.'],
  ['Salary assistant', 'A draggable bubble. Ask about your pay, or record a shift by chatting; a confirmation card appears before anything is saved.'],
  ['Account & language', 'Account holds your employee code and payday. Language and theme are saved to your account.']
]

function GuideModal({ onClose }) {
  const { Modal, Button } = NS_T
  return (
    <Modal title="Welcome to Salary Working" onClose={onClose}>
      <p style={{ margin: '0 0 0.5rem', color: 'var(--muted)', fontSize: 'var(--text-base)' }}>A few quick steps to get started:</p>
      <ol style={{ listStyle: 'none', margin: '0.5rem 0 1.1rem', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        {GUIDE_STEPS.map(([t, d], i) => (
          <li key={t} style={{ display: 'flex', gap: '0.7rem', alignItems: 'flex-start' }}>
            <span style={{ flex: '0 0 auto', width: '1.4rem', height: '1.4rem', borderRadius: '50%', background: 'var(--panel-2)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)', color: 'var(--accent)', fontVariantNumeric: 'var(--numeric)' }}>{i + 1}</span>
            <span style={{ fontSize: 'var(--text-base)' }}>
              <strong>{t}</strong>
              <span style={{ display: 'block', color: 'var(--muted)', lineHeight: 'var(--leading-normal)' }}>{d}</span>
            </span>
          </li>
        ))}
      </ol>
      <Button variant="primary" fullWidth onClick={onClose}>Get started</Button>
    </Modal>
  )
}

const CHAT_REPLIES = [
  ['3 triệu', 'At your rates, 3,000,000 ₫ needs about 9 night shifts (8h at 33,150 ₫/h) or 12 day shifts. You are 4 night shifts short this period.'],
  ['tuần', 'This week: 24.13 h · 795,900 ₫. One late clock-in on 13/8 cost you 0.10 h (−3,315 ₫).'],
  ['default', 'This period so far: 58.30 h · 1,932,000 ₫ before deductions, 1,732,000 ₫ after. Ask about a week, a date, or how many shifts you need for an amount.']
]

function SalaryChat({ lang, onClose }) {
  const [log, setLog] = React.useState([
    { who: 'bot', text: 'Salary assistant. Ask about your hours, or record a shift by typing it.' },
    { who: 'user', text: 'tuần này tôi được bao nhiêu?' },
    { who: 'bot', text: CHAT_REPLIES[1][1] }
  ])
  const [text, setText] = React.useState('')
  function send(e) {
    e.preventDefault()
    if (!text.trim()) return
    const q = text.trim()
    const hit = CHAT_REPLIES.find(([k]) => k !== 'default' && q.includes(k)) || CHAT_REPLIES[2]
    setLog((l) => [...l, { who: 'user', text: q }, { who: 'bot', text: hit[1] }])
    setText('')
  }
  return (
    <div style={{ position: 'fixed', right: '1rem', bottom: '5.5rem', zIndex: 60, width: 'min(88%, 320px)', height: 'min(62%, 420px)', display: 'flex', flexDirection: 'column', background: 'var(--card-bg)', backgroundImage: 'var(--card-bg-image)', border: 'var(--card-border)', borderRadius: 'var(--radius-lg)', padding: '1rem', boxShadow: '0 14px 44px rgba(0,0,0,0.5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <strong style={{ fontSize: 'var(--text-md)' }}>Salary assistant</strong>
        <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.3rem', lineHeight: 1, cursor: 'pointer' }}>×</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.25rem 0.1rem' }}>
        {log.map((m, i) => (
          <div key={i} style={{
            maxWidth: '85%',
            padding: '0.55rem 0.75rem',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-md)',
            lineHeight: 1.4,
            fontVariantNumeric: 'var(--numeric)',
            alignSelf: m.who === 'bot' ? 'flex-start' : 'flex-end',
            background: m.who === 'bot' ? 'var(--panel-2)' : 'var(--accent)',
            border: m.who === 'bot' ? '1px solid var(--border)' : 'none',
            color: m.who === 'bot' ? 'var(--text)' : '#fff',
            borderBottomLeftRadius: m.who === 'bot' ? 4 : undefined,
            borderBottomRightRadius: m.who === 'bot' ? undefined : 4
          }}>{m.text}</div>
        ))}
      </div>
      <form onSubmit={send} style={{ display: 'flex', gap: '0.45rem', marginTop: '0.6rem' }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about your pay…" style={{ flex: 1, minWidth: 0, font: 'inherit', background: 'var(--input-bg)', border: 'var(--input-border)', boxShadow: 'var(--input-shadow)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.6rem', color: 'var(--text)' }} />
        <button type="submit" style={{ flex: '0 0 auto', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', font: 'inherit', fontWeight: 'var(--weight-semibold)', padding: '0.5rem 0.8rem', cursor: 'pointer' }}>Send</button>
      </form>
    </div>
  )
}

Object.assign(window, { ToolsSheet, ScheduleImportModal, ReconcileModal, DeductionsModal, ExtraIncomeModal, AccountModal, GuideModal, SalaryChat, IMPORT_ROWS, GUIDE_STEPS, RECONCILE_ROWS })
