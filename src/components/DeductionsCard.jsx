import { useState } from 'react'
import { formatMoney } from '../lib/shiftMath.js'
import { sumDeductions, localTodayStr } from '../lib/payPeriod.js'

// "2025-06-05" -> "05/06/2025"
function fmtDate(d) {
  if (!d) return ''
  const [y, m, day] = String(d).split('-')
  return `${day}/${m}/${y}`
}

// Card "mở rộng" cho các khoản BỊ TRỪ của một kỳ lương.
// - Hiện tổng tiền bị trừ; bấm để mở/đóng phần chi tiết.
// - Trong phần chi tiết: danh sách khoản trừ (số tiền + lý do), nút xóa,
//   ô nhập để thêm khoản mới, và dòng "Thực nhận" = grossPay − tổng trừ (CÓ THỂ ÂM).
//
// Props:
//   periodKey  — kỳ lương ("YYYY-MM") mà các khoản trừ này thuộc về.
//   deductions — mảng { id, amount, reason } của kỳ này.
//   grossPay   — tổng lương ca của kỳ (trước khi trừ); để tính thực nhận.
//   onAdd(periodKey, amount, reason) => Promise<errMsg|null>
//   onDelete(id) => void
//   defaultOpen — mở sẵn phần chi tiết hay không.
export default function DeductionsCard({
  periodKey,
  deductions = [],
  grossPay = 0,
  onAdd,
  onDelete,
  defaultOpen = false,
  // embedded = đặt trong popup: luôn mở, không hiện thanh tiêu đề gập/mở.
  embedded = false,
}) {
  const [open, setOpen] = useState(defaultOpen)
  const isOpen = embedded || open
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [date, setDate] = useState(localTodayStr())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const total = sumDeductions(deductions)
  const net = grossPay - total

  async function add() {
    setError(null)
    const amt = Math.round(Number(amount))
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Nhập số tiền bị trừ (> 0).')
      return
    }
    if (!reason.trim()) {
      setError('Phải ghi lý do bị trừ.')
      return
    }
    if (!date) {
      setError('Chọn ngày bị trừ.')
      return
    }
    setBusy(true)
    const err = await onAdd(periodKey, amt, reason.trim(), date)
    setBusy(false)
    if (err) {
      setError(err)
      return
    }
    setAmount('')
    setReason('')
    setDate(localTodayStr())
  }

  return (
    <div className={`deduction-card${isOpen ? ' open' : ''}`}>
      {!embedded && (
        <button
          type="button"
          className="deduction-head"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className="deduction-title">
            <span className="caret">{open ? '▾' : '▸'}</span> Tiền bồi thường
          </span>
          <strong className="deduction-total">
            {total > 0 ? `−${formatMoney(total)}` : formatMoney(0)}
          </strong>
        </button>
      )}

      {isOpen && (
        <div className="deduction-body">
          {/* Ô nhập: số tiền + lý do (bắt buộc) + ngày bị trừ */}
          <div className="deduction-add">
            <input
              type="number"
              min="0"
              step="1000"
              inputMode="numeric"
              placeholder="Số tiền"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <input
              type="text"
              placeholder="Lý do (bắt buộc)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') add()
              }}
            />
            <input
              type="date"
              className="deduction-date-in"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Ngày bị trừ"
            />
            <button
              type="button"
              className="deduction-add-btn"
              onClick={add}
              disabled={busy}
            >
              {busy ? '…' : '+ Thêm'}
            </button>
          </div>
          {error && <p className="msg error sm">{error}</p>}

          {/* Thực nhận sau trừ — đặt ngay kế khu nhập để thấy số liền tay */}
          <div className="deduction-net">
            <span>Thực nhận sau trừ</span>
            <strong className={net < 0 ? 'neg' : ''}>{formatMoney(net)}</strong>
          </div>

          {/* Danh sách khoản trừ — hiện DƯỚI ô nhập, mỗi khoản là card bo góc */}
          {deductions.length === 0 ? (
            <p className="muted sm">Chưa có khoản trừ nào trong kỳ này.</p>
          ) : (
            <ul className="deduction-list">
              {deductions.map((d) => (
                <li key={d.id} className="deduction-item">
                  <div className="deduction-item-main">
                    <span className="deduction-amt">−{formatMoney(d.amount)}</span>
                    <span className="deduction-reason">{d.reason}</span>
                  </div>
                  <span className="deduction-date">{fmtDate(d.deduct_date)}</span>
                  <button
                    type="button"
                    className="deduction-del"
                    onClick={() => onDelete(d.id)}
                    aria-label="Xóa khoản trừ"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
