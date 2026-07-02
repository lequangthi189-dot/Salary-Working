import { useState } from 'react'
import { useI18n } from '../lib/i18n.jsx'
import {
  readImage,
  extractSchedule,
  mapScheduleRows,
  pickImportRows,
  mondayOfThisWeek,
} from '../lib/scheduleExtract.js'
import { ocrTokens, crosscheckRecord } from '../lib/ocrCrosscheck.js'
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
  // LỚP ĐỐI CHIẾU OCR (Tesseract) — chạy SONG SONG với Gemini, CHỈ để kiểm tra.
  // status: 'idle'|'running'|'done'|'failed'. tokens = từ điển giờ/số giờ OCR đọc ra
  // (null khi chưa xong/không đọc được → bỏ qua đối chiếu, KHÔNG chặn luồng Gemini).
  const [ocr, setOcr] = useState({ status: 'idle', tokens: null, pct: 0 })
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
    setOcr({ status: 'idle', tokens: null, pct: 0 }) // ảnh mới → bỏ đối chiếu cũ
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
      // 1b) SONG SONG: khởi động OCR NGAY, chạy nền cùng lúc Gemini đọc — KHÔNG await
      // để không làm chậm hiển thị kết quả Gemini. OCR fail/rỗng → tokens=null → chỉ
      // bỏ qua đối chiếu (báo nhẹ "chưa đối chiếu được"), tuyệt đối không chặn luồng.
      const dataUrl = `data:${mediaType};base64,${base64}`
      setOcr({ status: 'running', tokens: null, pct: 0 })
      ocrTokens(dataUrl, (p) =>
        setOcr((o) => (o.status === 'running' ? { ...o, pct: p } : o))
      )
        .then((tokens) =>
          setOcr({ status: tokens ? 'done' : 'failed', tokens, pct: 1 })
        )
        .catch(() => setOcr({ status: 'failed', tokens: null, pct: 1 }))
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

  // Class tô màu ô theo trạng thái đối chiếu OCR: khớp=xanh nhẹ, lệch=vàng cảnh báo.
  function ccCellClass(status) {
    if (status === 'match') return 'cell-match'
    if (status === 'mismatch') return 'cell-mismatch'
    return undefined
  }
  // Tooltip cho ô: khớp → xác nhận; lệch → nêu rõ AI đọc gì mà OCR không thấy.
  function ccTitle(status, value) {
    if (status === 'match') return t('ocr.cellMatch')
    if (status === 'mismatch') return t('ocr.cellMismatch', { value })
    return undefined
  }
  // Số Ô có ca (không nghỉ) mà AI–OCR LỆCH → hiện banner cảnh báo trên bảng.
  const ocrWarnCount =
    rows && ocr.tokens
      ? rows.reduce(
          (n, r) => n + (crosscheckRecord(r, ocr.tokens).overall === 'warn' ? 1 : 0),
          0
        )
      : 0

  async function createShifts() {
    const picked = pickImportRows(rows)
    if (picked.length === 0) return setError(t('import.errNoShift'))
    // AN TOÀN LƯƠNG: nếu OCR đối chiếu và còn ô LỆCH ở các ca sắp tạo → bắt user xác
    // nhận tay trước khi lưu (OCR chỉ cảnh báo, không tự chặn/ghi đè).
    if (ocr.tokens) {
      const hasWarn = picked.some(
        (r) => crosscheckRecord(r, ocr.tokens).overall === 'warn'
      )
      if (hasWarn && !(await askConfirm(t('ocr.confirmSave')))) return
    }
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

        {/* Trạng thái lớp đối chiếu OCR: đang chạy / không đọc được. Ô lệch/khớp đánh
            dấu ngay trên từng ô giờ bên dưới. */}
        {rows && ocr.status === 'running' && (
          <p className="msg info ocr-note">{t('ocr.checking')}</p>
        )}
        {rows && ocr.status === 'failed' && (
          <p className="msg info ocr-note">{t('ocr.unchecked')}</p>
        )}
        {rows && ocr.status === 'done' && ocrWarnCount > 0 && (
          <p className="msg error">
            {t('ocr.warnBanner', { count: ocrWarnCount })}
          </p>
        )}

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
                {rows.map((r, i) => {
                  // Đối chiếu Ở RENDER: dùng giá trị dòng HIỆN TẠI (kể cả user vừa sửa)
                  // so với từ điển OCR → sửa cho khớp là cảnh báo tự tắt.
                  const cc = ocr.tokens ? crosscheckRecord(r, ocr.tokens) : null
                  return (
                  <tr key={r.weekday} className={r.off ? 'off' : ''}>
                    <td>{t(`wd.${r.weekday}`)}</td>
                    <td className="muted">{r.date}</td>
                    <td className={ccCellClass(cc?.start)} title={ccTitle(cc?.start, r.start)}>
                      <TimeInput
                        value={r.start}
                        disabled={r.off}
                        onChange={(v) => updateRow(i, { start: v })}
                      />
                    </td>
                    <td className={ccCellClass(cc?.end)} title={ccTitle(cc?.end, r.end)}>
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
                  )
                })}
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
