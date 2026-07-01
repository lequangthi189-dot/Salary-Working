import { useRef, useState, useEffect } from 'react'
import { useI18n } from '../lib/i18n.jsx'
import {
  ACCEPT_ATTR,
  validateAvatarFile,
  uploadAvatar,
  formatFileSize,
  fileFormatLabel,
} from '../lib/avatar.js'

// Vòng tiến độ SVG quanh avatar. pct=null → indeterminate (quay tròn 1 cung).
const R = 54
const CIRC = 2 * Math.PI * R

function ProgressRing({ pct }) {
  const indeterminate = pct == null
  // Xác định: cung dài theo %, bắt đầu từ đỉnh (xoay -90°).
  const offset = indeterminate ? CIRC * 0.75 : CIRC * (1 - pct / 100)
  return (
    <svg className="avatar-ring" viewBox="0 0 120 120" aria-hidden="true">
      <circle className="avatar-ring-track" cx="60" cy="60" r={R} />
      <circle
        className={`avatar-ring-bar${indeterminate ? ' spin' : ''}`}
        cx="60"
        cy="60"
        r={R}
        strokeDasharray={CIRC}
        strokeDashoffset={offset}
      />
    </svg>
  )
}

// "Premium upload UI" cho ảnh đại diện: preview tròn + vòng % chạy khi upload, thẻ
// tên/dung lượng/định dạng file, nút Chọn ảnh/Hủy, ghi chú định dạng & giới hạn.
//   userId     — quyết định thư mục ghi trên Storage.
//   currentUrl — avatar_url hiện tại (null → hiện chữ cái đầu).
//   name       — tên đầy đủ (lấy chữ cái đầu làm fallback khi chưa có ảnh).
//   onSave(url)→ lưu avatar_url vào profiles (trả lỗi hoặc null); parent reload.
export default function AvatarUpload({ userId, currentUrl, name, onSave }) {
  const { t } = useI18n()
  const inputRef = useRef(null)
  const abortRef = useRef(null)
  const previewRef = useRef(null) // objectURL để revoke

  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [pct, setPct] = useState(null)
  const [status, setStatus] = useState('idle') // idle | uploading | error
  const [error, setError] = useState(null)

  // Dọn objectURL khi unmount để không rò bộ nhớ.
  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    }
  }, [])

  const initials = (name || '?')
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  function pickFile() {
    setError(null)
    inputRef.current?.click()
  }

  function setPreviewUrl(url) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = url
    setPreview(url)
  }

  function onFileChange(e) {
    const f = e.target.files?.[0]
    e.target.value = '' // cho chọn lại đúng file sau khi Hủy
    if (!f) return
    const errKey = validateAvatarFile(f)
    if (errKey) {
      // Sai loại/quá cỡ → báo lỗi NGAY, KHÔNG upload, KHÔNG đổi preview.
      setError(t(errKey))
      return
    }
    setError(null)
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    startUpload(f)
  }

  async function startUpload(f) {
    setStatus('uploading')
    setPct(0)
    setError(null)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const { url } = await uploadAvatar({
        file: f,
        userId,
        signal: controller.signal,
        onProgress: (p) => setPct(p),
      })
      // Lưu vào profiles; parent reload → currentUrl mới về, ảnh hiện ở mọi nơi.
      const saveErr = await onSave(url)
      if (saveErr) throw new Error(saveErr)
      // Xong: bỏ preview tạm, để currentUrl (ảnh thật đã lưu) hiển thị.
      cleanupSelection()
      setStatus('idle')
    } catch (err) {
      abortRef.current = null
      if (err?.message === 'aborted') {
        // Người dùng bấm Hủy → về ảnh cũ, không báo lỗi.
        cleanupSelection()
        setStatus('idle')
        return
      }
      // Mạng/quota/HTTP lỗi → ẩn vòng %, báo thử lại, GIỮ ảnh cũ nguyên vẹn.
      setStatus('error')
      setError(t('avatar.errUpload'))
    }
  }

  function cleanupSelection() {
    setPreviewUrl(null)
    setFile(null)
    setPct(null)
    abortRef.current = null
  }

  function cancel() {
    // Đang upload → hủy request (onabort xử lý dọn dẹp). Nếu đang lỗi/chờ → dọn ngay.
    if (abortRef.current) abortRef.current.abort()
    else {
      cleanupSelection()
      setStatus('idle')
      setError(null)
    }
  }

  function retry() {
    if (file) startUpload(file)
  }

  const uploading = status === 'uploading'
  const showImg = preview || currentUrl

  return (
    <div className="avatar-upload">
      <div className="avatar-wrap">
        <div className={`avatar-circle${uploading ? ' busy' : ''}`}>
          {showImg ? (
            <img className="avatar-img" src={showImg} alt={t('avatar.alt')} />
          ) : (
            <span className="avatar-initials">{initials}</span>
          )}
        </div>
        {uploading && <ProgressRing pct={pct} />}
        {uploading && pct != null && (
          <span className="avatar-pct">{pct}%</span>
        )}
      </div>

      <div className="avatar-side">
        {file && (
          <div className="avatar-filecard">
            <span className="avatar-filename" title={file.name}>
              {file.name}
            </span>
            <span className="avatar-filemeta">
              {formatFileSize(file.size)} · {fileFormatLabel(file)}
            </span>
          </div>
        )}

        <div className="avatar-actions">
          {!uploading && status !== 'error' && (
            <button type="button" className="row-btn primary" onClick={pickFile}>
              {t('avatar.choose')}
            </button>
          )}
          {status === 'error' && (
            <button type="button" className="row-btn primary" onClick={retry}>
              {t('avatar.retry')}
            </button>
          )}
          {(uploading || status === 'error' || file) && (
            <button type="button" className="row-btn" onClick={cancel}>
              {t('common.cancel')}
            </button>
          )}
        </div>

        {error && <span className="msg error sm">{error}</span>}
        <span className="avatar-hint">{t('avatar.hint')}</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        onChange={onFileChange}
        hidden
      />
    </div>
  )
}
