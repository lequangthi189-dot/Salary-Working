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

  // Tính số ca/giờ cần làm để đạt mục tiêu (CODE, không để AI tính).
  function buildEstimate(target) {
    const cur = snapshot.currentPay || 0
    const remaining = Math.max(0, target - cur)
    if (remaining <= 0) return t('chat.alreadyReached', { target: formatMoney(target) })
    if (!snapshot.avgPerShift) return t('chat.noHistory')
    const shifts = Math.ceil(remaining / snapshot.avgPerShift)
    const hours = snapshot.avgHoursPerShift
      ? Math.round(shifts * snapshot.avgHoursPerShift * 10) / 10
      : '—'
    return t('chat.estimateResult', {
      target: formatMoney(target),
      current: formatMoney(cur),
      remaining: formatMoney(remaining),
      avg: formatMoney(snapshot.avgPerShift),
      shifts,
      hours,
    })
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
