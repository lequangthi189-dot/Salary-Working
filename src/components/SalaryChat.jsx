import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { formatMoney } from '../lib/shiftMath.js'
import { useI18n } from '../lib/i18n.jsx'

// Trợ lý lương: AI hiểu câu hỏi + diễn đạt; phép TÍNH số ca cần làm do CODE tính
// (chính xác) dựa trên số liệu lịch sử (snapshot).
export default function SalaryChat({ snapshot, onClose }) {
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

  async function send() {
    const msg = input.trim()
    if (!msg || busy) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: msg }])
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
            <div key={i} className={`chat-msg chat-${m.role}`}>
              {m.text}
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
