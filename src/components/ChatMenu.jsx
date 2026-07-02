import { useState } from 'react'
import { useI18n } from '../lib/i18n.jsx'

// MENU "Chức năng" trong khung chat: 2 nhóm nút gom vào 2 DROPDOWN (accordion).
// Mặc định CẢ HAI đóng cho gọn; bấm tiêu đề mới xổ. Mở nhóm này TỰ đóng nhóm kia
// (chỉ 1 mở tại một thời điểm). Bấm 1 mục → gọi callback GIỮ NGUYÊN (onQuick/onTool)
// rồi tự thu dropdown. Hành động của từng mục không đổi — chỉ đổi cách bày.
export default function ChatMenu({ onQuick, onTool }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(null) // 'quick' | 'tools' | null (mặc định đóng)

  // Nhóm 1 — XEM NHANH (giữ nguyên key → quickAction xử lý y như trước).
  const quick = [
    { key: 'timesheet', label: t('chat.qTimesheet') },
    { key: 'planned', label: t('chat.qPlanned') },
    { key: 'deductions', label: t('chat.qDeductions') },
    { key: 'extra', label: t('chat.qExtra') },
  ]
  // Nhóm 2 — MỞ CÔNG CỤ (giữ nguyên key → openTool xử lý y như trước).
  const tools = [
    { key: 'import', label: t('nav.importWeek') },
    { key: 'reconcile', label: t('reconcile.title') },
    { key: 'deductions', label: t('nav.deductions') },
    { key: 'extra', label: t('nav.extraIncome') },
    { key: 'payPeriod', label: t('nav.payPeriod') },
    { key: 'profile', label: t('nav.account') },
    { key: 'guide', label: t('nav.guide') },
  ]

  const toggle = (id) => setOpen((cur) => (cur === id ? null : id))

  function renderGroup(id, title, items, onPick) {
    const isOpen = open === id
    return (
      <div className={`chat-dd${isOpen ? ' is-open' : ''}`}>
        <button
          type="button"
          className="chat-dd-head"
          aria-expanded={isOpen}
          onClick={() => toggle(id)}
        >
          <span>{title}</span>
          <span className="chat-dd-arrow" aria-hidden="true">
            ▼
          </span>
        </button>
        <div className="chat-dd-panel">
          <div className="chat-choice-btns chat-dd-items">
            {items.map((it) => (
              <button
                key={it.key}
                type="button"
                onClick={() => {
                  onPick(it.key)
                  setOpen(null) // bấm mục xong → thu dropdown cho gọn
                }}
              >
                {it.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-menu">
      <div className="chat-confirm-line">{t('chat.menuTitle')}</div>
      {renderGroup('quick', t('chat.menuQuick'), quick, onQuick)}
      {renderGroup('tools', t('chat.menuTools'), tools, onTool)}
    </div>
  )
}
