import { useEffect, useState } from 'react'
import { formatMoney } from '../lib/shiftMath.js'
import { payPeriodKeyOf, payPeriodLabel, localTodayStr } from '../lib/payPeriod.js'
import { sumExtraIncome, totalIncome } from '../lib/extraIncome.js'
import { useI18n } from '../lib/i18n.jsx'

// "2025-06-05" -> "05/06/2025"
function fmtDate(d) {
  if (!d) return ''
  const [y, m, day] = String(d).split('-')
  return `${day}/${m}/${y}`
}

// Một dòng khoản việc ngoài: xem / sửa inline / xoá.
function ExtraRow({ item, onUpdate, onDelete }) {
  const { t } = useI18n()
  const [editing, setEditing] = useState(false)
  const [date, setDate] = useState(item.date)
  const [desc, setDesc] = useState(item.description || '')
  const [amount, setAmount] = useState(String(item.amount ?? ''))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const amountDisplay = amount ? Number(amount).toLocaleString('vi-VN') : ''

  function cancel() {
    setDate(item.date)
    setDesc(item.description || '')
    setAmount(String(item.amount ?? ''))
    setError(null)
    setEditing(false)
  }

  async function save() {
    setError(null)
    const amt = Math.round(Number(amount))
    if (!Number.isFinite(amt) || amt <= 0) {
      setError(t('extra.amountErr'))
      return
    }
    if (!date) {
      setError(t('extra.dateErr'))
      return
    }
    setBusy(true)
    const err = await onUpdate(item.id, {
      date,
      description: desc.trim(),
      amount: amt,
    })
    setBusy(false)
    if (err) setError(err)
    else setEditing(false)
  }

  if (editing) {
    return (
      <li className="extra-item editing">
        <div className="extra-edit">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <input
            type="text"
            placeholder={t('extra.desc')}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <input
            type="text"
            inputMode="numeric"
            placeholder={t('extra.amount')}
            value={amountDisplay}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          />
          <div className="extra-edit-actions">
            <button type="button" className="btn-save" onClick={save} disabled={busy}>
              {busy ? '…' : t('common.save')}
            </button>
            <button type="button" className="btn-cancel" onClick={cancel}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
        {error && <p className="msg error sm">{error}</p>}
      </li>
    )
  }

  return (
    <li className="extra-item">
      <div className="extra-item-main">
        <span className="extra-amt">{formatMoney(item.amount)}</span>
        <span className="extra-desc">{item.description}</span>
      </div>
      <span className="extra-date">{fmtDate(item.date)}</span>
      <div className="extra-actions">
        <button
          type="button"
          className="edit"
          onClick={() => setEditing(true)}
          aria-label={t('extra.editAria')}
        >
          ✎
        </button>
        <button
          type="button"
          className="delete"
          onClick={() => onDelete(item.id)}
          aria-label={t('extra.delAria')}
        >
          ×
        </button>
      </div>
    </li>
  )
}

// Popup "Thu nhập việc ngoài": tổng kết (Lương ca / Việc ngoài / Tổng) cho KỲ HIỆN
// TẠI + CRUD các khoản việc ngoài của kỳ. Hoàn toàn tách khỏi tính lương ca.
export default function ExtraIncomeModal({
  periodKey,
  shiftPay = 0,
  extraIncome = [],
  onAdd,
  onUpdate,
  onDelete,
  onClose,
}) {
  const { t } = useI18n()
  const [date, setDate] = useState(localTodayStr())
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Chỉ các khoản thuộc KỲ HIỆN TẠI (theo ngày), mới → cũ.
  const items = extraIncome
    .filter((x) => payPeriodKeyOf(x.date) === periodKey)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
  const extraTotal = sumExtraIncome(items)
  const total = totalIncome(shiftPay, extraTotal)

  const amountDisplay = amount ? Number(amount).toLocaleString('vi-VN') : ''

  async function add() {
    setError(null)
    const amt = Math.round(Number(amount))
    if (!Number.isFinite(amt) || amt <= 0) {
      setError(t('extra.amountErr'))
      return
    }
    if (!date) {
      setError(t('extra.dateErr'))
      return
    }
    setBusy(true)
    const err = await onAdd({ date, description: desc.trim(), amount: amt })
    setBusy(false)
    if (err) {
      setError(err)
      return
    }
    setDate(localTodayStr())
    setDesc('')
    setAmount('')
  }

  return (
    <div className="modal-overlay comp-fade" onClick={onClose}>
      <div
        className="modal-card wide deduction-modal comp-pop"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{t('extra.title')}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>

        {/* Tổng kết kỳ hiện tại: 3 dòng */}
        <div className="extra-summary">
          <span className="extra-summary-period">{payPeriodLabel(periodKey)}</span>
          <div className="extra-summary-row">
            <span>{t('extra.sumShift')}</span>
            <strong>{formatMoney(shiftPay)}</strong>
          </div>
          <div className="extra-summary-row">
            <span>{t('extra.sumExtra')}</span>
            <strong>{formatMoney(extraTotal)}</strong>
          </div>
          <div className="extra-summary-row total">
            <span>{t('extra.sumTotal')}</span>
            <strong>{formatMoney(total)}</strong>
          </div>
        </div>

        {/* Thêm khoản việc ngoài */}
        <div className="extra-add">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label={t('extra.date')}
          />
          <input
            type="text"
            placeholder={t('extra.desc')}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <input
            type="text"
            inputMode="numeric"
            placeholder={t('extra.amount')}
            value={amountDisplay}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button type="button" className="extra-add-btn" onClick={add} disabled={busy}>
            {busy ? '…' : t('extra.add')}
          </button>
        </div>
        {error && <p className="msg error sm">{error}</p>}

        {/* Danh sách khoản việc ngoài của kỳ */}
        {items.length === 0 ? (
          <p className="muted sm">{t('extra.empty')}</p>
        ) : (
          <ul className="extra-list">
            {items.map((it) => (
              <ExtraRow
                key={it.id}
                item={it}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
