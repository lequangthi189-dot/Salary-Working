import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { localTodayStr } from '../lib/payPeriod.js'
import { hhmm } from '../lib/shiftMath.js'
import { useI18n, getLang, translate } from '../lib/i18n.jsx'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function pad2(n) {
  return String(n).padStart(2, '0')
}
function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`
}
function mondayOfThisWeek() {
  const today = localTodayStr()
  const [y, m, d] = today.split('-').map(Number)
  const dow = new Date(y, m - 1, d).getDay()
  const offset = dow === 0 ? -6 : 1 - dow
  return addDays(today, offset)
}
function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      resolve({ base64: dataUrl.split(',')[1], mediaType: file.type })
    }
    reader.onerror = () =>
      reject(new Error(translate(getLang(), 'import.errReadImage')))
    reader.readAsDataURL(file)
  })
}

// "05/06"
function dmShort(date) {
  const [, m, d] = String(date).split('-')
  return `${d}/${m}`
}

// Modal ĐỐI CHIẾU CÔNG: tải ảnh bảng phân ca → AI đọc theo mã NV → so với các ca
// đang có trong bảng công (workshift cards) để xem có đúng công không.
export default function ReconcileModal({ employeeCode = '', shifts = [], onClose }) {
  const { t } = useI18n()
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [weekStart, setWeekStart] = useState(mondayOfThisWeek())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [rows, setRows] = useState(null)

  // Map ngày -> ca thực tế trong bảng công (ưu tiên ca đã check-in).
  const byDate = new Map()
  for (const s of shifts) {
    const cur = byDate.get(s.work_date)
    if (!cur || (s.start_time && !cur.start_time)) byDate.set(s.work_date, s)
  }

  function pickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setRows(null)
    setError(null)
  }

  async function readAndCompare() {
    setError(null)
    if (!file) return setError(t('import.errPickImage'))
    if (!/^\d{9}$/.test(String(employeeCode).trim()))
      return setError(t('import.errNoCode'))
    setLoading(true)
    try {
      const { base64, mediaType } = await readImage(file)
      const { data, error: fnErr } = await supabase.functions.invoke(
        'extract-schedule',
        {
          body: {
            image: base64,
            mediaType,
            employeeCode: employeeCode.trim(),
            weekStart,
          },
        }
      )
      if (fnErr) {
        let detail = fnErr.message
        try {
          const ctx = fnErr.context
          if (ctx && typeof ctx.json === 'function') {
            const b = await ctx.json()
            if (b?.error) detail = b.error
          }
        } catch {
          /* ignore */
        }
        throw new Error(detail)
      }
      if (data?.error) throw new Error(data.error)
      if (!data?.found) {
        setError(t('import.errNotFound', { code: employeeCode }))
        setRows(null)
        return
      }
      const isoRe = /^\d{4}-\d{2}-\d{2}$/
      const byDay = new Map((data.days || []).map((d) => [d.weekday, d]))
      const compared = WEEKDAYS.map((wd, i) => {
        const d = byDay.get(wd) || { off: true, start: '', end: '', date: '' }
        const date = isoRe.test(d.date || '') ? d.date : addDays(weekStart, i)
        const imgOff = !!d.off || !d.start || !d.end
        const imgStart = imgOff ? '' : d.start
        const imgEnd = imgOff ? '' : d.end

        const shift = byDate.get(date)
        const appStart = shift
          ? hhmm(shift.start_time || shift.scheduled_start)
          : ''
        const appEnd = shift ? hhmm(shift.end_time || shift.scheduled_end) : ''
        const appHas = !!(appStart && appEnd)

        let status
        if (!imgOff && appHas)
          status = imgStart === appStart && imgEnd === appEnd ? 'match' : 'diff'
        else if (!imgOff && !appHas) status = 'missing'
        else if (imgOff && appHas) status = 'extra'
        else status = 'off'

        return {
          weekday: wd,
          date,
          imgStart,
          imgEnd,
          imgOff,
          appStart,
          appEnd,
          appHas,
          status,
        }
      })
      setRows(compared)
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setLoading(false)
    }
  }

  // Bỏ qua ngày cả hai đều nghỉ.
  const visibleRows = rows ? rows.filter((r) => r.status !== 'off') : []
  const matchCount = visibleRows.filter((r) => r.status === 'match').length

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card wide"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{t('reconcile.title')}</h2>
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
          <label className="import-week">
            <span>{t('import.weekStart')}</span>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
            />
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
            onClick={readAndCompare}
            disabled={loading}
          >
            {loading ? t('import.reading') : t('reconcile.check')}
          </button>
        </div>

        {error && (
          <p className="msg error" style={{ whiteSpace: 'pre-wrap' }}>
            {error}
          </p>
        )}

        {rows && (
          <>
            <p
              className={`msg ${matchCount === visibleRows.length ? 'info' : 'error'}`}
            >
              {t('reconcile.summary', {
                match: matchCount,
                total: visibleRows.length,
              })}
            </p>
            <div className="import-table-wrap">
              <table className="import-table reconcile-table">
                <thead>
                  <tr>
                    <th>{t('import.thDate')}</th>
                    <th>{t('reconcile.colImage')}</th>
                    <th>{t('reconcile.colApp')}</th>
                    <th>{t('reconcile.colStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((r) => (
                    <tr key={r.weekday} className={`rec-${r.status}`}>
                      <td>{dmShort(r.date)}</td>
                      <td>
                        {r.imgOff ? '—' : `${r.imgStart}–${r.imgEnd}`}
                      </td>
                      <td>{r.appHas ? `${r.appStart}–${r.appEnd}` : '—'}</td>
                      <td>{t(`reconcile.${r.status}`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
