import { useRef, useState } from 'react'
import { useI18n } from '../lib/i18n.jsx'

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export default function ImageUploadZone({ files = [], multiple = false, onFiles }) {
  const { t } = useI18n()
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function select(nextFiles) {
    const images = Array.from(nextFiles || []).filter((file) =>
      file.type.startsWith('image/')
    )
    if (images.length) onFiles(multiple ? images : images.slice(0, 1))
  }

  function drop(e) {
    e.preventDefault()
    setDragging(false)
    select(e.dataTransfer.files)
  }

  const summary = files.length
    ? files.length === 1
      ? `${files[0].name} · ${formatSize(files[0].size)}`
      : t('upload.selectedMany', { count: files.length })
    : null

  return (
    <div
      className={`premium-upload${dragging ? ' is-dragging' : ''}${
        files.length ? ' has-file' : ''
      }`}
      onDragEnter={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false)
      }}
      onDrop={drop}
    >
      <input
        ref={inputRef}
        className="premium-upload-input"
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={(e) => {
          select(e.target.files)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        className="premium-upload-drop"
        onClick={() => inputRef.current?.click()}
      >
        <span className="premium-upload-art" aria-hidden="true">
          <span className="premium-upload-orbit orbit-one">JPG</span>
          <svg viewBox="0 0 64 64" role="img">
            <path d="M12 22h15l5-7h20a6 6 0 0 1 6 6v27a7 7 0 0 1-7 7H13a7 7 0 0 1-7-7V29a7 7 0 0 1 6-7Z" />
            <path className="upload-arrow" d="M32 45V28m-8 8 8-8 8 8" />
          </svg>
          <span className="premium-upload-orbit orbit-two">PNG</span>
        </span>
        <strong>{dragging ? t('upload.release') : t('upload.dropTitle')}</strong>
        <span className="premium-upload-browse">
          {t('upload.or')} <b>{t('upload.browse')}</b>
        </span>
        <span className="premium-upload-limits">
          <span>JPG · PNG · WEBP</span>
          <span>{multiple ? t('upload.multiple') : t('upload.single')}</span>
        </span>
        {summary && <span className="premium-upload-selected">✓ {summary}</span>}
      </button>
    </div>
  )
}
