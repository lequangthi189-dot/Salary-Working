import { useState } from 'react'
import ChangePasswordModal from './ChangePasswordModal.jsx'
import { formatMoney } from '../lib/shiftMath.js'
import { listAccounts, removeAccount } from '../lib/accounts.js'
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

// Popup "Thông tin việc làm": gom các thông số dùng để TÍNH LƯƠNG (đều lấy từ hồ
// sơ) — ngày nhận lương, lương 1 giờ, phụ cấp, ca đêm + giờ ca đêm, kỳ tính công.
function JobInfoModal({ profile, payday, onSavePayday, onSaveField, onClose }) {
  const { t } = useI18n()
  const pct = (v) => (v != null ? `${v}%` : '—')
  const hasNight = profile?.has_night_shift !== false

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
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{t('profile.jobInfo')}</h2>
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
                <span>
                  {payday ? t('profile.dayN', { n: payday }) : t('common.notSet')}
                </span>
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
          {hasNight && (
            <EditableRow
              label={t('profile.nightStart')}
              display={(profile?.night_start || '22:00').slice(0, 5)}
              initial={(profile?.night_start || '22:00').slice(0, 5)}
              type="time"
              onSave={(v) => onSaveField({ night_start: v })}
            />
          )}
          {hasNight && (
            <EditableRow
              label={t('profile.nightEnd')}
              display={(profile?.night_end || '06:00').slice(0, 5)}
              initial={(profile?.night_end || '06:00').slice(0, 5)}
              type="time"
              onSave={(v) => onSaveField({ night_end: v })}
            />
          )}
          <EditableRow
            label={t('profile.periodStartDay')}
            display={profile?.period_start_day ?? 26}
            initial={profile?.period_start_day ?? 26}
            type="number"
            onSave={(v) => onSaveField({ period_start_day: v })}
          />
          <EditableRow
            label={t('profile.periodEndDay')}
            display={profile?.period_end_day ?? 25}
            initial={profile?.period_end_day ?? 25}
            type="number"
            onSave={(v) => onSaveField({ period_end_day: v })}
          />
        </dl>
      </div>
    </div>
  )
}

// Phần TÙY BIẾN GIAO DIỆN: cỡ chữ (áp ngay, lưu theo tài khoản).
function AppearanceSection({ fontScale, onChangeFontScale }) {
  const { t } = useI18n()
  const fonts = [
    { key: 'sm', label: t('font.sm') },
    { key: 'md', label: t('font.md') },
    { key: 'lg', label: t('font.lg') },
  ]
  return (
    <div className="appearance-section">
      <span className="appearance-title">{t('appearance.title')}</span>
      <div className="appearance-row">
        <span className="appearance-label">{t('appearance.fontSize')}</span>
        <div className="seg">
          {fonts.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`seg-btn${fontScale === f.key ? ' active' : ''}`}
              onClick={() => onChangeFontScale(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Popup thông tin tài khoản: chỉnh từng trường tại chỗ + đổi mật khẩu + đăng xuất.
// Các thông số việc làm (lương, phụ cấp, ca đêm, kỳ tính công) nằm ở popup riêng.
export default function ProfileModal({
  user,
  profile,
  payday,
  onSavePayday,
  onSaveField,
  onClose,
  onSignOut,
  onSwitchAccount,
  onAddAccount,
  fontScale,
  onChangeFontScale,
}) {
  const { t } = useI18n()
  const email = user.email || '—'
  const fullName =
    profile?.full_name ||
    `${profile?.last_name || ''} ${profile?.first_name || ''}`.trim()

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
  const [showJobInfo, setShowJobInfo] = useState(false)

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
          </dl>

          <AppearanceSection
            fontScale={fontScale}
            onChangeFontScale={onChangeFontScale}
          />

          {/* Thông tin việc làm (lương, phụ cấp, ca đêm, kỳ tính công) trong popup riêng */}
          <button
            type="button"
            className="account-btn"
            onClick={() => setShowJobInfo(true)}
          >
            {t('profile.jobInfo')}
          </button>

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

      {showJobInfo && (
        <JobInfoModal
          profile={profile}
          payday={payday}
          onSavePayday={onSavePayday}
          onSaveField={onSaveField}
          onClose={() => setShowJobInfo(false)}
        />
      )}
    </>
  )
}
