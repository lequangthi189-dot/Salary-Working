import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  formatMoney,
  formatHours,
  computeEffective,
  shiftTotals,
  hhmm,
} from '../lib/shiftMath.js'
import {
  payPeriodKeyOf,
  payPeriodLabel,
  localTodayStr,
  sumDeductions,
} from '../lib/payPeriod.js'

// Bỏ dấu + đ→d + thường hoá, để khớp lệnh dù gõ có dấu hay không.
function deaccent(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
}

// Đọc số tiền VND từ chuỗi: "200k"/"200 nghìn"→200000, "2tr"/"2 triệu"→2000000,
// "200000"→200000. Số trần (không đơn vị) phải ≥ 1000 mới coi là tiền (tránh nhầm ngày).
function parseAmountVnd(s) {
  const m = s.match(/(\d[\d.]*)\s*(trieu|tr|nghin|ngan|k)?/)
  if (!m) return null
  let n = Number(m[1].replace(/\./g, ''))
  if (!Number.isFinite(n) || n <= 0) return null
  const unit = m[2]
  if (unit === 'trieu' || unit === 'tr') n *= 1000000
  else if (unit === 'nghin' || unit === 'ngan' || unit === 'k') n *= 1000
  else if (n < 1000) return null
  return Math.round(n)
}
import { useI18n } from '../lib/i18n.jsx'
import TimesheetTable from './TimesheetTable.jsx'

function pad2(n) {
  return String(n).padStart(2, '0')
}

// Thứ 2 (đầu tuần) của tuần chứa ngày — giống TimesheetTable để đánh số tuần khớp.
function mondayOf(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dow = (dt.getDay() + 6) % 7
  dt.setDate(dt.getDate() - dow)
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`
}

// Cộng n ngày vào "YYYY-MM-DD" (theo lịch địa phương).
function addDaysStr(dateStr, n) {
  const [y, m, d] = String(dateStr).split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`
}

// "YYYY-MM-DD" -> "DD/MM/YYYY"
function dmy(d) {
  const [y, m, dd] = String(d).split('-')
  return `${dd}/${m}/${y}`
}

// Nhận diện yêu cầu xem BẢNG CÔNG theo tháng (và tuần tuỳ chọn). Bỏ dấu để khớp
// "bảng công tháng 3 tuần 2" dù gõ có dấu hay không. Trả {month, week, year} hoặc null.
function parseTimesheetReq(msg) {
  const norm = msg
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
  if (!/(bang cong|bang cham cong|timesheet)/.test(norm)) return null
  const m = norm.match(/thang\s*(\d{1,2})/)
  if (!m) return null
  const month = Number(m[1])
  if (month < 1 || month > 12) return null
  const w = norm.match(/tuan\s*(\d{1,2})/)
  const y = norm.match(/(20\d{2})/)
  return { month, week: w ? Number(w[1]) : null, year: y ? Number(y[1]) : null }
}

// Nhận diện yêu cầu hỏi MỘT NGÀY cụ thể: "10/6", "10-6-2026", hoặc "ngày 10 tháng 6".
// Trả "YYYY-MM-DD" hoặc null. (Mặc định năm hiện tại nếu không ghi.)
function parseDayReq(msg, adjustPast = true) {
  const norm = msg
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
  let m = norm.match(/\b(\d{1,2})\s*[/-]\s*(\d{1,2})(?:\s*[/-]\s*(\d{2,4}))?\b/)
  if (!m) m = norm.match(/ngay\s*(\d{1,2})\s*thang\s*(\d{1,2})(?:\D*?(\d{4}))?/)
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2])
  if (day < 1 || day > 31 || month < 1 || month > 12) return null
  let year = m[3] ? Number(m[3]) : null
  if (year && year < 100) year += 2000
  if (!year) {
    // Không ghi năm → mặc định năm nay. Với CÂU HỎI (adjustPast), nếu ngày suy ra
    // ở TƯƠNG LAI thì hiểu là năm trước (lần gần nhất đã qua). Với THÊM CA thì giữ
    // năm nay để ngày tương lai vẫn là tương lai (→ lịch dự kiến).
    const now = new Date()
    year = now.getFullYear()
    if (adjustPast && new Date(year, month - 1, day) > now) year -= 1
  }
  return `${year}-${pad2(month)}-${pad2(day)}`
}

