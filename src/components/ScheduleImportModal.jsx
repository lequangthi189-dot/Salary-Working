import { useState } from 'react'
import { useI18n } from '../lib/i18n.jsx'
import {
  readImage,
  extractSchedule,
  mapScheduleRows,
  pickImportRows,
  mondayOfThisWeek,
} from '../lib/scheduleExtract.js'
import { useTrickleProgress } from '../lib/useTrickleProgress.js'
import { useDoneHold } from '../lib/useDoneHold.js'
import ConfirmModal from './ConfirmModal.jsx'
import ManualScheduleModal from './ManualScheduleModal.jsx'
import Checkbox from './Checkbox.jsx'
import ProgressButton from './ProgressButton.jsx'
import TimeInput from './TimeInput.jsx'

// Modal: tải ảnh lịch → AI đọc theo mã nhân viên (lấy từ hồ sơ) → xem trước & sửa
// → tạo ca cả tuần.
export default function ScheduleImportModal({
  employeeCode = '',
  fullName = '',
  phone = '',
  onImport,
  onClose,
}) {
  const { t } = useI18n()
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  // Tuần hiện tại làm DỰ PHÒNG khi ảnh không ghi ngày (không hiện trên UI).
  const weekStart = mondayOfThisWeek()
  const [loading, setLoading] = useState(false)
  // Tiến độ thật của quá trình đọc lịch. indeterminate = đang chờ Gemini (không
  // ước lượng được %). Reset/ẩn trong finally để KHÔNG kẹt khi lỗi.
  const [progress, setProgress] = useState({ pct: 0, label: '', indeterminate: false })
  // Bước gọi Gemini là "hộp đen" → cho % bò chậm (ước lượng), tiệm cận 90%.
  const { start: startTrickle, stop: stopTrickle } = useTrickleProgress(setProgress)
  // Giữ nút ở trạng thái "Hoàn tất ✓" một nhịp trước khi hiện kết quả (chỉ khi xong).
  const { done, hold } = useDoneHold()
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [rows, setRows] = useState(null) // [{weekday,date,start,end,off}]
  const [showManual, setShowManual] = useState(false) // popup nhập tay
  const [saving, setSaving] = useState(false)
  const [confirmState, setConfirmState] = useState(null) // { message, resolve }

  // Hỏi xác nhận bằng popup cảnh báo riêng (thay window.confirm).
  function askConfirm(message) {
    return new Promise((resolve) => setConfirmState({ message, resolve }))
  }

  function pickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setRows(null)
    setError(null)
    setInfo(null)
  }

  async function readSchedule() {
    setError(null)
    setInfo(null)
    if (!file) return setError(t('import.errPickImage'))
    if (![employeeCode, fullName, phone].some((v) => String(v || '').trim()))
      return setError(t('import.errNoCode'))
    setLoading(true)
    setProgress({ pct: 10, label: t('import.stageUpload'), indeterminate: false })
    try {
      // 1) Đọc & mã hoá ảnh (mốc thật).
      const { base64, mediaType } = await readImage(file)
      setProgress({ pct: 25, label: t('import.stageUpload'), indeterminate: false })
      // 2) Gọi Gemini — hộp đen, không có % thật → % bò chậm 25→~90% (ước lượng).
      startTrickle(25, 90, t('import.stageAI'))
      const data = await extractSchedule({
        base64,
        mediaType,
        employeeCode,
        fullName,
        phone,
        weekStart,
      })
      // 3) Có phản hồi → dừng trickle, sang mốc % THẬT.
      stopTrickle()
      setProgress({ pct: 75, label: t('import.stageProcessing'), indeterminate: false })
      // [DEBUG ảnh 1] Object THÔ AI trả về — soi xem AI đọc ra giờ (days có
      // start/end/raw) hay rỗng, doc_type/found ra sao.
      console.log('[import] raw AI object', JSON.parse(JSON.stringify(data)))
      if (data?.is_roster === false) {
        setError(t('import.errNotRoster'))
        setRows(null)
        return
      }
      // Nhầm loại: ảnh là bảng công nhưng đang ở Nhập lịch tuần → hỏi xác nhận.
      if (data?.doc_type === 'timesheet') {
        const ok = await askConfirm(t('import.warnTimesheet'))
        if (!ok) {
          setRows(null)
          return
        }
      }
      if (!data?.found) {
        setError(t('import.errNotFound', { code: employeeCode }))
        setRows(null)
        return
      }
      // Map theo thứ -> ngày dựa trên tuần bắt đầu (Thứ 2).
      const mapped = mapScheduleRows(data, weekStart)
      setProgress({ pct: 100, label: t('import.stageDone'), indeterminate: false })
      // Xong thật → giữ "Hoàn tất ✓" một nhịp rồi mới hiện bảng lịch + thông báo.
      const infoMsg = t('import.infoRead', {
        code: data.matched_code || employeeCode,
      })
      hold(() => {
        setRows(mapped)
        setInfo(infoMsg)
      })
    } catch (e) {
      // Lỗi (vd Gemini hết quota/timeout) → KHÔNG hiện Done; báo lỗi + gợi ý thử lại
      // sau; finally ẩn progress nên không kẹt ở % dở.
      setError(`${String(e.message || e)}\n${t('import.errRetry')}`)
    } finally {
      stopTrickle() // dọn timer trickle dù xong hay lỗi → không kẹt số đang bò
      setLoading(false)
    }
  }

  function updateRow(i, patch) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  async function createShifts() {
    const picked = pickImportRows(rows)
    if (picked.length === 0) return setError(t('import.errNoShift'))
    setSaving(true)
    setError(null)
    setInfo(null)
    const { created, skipped, errors } = await onImport(picked)
    setSaving(false)
    if (errors && errors.length) {
      setError(t('import.errSome', { errs: errors.join('\n') }))
      return
    }
    // BÁO TÓM TẮT (đừng im lặng): tạo bao nhiêu ca mới, bỏ qua bao nhiêu ca đã có.
    // Cả tuần đã có hết (không ca nào mới) → báo rõ là KHÔNG phải lỗi.
    if (created === 0) {
      setInfo(t('import.allExist'))
    } else {
      setInfo(t('import.importSummary', { created, skipped }))
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card wide"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{t('import.title')}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>

        <div className="import-fields">
          <label className="import-file">
            <span>{t('import.image')}</span>
            <input type="file" accept="image/*" onChange={pickFile} />
          </label>
        </div>
        <p className="import-empcode">
          {t('import.empcodeFrom')}
          <strong>{employeeCode || t('import.none')}</strong>
        </p>

        {previewUrl && (
          <img
            className="import-preview"
            src={previewUrl}
            alt={t('import.previewAlt')}
          />
        )}

        <div className="import-actions">
          <button
            type="button"
            className="account-btn"
            onClick={readSchedule}
            disabled={loading || done}
          >
            {loading ? t('import.reading') : t('import.readAI')}
          </button>
          <button
            type="button"
            className="account-btn"
            onClick={() => setShowManual(true)}
            disabled={loading || done}
          >
            {t('import.enterManual')}
          </button>
        </div>

        {(loading || done) && (
          <div className="import-progress">
            <ProgressButton
              value={progress.pct}
              label={progress.label}
              indeterminate={progress.indeterminate}
            />
          </div>
        )}

        {info && <p className="msg info">{info}</p>}
        {error && <p className="msg error" style={{ whiteSpace: 'pre-wrap' }}>{error}</p>}

        {rows && (
          <>
            <div className="import-table-wrap">
            <table className="import-table">
              <thead>
                <tr>
                  <th>{t('import.thWeekday')}</th>
                  <th>{t('import.thDate')}</th>
                  <th>{t('import.thIn')}</th>
                  <th>{t('import.thOut')}</th>
                  <th>{t('import.thOff')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.weekday} className={r.off ? 'off' : ''}>
                    <td>{t(`wd.${r.weekday}`)}</td>
                    <td className="muted">{r.date}</td>
                    <td>
                      <TimeInput
                        value={r.start}
                        disabled={r.off}
                        onChange={(v) => updateRow(i, { start: v })}
                      />
                    </td>
                    <td>
                      <TimeInput
                        value={r.end}
                        disabled={r.off}
                        onChange={(v) => updateRow(i, { end: v })}
                      />
                    </td>
                    <td>
                      <Checkbox
                        checked={r.off}
                        onChange={(e) => updateRow(i, { off: e.target.checked })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            <div className="import-actions">
              <button
                type="button"
                className="btn-addshift"
                onClick={createShifts}
                disabled={saving}
              >
                {saving ? t('import.creating') : t('import.createAll')}
              </button>
            </div>
          </>
        )}
      </div>

      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          onResult={(ok) => {
            confirmState.resolve(ok)
            setConfirmState(null)
          }}
        />
      )}

      {showManual && (
        <ManualScheduleModal
          onImport={onImport}
          onClose={() => setShowManual(false)}
          onDone={onClose}
        />
      )}
    </div>
  )
}
