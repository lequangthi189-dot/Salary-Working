import { useState } from 'react'
import ChangePasswordModal from './ChangePasswordModal.jsx'
import { formatMoney } from '../lib/shiftMath.js'
import { useI18n } from '../lib/i18n.jsx'

// Một dòng thông tin có thể chỉnh tại chỗ (Chỉnh → input → Lưu/Hủy).
function EditableRow({ label, display, initial, type = 'text', onSave }) {
  const { t } = useI18n()
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(initial ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function save() {
    setErr(null)
    if (type === 'number' && !Number.isFinite(Number(val))) {
      setErr(t('emp.errRate'))
      return
    }
    let out = val
    if (type === 'number') out = Math.round(Number(val))
    else if (type === 'bool') out = val === true || val === '1'
    else out = String(val).trim()
    setBusy(true)
    const e = await onSave(out)
    setBusy(false)
    if (e) setErr(e)
    else setEditing(false)
  }

  function start() {
    setVal(initial ?? '')
    setErr(null)
    setEditing(true)
  }

  return (
    <>
      <dt>{label}</dt>
      <dd>
        {editing ? (
          <span className="field-edit">
            {type === 'bool' ? (
              <select
                value={val === true || val === '1' ? '1' : '0'}
                onChange={(e) => setVal(e.target.value === '1')}
              >
                <option value="1">{t('common.yes')}</option>
                <option value="0">{t('common.no')}</option>
              </select>
            ) : (
              <input
                type={type}
                value={val}
                onChange={(e) => setVal(e.target.value)}
              />
            )}
            <button type="button" className="link" onClick={save} disabled={busy}>
              {busy ? '…' : t('common.save')}
            </button>
            <button
              type="button"
              className="link"
              onClick={() => {
                setErr(null)
                setEditing(false)
              }}
            >
              {t('common.cancel')}
            </button>
            {err && <span className="msg error sm">{err}</span>}
          </span>
        ) : (
          <span className="field-view">
            <span>{display}</span>
            <button
              type="button"
              className="edit-icon"
              onClick={start}
              title={t('common.edit')}
              aria-label={t('common.edit')}
            >
              ✎
            </button>
          </span>
        )}
      </dd>
    </>
  )
}

// Popup thông tin tài khoản: chỉnh từng trường tại chỗ + đổi mật khẩu + đăng xuất.
export default function ProfileModal({
  user,
  profile,
  payday,
  onSavePayday,
  onSaveField,
  onClose,
  onSignOut,
}) {
  const { t } = useI18n()
  const email = user.email || '—'
  const fullName =
    profile?.full_name ||
    `${profile?.last_name || ''} ${profile?.first_name || ''}`.trim()
  const pct = (v) => (v != null ? `${v}%` : '—')

  const [showChangePw, setShowChangePw] = useState(false)
  const [editPayday, setEditPayday] = useState(false)
  const [day, setDay] = useState(payday || 5)
  const [savingDay, setSavingDay] = useState(false)
  const [paydayErr, setPaydayErr] = useState(null)

  async function savePayday() {
    setSavingDay(true)
    setPaydayErr(null)
    const err = await onSavePayday(day)
    setSavingDay(false)
    if (err) setPaydayErr(err)
    else setEditPayday(false)
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-card"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-head">
            <h2>{t('profile.title')}</h2>
            <button
              type="button"
              className="modal-close"
              onClick={onClose}
              aria-label={t('common.close')}
            >
              ×
            </button>
          </div>

          <dl className="profile-info">
            <EditableRow
              label={t('auth.fullName')}
              display={fullName || '—'}
              initial={fullName}
              onSave={(v) => onSaveField({ full_name: v })}
            />
            <EditableRow
              label={t('profile.empCode')}
              display={profile?.employee_code || '—'}
              initial={profile?.employee_code || ''}
              onSave={(v) => onSaveField({ employee_code: v })}
            />
            <dt>{t('auth.email')}</dt>
            <dd>{email}</dd>
            <EditableRow
              label={t('auth.phone')}
              display={profile?.phone || '—'}
              initial={profile?.phone || ''}
              onSave={(v) => onSaveField({ phone: v })}
            />

            <dt>{t('profile.payday')}</dt>
            <dd>
              {editPayday ? (
                <span className="payday-edit">
                  <select
                    value={day}
                    onChange={(e) => setDay(Number(e.target.value))}
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="link"
                    onClick={savePayday}
                    disabled={savingDay}
                  >
                    {savingDay ? '…' : t('common.save')}
                  </button>
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      setEditPayday(false)
                      setPaydayErr(null)
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  {paydayErr && <span className="msg error sm">{paydayErr}</span>}
                </span>
              ) : (
                <span className="field-view">
                  <span>{payday ? t('profile.dayN', { n: payday }) : t('common.notSet')}</span>
                  <button
                    type="button"
                    className="edit-icon"
                    onClick={() => {
                      setDay(payday || 5)
                      setEditPayday(true)
                    }}
                    title={t('common.edit')}
                    aria-label={t('common.edit')}
                  >
                    ✎
                  </button>
                </span>
              )}
            </dd>

            <EditableRow
              label={t('profile.hourlyRate')}
              display={
                profile?.hourly_rate != null ? formatMoney(profile.hourly_rate) : '—'
              }
              initial={profile?.hourly_rate ?? ''}
              type="number"
              onSave={(v) => onSaveField({ hourly_rate: v })}
            />
            <EditableRow
              label={t('profile.nightPct')}
              display={pct(profile?.night_pct)}
              initial={profile?.night_pct ?? ''}
              type="number"
              onSave={(v) => onSaveField({ night_pct: v })}
            />
            <EditableRow
              label={t('profile.holidayDayPct')}
              display={pct(profile?.holiday_day_pct)}
              initial={profile?.holiday_day_pct ?? ''}
              type="number"
              onSave={(v) => onSaveField({ holiday_day_pct: v })}
            />
            <EditableRow
              label={t('profile.holidayNightPct')}
              display={pct(profile?.holiday_night_pct)}
              initial={profile?.holiday_night_pct ?? ''}
              type="number"
              onSave={(v) => onSaveField({ holiday_night_pct: v })}
            />
            <EditableRow
              label={t('profile.hasNightShift')}
              display={profile?.has_night_shift ? t('common.yes') : t('common.no')}
              initial={!!profile?.has_night_shift}
              type="bool"
              onSave={(v) => onSaveField({ has_night_shift: v })}
            />
          </dl>

          <div className="profile-actions">
            <button
              type="button"
              className="account-btn signout-btn"
              onClick={onSignOut}
            >
              {t('profile.signOut')}
            </button>
            <button
              type="button"
              className="account-btn change-pw-btn"
              onClick={() => setShowChangePw(true)}
            >
              {t('changePw.title')}
            </button>
          </div>
        </div>
      </div>

      {showChangePw && (
        <ChangePasswordModal user={user} onClose={() => setShowChangePw(false)} />
      )}
    </>
  )
}
