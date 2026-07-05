import { useState } from 'react'
import ChangePasswordModal from './ChangePasswordModal.jsx'
import { Skeleton, SkeletonText, SkeletonCircle } from './Skeleton.jsx'
import { formatMoney } from '../lib/shiftMath.js'
import { listAccounts, removeAccount } from '../lib/accounts.js'
import { useI18n } from '../lib/i18n.jsx'

// Skeleton trang Tài khoản: avatar tròn + tên, rồi các dòng thông tin (nhãn + giá trị).
function ProfileSkeleton() {
  const { t } = useI18n()
  return (
    <div
      className="profile-skeleton"
      role="status"
      aria-busy="true"
      aria-label={t('common.loading')}
    >
      <div className="profile-skeleton__head">
        <SkeletonCircle size={64} />
        <div className="profile-skeleton__id">
          <SkeletonText width="9rem" />
          <SkeletonText width="6rem" />
        </div>
      </div>
      <div className="profile-skeleton__list">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="profile-skeleton__row">
            <Skeleton width="4.5rem" height="0.85rem" />
            <SkeletonText width={i % 2 ? '55%' : '75%'} />
          </div>
        ))}
      </div>
    </div>
  )
}

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
  loading = false,
  error,
  payday,
  onSavePayday,
  onSaveField,
  onClose,
  onSignOut,
  onSwitchAccount,
  onAddAccount,
}) {
  const { t } = useI18n()
  const email = user.email || '—'
  const fullName =
    profile?.full_name ||
    `${profile?.last_name || ''} ${profile?.first_name || ''}`.trim()
  const pct = (v) => (v != null ? `${v}%` : '—')
  const hasNight = profile?.has_night_shift !== false

  const [accounts, setAccounts] = useState(() => listAccounts())
  const [switching, setSwitching] = useState(false)
  const otherAccounts = accounts.filter((a) => a.id !== user.id)

  async function switchTo(acc) {
    setSwitching(true)
    const err = await onSwitchAccount(acc.refresh_token)
    setSwitching(false)
    if (err) alert(err) // token hết hạn → cần đăng nhập lại tài khoản đó
  }
  function forget(id) {
    removeAccount(id)
    setAccounts(listAccounts())
  }

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

  // Đang tải hồ sơ lần đầu → skeleton; lỗi tải → thông báo (không kẹt skeleton).
  if (loading || error) {
    return (
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
          {loading ? <ProfileSkeleton /> : <p className="msg error">{error}</p>}
        </div>
      </div>
    )
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
            {hasNight && (
              <EditableRow
                label={t('profile.nightPct')}
                display={pct(profile?.night_pct)}
                initial={profile?.night_pct ?? ''}
                type="number"
                onSave={(v) => onSaveField({ night_pct: v })}
              />
            )}
            <EditableRow
              label={t('profile.holidayDayPct')}
              display={pct(profile?.holiday_day_pct)}
              initial={profile?.holiday_day_pct ?? ''}
              type="number"
              onSave={(v) => onSaveField({ holiday_day_pct: v })}
            />
            {hasNight && (
              <EditableRow
                label={t('profile.holidayNightPct')}
                display={pct(profile?.holiday_night_pct)}
                initial={profile?.holiday_night_pct ?? ''}
                type="number"
                onSave={(v) => onSaveField({ holiday_night_pct: v })}
              />
            )}
            <EditableRow
              label={t('profile.hasNightShift')}
              display={profile?.has_night_shift ? t('common.yes') : t('common.no')}
              initial={!!profile?.has_night_shift}
              type="bool"
              onSave={(v) => onSaveField({ has_night_shift: v })}
            />
          </dl>

          {/* Chuyển tài khoản: danh sách tài khoản đã lưu trên máy + thêm mới */}
          {onSwitchAccount && (
            <div className="acct-switch">
              <span className="acct-switch-title">{t('profile.switchAccount')}</span>
              {otherAccounts.map((a) => (
                <div key={a.id} className="acct-row">
                  <button
                    type="button"
                    className="acct-pick"
                    onClick={() => switchTo(a)}
                    disabled={switching}
                  >
                    <span className="acct-name">{a.name || a.email}</span>
                    <span className="acct-email">{a.email}</span>
                  </button>
                  <button
                    type="button"
                    className="acct-forget"
                    onClick={() => forget(a.id)}
                    title={t('profile.forgetAccount')}
                    aria-label={t('profile.forgetAccount')}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="account-btn acct-add"
                onClick={onAddAccount}
              >
                {t('profile.addAccount')}
              </button>
            </div>
          )}

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
