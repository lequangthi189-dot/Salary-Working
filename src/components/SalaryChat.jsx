import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { formatMoney } from '../lib/shiftMath.js'
import { payPeriodKeyOf, payPeriodLabel } from '../lib/payPeriod.js'
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

// Trợ lý lương: AI hiểu câu hỏi + diễn đạt; phép TÍNH số ca cần làm do CODE tính
// (chính xác) dựa trên số liệu lịch sử (snapshot). Riêng yêu cầu BẢNG CÔNG được
// xử lý tại client từ `shifts` (không gọi AI).
export default function SalaryChat({ snapshot, shifts = [], onClose }) {
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

  async function send() {
    const msg = input.trim()
    if (!msg || busy) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: msg }])

    // Yêu cầu bảng công → xử lý tại client từ shifts, không gọi AI.
    const tsReq = parseTimesheetReq(msg)
    if (tsReq) {
      handleTimesheet(tsReq)
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
