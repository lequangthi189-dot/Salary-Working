import { useState } from 'react'
import {
  computeEffective,
  formatHours,
  formatMoney,
  formatLost,
} from '../lib/shiftMath.js'
import TimeInput from './TimeInput.jsx'
import Checkbox from './Checkbox.jsx'
import ConfirmModal from './ConfirmModal.jsx'
import { localTodayStr } from '../lib/payPeriod.js'
import { useI18n } from '../lib/i18n.jsx'

function hhmm(v) {
  return v ? String(v).slice(0, 5) : '' // "HH:MM:SS" -> "HH:MM"
}

export default function ShiftCard({ shift, onDelete, onUpdate }) {
  const { t } = useI18n()
  const [editing, setEditing] = useState(false)
  const [workDate, setWorkDate] = useState(shift.work_date)
  const [start, setStart] = useState(hhmm(shift.start_time))
  const [end, setEnd] = useState(hhmm(shift.end_time))
  const [schedStart, setSchedStart] = useState(hhmm(shift.scheduled_start))
  const [schedEnd, setSchedEnd] = useState(hhmm(shift.scheduled_end))
  const [isHoliday, setIsHoliday] = useState(!!shift.is_holiday)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function cancel() {
    setWorkDate(shift.work_date)
    setStart(hhmm(shift.start_time))
    setEnd(hhmm(shift.end_time))
    setSchedStart(hhmm(shift.scheduled_start))
    setSchedEnd(hhmm(shift.scheduled_end))
    setIsHoliday(!!shift.is_holiday)
    setError(null)
    setEditing(false)
  }

  // Nút "Lưu" CHỈ cập nhật ca đang sửa theo đúng id của nó. Không thêm/insert ca mới
  // (việc thêm ca là chức năng riêng ở ShiftForm). Kiểm tra chồng giờ chạy trong
  // updateShift (controller) TRƯỚC khi ghi DB và trả lỗi để hiện tại đây.
  async function save() {
    setBusy(true)
    setError(null)
    const err = await onUpdate(shift.id, {
      work_date: workDate,
      start_time: start || null,
      end_time: end || null,
      scheduled_start: schedStart || null,
      scheduled_end: schedEnd || null,
      is_holiday: isHoliday,
    })
    setBusy(false)
    if (err) setError(err)
    else setEditing(false)
  }

  if (editing) {
    const preview = computeEffective(schedStart, schedEnd, start, end, isHoliday)
    return (
      <div className="shift-card editing">
        <div className="edit-fields">
          <input
            type="date"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
          />
          <label className="edit-time">
            <span>{t('shiftCard.in')}</span>
            <TimeInput
              className="t-in"
              title={t('time.checkinReal')}
              value={start}
              onChange={setStart}
            />
          </label>
          <label className="edit-time">
            <span>{t('shiftCard.out')}</span>
            <TimeInput
              className="t-out"
              title={t('time.checkoutReal')}
              value={end}
              onChange={setEnd}
            />
          </label>
          <label className="edit-time">
            <span>{t('shiftCard.schedIn')}</span>
            <TimeInput
              className="t-sched"
              title={t('time.schedInMark')}
              value={schedStart}
              onChange={setSchedStart}
            />
          </label>
          <label className="edit-time">
            <span>{t('shiftCard.schedOut')}</span>
            <TimeInput
              className="t-sched"
              title={t('time.schedOutMark')}
              value={schedEnd}
              onChange={setSchedEnd}
            />
          </label>
          <Checkbox
            className="edit-holiday"
            checked={isHoliday}
            onChange={(e) => setIsHoliday(e.target.checked)}
            label={t('shiftForm.holiday')}
          />
          <span className="muted">
            {formatHours(preview.decimalHours)}h · {formatMoney(preview.pay)}
          </span>
        </div>
        <div className="edit-actions">
          <button type="button" className="btn-save" onClick={save} disabled={busy}>
            {busy ? '…' : t('common.save')}
          </button>
          <button type="button" className="btn-cancel" onClick={cancel}>
            {t('common.cancel')}
          </button>
        </div>
        {error && <p className="msg error">{error}</p>}
      </div>
    )
  }

  const s = hhmm(shift.start_time)
  const e = hhmm(shift.end_time)
  const eff = computeEffective(
    hhmm(shift.scheduled_start),
    hhmm(shift.scheduled_end),
    s,
    e,
    !!shift.is_holiday
  )
  const { pay } = eff
  const schedS = hhmm(shift.scheduled_start)
  const schedE = hhmm(shift.scheduled_end)
  // Giờ trễ = TỔNG so với lịch dự kiến (cả phần ngày lẫn đêm, cả vào trễ lẫn ra sớm).
  // KHÔNG lọc theo loại ca — nếu trễ rơi vào khung giờ khác vẫn phải hiện.
  const lostHours = eff.lostHours
  const lateInHours = eff.lateIn.hours // vào trễ
  const earlyOutHours = eff.earlyOut.hours // ra sớm
  // Ca mới nhập từ lịch (chưa check-in/out) → hiện lịch dự kiến + nhãn "chưa check-in".
  const noActual = !s || !e

  // Ca chưa chấm công:
  //  - TƯƠNG LAI (> hôm nay) = lịch dự kiến → amber.
  //  - ĐÃ QUA (< hôm nay) mà chưa chấm = QUÁ HẠN → cảnh báo đỏ rõ.
  //  - HÔM NAY = chưa check-in (đỏ nhẹ, vẫn còn kịp).
  const today = localTodayStr()
  const isPlanned = noActual && shift.work_date > today
  const isOverdue = noActual && shift.work_date < today

  return (
    <div
      className={`shift-card${
        noActual ? (isPlanned ? ' planned' : ' not-checked-in') : ''
      }`}
    >
      <div className="shift-times">
        {noActual ? (
          <>
            <span className="t-in muted">{schedS || '—'}</span>
            <span className="dash"> – </span>
            <span className="t-out muted">{schedE || '—'}</span>
            {isPlanned ? (
              <span className="planned-badge">{t('shiftCard.plannedBadge')}</span>
            ) : isOverdue ? (
              <span className="overdue-badge">{t('shiftCard.overdueBadge')}</span>
            ) : (
              <span className="next-day"> {t('shiftCard.notCheckedIn')}</span>
            )}
          </>
        ) : (
          <>
            <span className="t-in">{s}</span>
            <span className="dash"> – </span>
            <span className="t-out">{e}</span>
          </>
        )}
      </div>
      <div className="shift-breakdown">
        {lostHours > 0 && (
          <span className="lost" title={formatLost(eff) || undefined}>
            {t('timesheet.late')} {formatHours(lostHours)}h
            {(lateInHours > 0 || earlyOutHours > 0) && (
              <span className="lost-detail">
                {lateInHours > 0 &&
                  t('shiftCard.lateIn', { h: formatHours(lateInHours) })}
                {earlyOutHours > 0 &&
                  t('shiftCard.earlyOut', { h: formatHours(earlyOutHours) })}
              </span>
            )}
          </span>
        )}
      </div>
      <div className="shift-pay">{formatMoney(pay)}</div>
      <div className="shift-actions">
        <button
          type="button"
          className="edit"
          onClick={() => setEditing(true)}
          aria-label={t('shiftCard.editAria')}
        >
          ✎
        </button>
        <button
          type="button"
          className="delete"
          onClick={() => setConfirmDelete(true)}
          aria-label={t('shiftCard.deleteAria')}
        >
          ×
        </button>
      </div>
      {confirmDelete && (
        <ConfirmModal
          message={t('shiftCard.deleteConfirm')}
          onResult={(ok) => {
            setConfirmDelete(false)
            if (ok) onDelete(shift.id)
          }}
        />
      )}
    </div>
  )
}
