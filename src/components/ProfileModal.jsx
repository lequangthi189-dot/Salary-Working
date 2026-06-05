import { useState } from 'react'
import ChangePasswordModal from './ChangePasswordModal.jsx'

// Popup thông tin tài khoản: full name, email, số điện thoại, ngày nhận lương
// + đổi mật khẩu và đăng xuất.
export default function ProfileModal({
  user,
  payday,
  employeeCode: employeeCodeProp,
  onSavePayday,
  onClose,
  onSignOut,
}) {
  const meta = user.user_metadata || {}
  const fullName = meta.full_name || '—'
  const employeeCode = employeeCodeProp || meta.employee_code || '—'
  const email = user.email || '—'
  const phone = meta.phone || user.phone || '—'

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
          <h2>Thông tin tài khoản</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        <dl className="profile-info">
          <dt>Full name</dt>
          <dd>{fullName}</dd>
          <dt>Mã nhân viên</dt>
          <dd>{employeeCode}</dd>
          <dt>Email</dt>
          <dd>{email}</dd>
          <dt>Phone number</dt>
          <dd>{phone}</dd>
          <dt>Ngày nhận lương</dt>
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
                  {savingDay ? '…' : 'Lưu'}
                </button>
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    setEditPayday(false)
                    setPaydayErr(null)
                  }}
                >
                  Hủy
                </button>
                {paydayErr && <span className="msg error">{paydayErr}</span>}
              </span>
            ) : (
              <span className="payday-view">
                {payday ? `Ngày ${payday}` : 'Chưa đặt'}
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    setDay(payday || 5)
                    setEditPayday(true)
                  }}
                >
                  Chỉnh
                </button>
              </span>
            )}
          </dd>
        </dl>

        <div className="profile-actions">
          <button
            type="button"
            className="account-btn signout-btn"
            onClick={onSignOut}
          >
            Sign out
          </button>
          <button
            type="button"
            className="account-btn change-pw-btn"
            onClick={() => setShowChangePw(true)}
          >
            Đổi mật khẩu
          </button>
        </div>
        </div>
      </div>

      {showChangePw && (
        <ChangePasswordModal
          user={user}
          onClose={() => setShowChangePw(false)}
        />
      )}
    </>
  )
}