// Tìm tối đa 2 mốc giờ trong câu: "22:00", "22h", "22h30", "9h", "06:00".
function findTimes(s) {
  const re = /(\d{1,2})\s*(?::|h|gio)\s*(\d{2})?/g
  const out = []
  let m
  while ((m = re.exec(s)) && out.length < 2) {
    const hh = Number(m[1])
    const mm = m[2] ? Number(m[2]) : 0
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) out.push(`${pad2(hh)}:${pad2(mm)}`)
  }
  return out
}

// Yêu cầu THÊM CA: "thêm ca ngày 15/6 22:00 đến 06:00". Cần từ khoá + ngày + 2 mốc
// giờ. Ngày tương lai → trả về để lưu thành lịch dự kiến.
function parseAddShift(msg) {
  const s = deaccent(msg)
  if (!/(them ca|tao ca|them lich|dang ky ca|add shift)/.test(s)) return null
  const date = parseDayReq(msg, false)
  if (!date) return null
  const times = findTimes(s)
  if (times.length < 2) return null
  return { date, start: times[0], end: times[1] }
}

// Yêu cầu THÊM khoản trừ: cần từ khoá "trừ/bồi thường" + số tiền (≥1000 hoặc có
// đơn vị) + lý do (sau "lý do"/"vì"/"do"). Ngày tuỳ chọn (mặc định hôm nay).
function parseDeductionAdd(msg) {
  const s = deaccent(msg)
  if (!/(tru|boi thuong|khau tru)/.test(s)) return null
  const amount = parseAmountVnd(s)
  if (!amount) return null
  const rm = s.match(/(?:ly do|vi|do)\s+(.+)/)
  if (!rm) return null
  let reason = rm[1].replace(/\s*ngay\s*\d.*$/, '').trim()
  if (!reason) return null
  const date = parseDayReq(msg) || localTodayStr()
  return { amount, reason, date }
}

// Yêu cầu TRA CỨU khoản trừ của một kỳ (tháng). Không có tháng → kỳ hiện tại.
function parseDeductionQuery(msg) {
  const s = deaccent(msg)
  if (!/(tru|boi thuong|khau tru)/.test(s)) return null
  const m = s.match(/thang\s*(\d{1,2})/)
  const y = s.match(/(20\d{2})/)
  return { month: m ? Number(m[1]) : null, year: y ? Number(y[1]) : null }
}

// Yêu cầu xem LỊCH DỰ KIẾN tuần này.
function parsePlannedReq(msg) {
  const s = deaccent(msg)
  if (/lich du kien|lich tuan nay|tuan nay co lich|lich.*tuan nay/.test(s)) {
    return { scope: 'week' }
  }
  return null
}

// Trợ lý lương: AI hiểu câu hỏi + diễn đạt; phép TÍNH số ca cần làm do CODE tính
// (chính xác) dựa trên số liệu lịch sử (snapshot). Bảng công / chi tiết ngày /
// bồi thường / lịch dự kiến đều xử lý tại client từ dữ liệu (không gọi AI).
export default function SalaryChat({
  snapshot,
  shifts = [],
  deductions = [],
  onAddDeduction,
  onAddShift,
  onOpenImport,
  onOpenReconcile,
  onClose,
}) {
  const { t, lang } = useI18n()
  const [messages, setMessages] = useState([
    { role: 'bot', text: t('chat.intro') },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight)
  }, [messages, busy])

  // Tính số GIỜ cần làm để đạt mục tiêu, dựa trên LƯƠNG 1 GIỜ (đơn giá ngày/đêm) —
  // CODE tính, không để AI tính. Trả về: cần ~X giờ nếu làm toàn ca ngày, ~Y giờ nếu
  // làm toàn ca đêm (đêm trả cao hơn → cần ít giờ hơn), hoặc kết hợp (tổng giờ nằm giữa).
  function buildEstimate(target) {
    const cur = snapshot.currentPay || 0
    const remaining = Math.max(0, target - cur)
    if (remaining <= 0)
      return t('chat.alreadyReached', { target: formatMoney(target) })
    const dayRate = snapshot.dayRate || 0
    if (!dayRate) return t('chat.noRate')

    const ceil1 = (h) => Math.ceil(h * 10) / 10 // làm tròn LÊN 0.1h để đủ mục tiêu
    const nightRate = snapshot.nightRate || 0
    const hasNight = snapshot.hasNightShift && nightRate > dayRate

    const lines = [
      t('chat.estHeader', {
        target: formatMoney(target),
        current: formatMoney(cur),
        remaining: formatMoney(remaining),
      }),
      t('chat.estDayLine', {
        rate: formatMoney(dayRate),
        hours: ceil1(remaining / dayRate),
      }),
    ]
    if (hasNight) {
      lines.push(
        t('chat.estNightLine', {
          rate: formatMoney(nightRate),
          hours: ceil1(remaining / nightRate),
        })
      )
      lines.push(t('chat.estMix'))
    }
    return lines.join('\n')
  }

  // Xuất bảng công cho 1 kỳ (tháng) hoặc 1 tuần trong kỳ — render TimesheetTable
  // ngay trong khung chat. Tuần bắt đầu Thứ 2, đánh số theo ca đã chấm công.
  function handleTimesheet({ month, week, year }) {
    const key = `${year || new Date().getFullYear()}-${pad2(month)}`
    const periodShifts = (shifts || []).filter(
      (s) => payPeriodKeyOf(s.work_date) === key
    )
    const checkedIn = periodShifts.filter((s) => s.start_time)
    if (checkedIn.length === 0) {
      setMessages((m) => [
        ...m,
        { role: 'bot', text: t('chat.tsEmpty', { label: payPeriodLabel(key) }) },
      ])
      return
    }
    let chosen = periodShifts
    let label = payPeriodLabel(key)
    if (week) {
      const mondays = [...new Set(checkedIn.map((s) => mondayOf(s.work_date)))].sort()
      const mon = mondays[week - 1]
      if (!mon) {
        setMessages((m) => [
          ...m,
          { role: 'bot', text: t('chat.tsNoWeek', { week, label }) },
        ])
        return
      }
      chosen = periodShifts.filter((s) => mondayOf(s.work_date) === mon)
      label = `${label} · ${t('tt.week', { n: week })}`
    }
    setMessages((m) => [
      ...m,
      {
        role: 'bot',
        node: (
          <div className="chat-ts">
            <div className="chat-ts-title">{t('chat.tsTitle', { label })}</div>
            <TimesheetTable shifts={chosen} />
          </div>
        ),
      },
    ])
  }

  // Trả lời chi tiết MỘT NGÀY: có ca không, giờ vào/ra, làm mấy giờ, lương.
  function handleDay(date) {
    const dmy = (d) => {
      const [y, m, dd] = d.split('-')
      return `${dd}/${m}/${y}`
    }
    const rows = (shifts || []).filter((s) => s.work_date === date)
    if (rows.length === 0) {
      setMessages((m) => [
        ...m,
        { role: 'bot', text: t('chat.dayNone', { date: dmy(date) }) },
      ])
      return
    }
    const worked = rows.filter((s) => s.start_time)
    if (worked.length === 0) {
      const s = rows.find((x) => x.scheduled_start) || rows[0]
      const sched = `${hhmm(s.scheduled_start) || '—'} – ${hhmm(s.scheduled_end) || '—'}`
      setMessages((m) => [
        ...m,
        { role: 'bot', text: t('chat.dayPlanned', { date: dmy(date), sched }) },
      ])
      return
    }
    const lines = [t('chat.dayHeader', { date: dmy(date) })]
    let totH = 0
    let totPay = 0
    for (const s of worked) {
      const eff = computeEffective(
        hhmm(s.scheduled_start),
        hhmm(s.scheduled_end),
        hhmm(s.start_time),
        hhmm(s.end_time),
        !!s.is_holiday
      )
      totH += eff.decimalHours
      totPay += eff.pay
      lines.push(
        t('chat.dayShiftLine', {
          in: hhmm(s.start_time),
          out: hhmm(s.end_time) || '—',
          hours: formatHours(eff.decimalHours),
          pay: formatMoney(eff.pay),
        })
      )
    }
    if (worked.length > 1) {
      lines.push(
        t('chat.dayTotal', { hours: formatHours(totH), pay: formatMoney(totPay) })
      )
    }
    setMessages((m) => [...m, { role: 'bot', text: lines.join('\n') }])
  }

  const bot = (text) => setMessages((m) => [...m, { role: 'bot', text }])

  // THÊM CA qua chat. Ngày TƯƠNG LAI → lưu lịch dự kiến (scheduled_*, chưa chấm
  // công). Ngày hôm nay/quá khứ → lưu ca thực tế (start/end).
  async function handleAddShift({ date, start, end }) {
    if (!onAddShift) return bot(t('chat.error'))
    const future = date > localTodayStr()
    const shift = future
      ? {
          work_date: date,
          start_time: null,
          end_time: null,
          scheduled_start: start,
          scheduled_end: end,
          is_holiday: false,
        }
      : {
          work_date: date,
          start_time: start,
          end_time: end,
          scheduled_start: null,
          scheduled_end: null,
          is_holiday: false,
        }
    setBusy(true)
    const err = await onAddShift(shift)
    setBusy(false)
    if (err) bot(t('chat.addShiftErr', { err }))
    else
      bot(
        t(future ? 'chat.addShiftPlanned' : 'chat.addShiftActual', {
          date: dmy(date),
          start,
          end,
        })
      )
  }

  // THÊM khoản trừ qua chat → ghi DB (period_key suy từ ngày bị trừ).
  async function handleAddDeduction({ amount, reason, date }) {
    if (!onAddDeduction) return bot(t('chat.error'))
    setBusy(true)
    const key = payPeriodKeyOf(date)
    const err = await onAddDeduction(key, amount, reason, date)
    setBusy(false)
    if (err) bot(t('chat.dedAddErr', { err }))
    else
      bot(
        t('chat.dedAdded', {
          amount: formatMoney(amount),
          reason,
          date: dmy(date),
          label: payPeriodLabel(key),
        })
      )
  }

  // TRA CỨU khoản trừ của một kỳ: liệt kê + tổng + thực nhận sau trừ.
  function handleDeductionQuery({ month, year }) {
    const key = month
      ? `${year || new Date().getFullYear()}-${pad2(month)}`
      : payPeriodKeyOf(localTodayStr())
    const label = payPeriodLabel(key)
    const list = (deductions || []).filter((d) => d.period_key === key)
    if (list.length === 0) return bot(t('chat.dedNone', { label }))
    const sorted = [...list].sort((a, b) =>
      String(a.deduct_date).localeCompare(String(b.deduct_date))
    )
    const total = sumDeductions(list)
    const gross = shiftTotals(
      (shifts || []).filter((s) => payPeriodKeyOf(s.work_date) === key)
    ).pay
    const lines = [t('chat.dedHeader', { label, total: formatMoney(total) })]
    for (const d of sorted)
      lines.push(
        t('chat.dedLine', {
          date: dmy(d.deduct_date),
          reason: d.reason || '—',
          amount: formatMoney(d.amount),
        })
      )
    lines.push(t('chat.dedNet', { net: formatMoney(gross - total) }))
    bot(lines.join('\n'))
  }

  // LỊCH DỰ KIẾN tuần này (các ca có scheduled_*).
  function handlePlanned() {
    const mon = mondayOf(localTodayStr())
    const week = new Set(Array.from({ length: 7 }, (_, i) => addDaysStr(mon, i)))
    const planned = (shifts || [])
      .filter((s) => s.scheduled_start && week.has(s.work_date))
      .sort((a, b) => String(a.work_date).localeCompare(String(b.work_date)))
    if (planned.length === 0) return bot(t('chat.plannedNone'))
    const lines = [t('chat.plannedHeader')]
    for (const s of planned)
      lines.push(
        t('chat.plannedLine', {
          date: dmy(s.work_date),
          sched: `${hhmm(s.scheduled_start)}–${hhmm(s.scheduled_end) || '—'}`,
        })
      )
    bot(lines.join('\n'))
  }

  async function send() {
    const msg = input.trim()
    if (!msg || busy) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: msg }])
    const norm = deaccent(msg)

    // Mở công cụ cần ảnh.
    if (/nhap lich/.test(norm) && onOpenImport) {
      bot(t('chat.openImport'))
      onOpenImport()
      return
    }
    if (/doi chieu/.test(norm) && onOpenReconcile) {
      bot(t('chat.openReconcile'))
      onOpenReconcile()
      return
    }
    // Thêm ca (tương lai → lịch dự kiến) — trước hỏi-ngày vì câu có kèm ngày.
    const addReq = parseAddShift(msg)
    if (addReq) {
      await handleAddShift(addReq)
      return
    }
    // Bồi thường: thêm khoản trừ (ưu tiên trước hỏi-ngày vì câu có thể kèm ngày).
    const dedAdd = parseDeductionAdd(msg)
    if (dedAdd) {
      await handleAddDeduction(dedAdd)
      return
    }
    // Bồi thường: tra cứu khoản trừ theo kỳ.
    const dedQ = parseDeductionQuery(msg)
    if (dedQ) {
      handleDeductionQuery(dedQ)
      return
    }
    // Yêu cầu bảng công → xử lý tại client từ shifts, không gọi AI.
    const tsReq = parseTimesheetReq(msg)
    if (tsReq) {
      handleTimesheet(tsReq)
      return
    }
    // Hỏi về một ngày cụ thể (có slash/dash) → trả lời chi tiết ngày đó.
    const dayReq = parseDayReq(msg)
    if (dayReq) {
      handleDay(dayReq)
      return
    }
    // Lịch dự kiến tuần này.
    if (parsePlannedReq(msg)) {
      handlePlanned()
      return
    }

    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('salary-chat', {
        body: { message: msg, lang, snapshot },
      })
      if (error || data?.error) throw new Error(data?.error || error.message)
      let text = data.reply || ''
      const target = parseInt(String(data.target || '').replace(/\D/g, ''), 10)
      if (Number.isFinite(target) && target > 0) {
        text = `${text}\n\n${buildEstimate(target)}`.trim()
      }
      setMessages((m) => [...m, { role: 'bot', text }])
    } catch {
      setMessages((m) => [...m, { role: 'bot', text: t('chat.error') }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay comp-fade" onClick={onClose}>
      <div
        className="modal-card chat-card comp-pop"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>🤖 {t('chat.title')}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>

        <div className="chat-list" ref={listRef}>
          {messages.map((m, i) => (
            <div
              key={i}
              className={`chat-msg chat-${m.role}${m.node ? ' chat-table' : ''}`}
            >
              {m.node || m.text}
            </div>
          ))}
          {busy && <div className="chat-msg chat-bot chat-typing">…</div>}
        </div>

        <div className="chat-input">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={t('chat.placeholder')}
          />
          <button type="button" onClick={send} disabled={busy || !input.trim()}>
            {t('chat.send')}
          </button>
        </div>
      </div>
    </div>
  )
}
