// LỚP ĐỐI CHIẾU OCR (Kiểu A — presence-based) cho luồng đọc ảnh lịch/bảng công.
//
// NGUYÊN TẮC BẤT DI BẤT DỊCH (dữ liệu lương):
//   - Gemini vẫn là nguồn ĐỌC CHÍNH. OCR (Tesseract.js) chạy SONG SONG, CHỈ để KIỂM
//     TRA xem giá trị Gemini đọc có THẬT SỰ xuất hiện trong ảnh không.
//   - OCR TUYỆT ĐỐI KHÔNG ghi đè số của Gemini, KHÔNG tự lưu. Ô lệch → chỉ CẢNH BÁO,
//     người dùng xác nhận tay.
//   - OCR fail/rỗng → BỎ QUA đối chiếu, KHÔNG chặn luồng (dùng kết quả Gemini như cũ).
//
// Tách 2 phần:
//   1) HÀM THUẦN (chuẩn hoá + so khớp) — không import tesseract → unit test được.
//   2) ocrImage() — lazy import 'tesseract.js' (tải model ~vài MB lần đầu) CHỈ khi gọi.

// ── 1) CHUẨN HOÁ ────────────────────────────────────────────────────────────

// Giờ "HH:MM" 24h về dạng chính tắc "H:MM" không đệm số 0 giờ (để "06:00" == "6:00").
// Nhận "06:00", "6:00", "0600", "6h", "6h30", "6.00", "6:0". Trả null nếu không phải giờ.
export function normalizeTime(raw) {
  if (raw == null) return null
  const s = String(raw).trim().toLowerCase()
  // "0600" / "600" (3–4 chữ số liền, không dấu) → giờ + phút.
  let m = s.match(/^(\d{1,2})(\d{2})$/)
  if (m) return toTime(m[1], m[2])
  // "6:00" | "6.00" | "6h00" | "6 00" | "6h"
  m = s.match(/^(\d{1,2})\s*[:h.]\s*(\d{0,2})$/)
  if (m) return toTime(m[1], m[2] || '00')
  return null
}

function toTime(h, mm) {
  const hh = Number(h)
  const min = Number(mm)
  if (!Number.isFinite(hh) || !Number.isFinite(min)) return null
  if (hh > 23 || min > 59) return null
  return `${hh}:${String(min).padStart(2, '0')}`
}

// Số giờ công về chuỗi số chính tắc ("8", "8.0" → "8"; "7,55" → "7.55"). null nếu
// không phải số giờ hợp lệ (0–24).
export function normalizeHours(raw) {
  if (raw == null) return null
  const s = String(raw).trim().replace(',', '.')
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(s)) return null
  const n = parseFloat(s)
  if (!Number.isFinite(n) || n < 0 || n > 24) return null
  // Bỏ số 0 thừa: 8.00 → "8", 7.50 → "7.5".
  return String(Number(n.toFixed(2)))
}

// ── 2) TRÍCH TOKEN TỪ TEXT OCR THÔ ─────────────────────────────────────────

// Text OCR (cả ảnh, lộn xộn) → { times:Set, hours:Set, empty:boolean }.
// times = mọi giờ chuẩn hoá; hours = mọi số giờ chuẩn hoá. Dùng làm "TỪ ĐIỂN" để
// kiểm tra giá trị Gemini có nằm trong ảnh không.
export function buildTokenSet(text) {
  const times = new Set()
  const hours = new Set()
  if (text) {
    // Giờ: "6:00", "06:00", "6h30", "6.00". (Bắt cả dạng có dấu phân cách.)
    for (const m of text.matchAll(/\b(\d{1,2})\s*[:h]\s*(\d{2})\b/gi)) {
      const t = normalizeTime(`${m[1]}:${m[2]}`)
      if (t) times.add(t)
    }
    // Số giờ thập phân: "7.55", "8,0", "8.0" (loại năm/số dài — chỉ 1–2 chữ số nguyên).
    for (const m of text.matchAll(/\b(\d{1,2})[.,](\d{1,2})\b/g)) {
      const h = normalizeHours(`${m[1]}.${m[2]}`)
      if (h) hours.add(h)
    }
    // Số giờ nguyên đứng riêng: " 8 " (1–2 chữ số). Cẩn thận: cũng là "8" giờ.
    for (const m of text.matchAll(/(?<![\d.,:h])(\d{1,2})(?![\d.,:h])/gi)) {
      const h = normalizeHours(m[1])
      if (h) hours.add(h)
    }
  }
  return { times, hours, empty: times.size === 0 && hours.size === 0 }
}

// ── 3) SO KHỚP MỘT Ô/NGÀY ──────────────────────────────────────────────────

// Trạng thái một GIÁ TRỊ so với từ điển OCR:
//   'na'         : Gemini không có giá trị này (ô trống) → không đối chiếu.
//   'unchecked'  : OCR rỗng/không đọc được → không kết luận được.
//   'match'      : giá trị Gemini CÓ trong ảnh (OCR thấy) → đáng tin.
//   'mismatch'   : giá trị Gemini KHÔNG có trong từ điển OCR → cảnh báo, cần soát.
function statusOfTime(value, tokens) {
  const norm = normalizeTime(value)
  if (!norm) return 'na'
  if (tokens.empty) return 'unchecked'
  return tokens.times.has(norm) ? 'match' : 'mismatch'
}
function statusOfHours(value, tokens) {
  const norm = normalizeHours(value)
  if (norm == null) return 'na'
  if (tokens.empty) return 'unchecked'
  return tokens.hours.has(norm) ? 'match' : 'mismatch'
}

// Đối chiếu MỘT record ngày (có off/start/end/raw) với từ điển OCR.
// Trả { start, end, raw, overall } — overall gộp:
//   'na'        : ngày nghỉ hoặc không có gì để đối chiếu.
//   'unchecked' : OCR không đọc được → hiện nhẹ "chưa đối chiếu được".
//   'ok'        : có ít nhất 1 giá trị khớp, KHÔNG có giá trị nào lệch.
//   'warn'      : có ít nhất 1 giá trị LỆCH → đánh dấu vàng, cần user xác nhận.
export function crosscheckRecord(rec, tokens) {
  if (!rec || rec.off) return { start: 'na', end: 'na', raw: 'na', overall: 'na' }
  const start = statusOfTime(rec.start, tokens)
  const end = statusOfTime(rec.end, tokens)
  const raw = statusOfHours(rec.raw, tokens)
  const all = [start, end, raw]
  let overall
  if (all.includes('mismatch')) overall = 'warn'
  else if (all.includes('match')) overall = 'ok'
  else if (all.includes('unchecked')) overall = 'unchecked'
  else overall = 'na'
  return { start, end, raw, overall }
}

// ── 4) OCR (LAZY, IMPURE) ──────────────────────────────────────────────────

let workerPromise = null

// Lazy: import động tesseract.js + tạo worker MỘT lần, tái dùng cho các ảnh sau.
// Model tải từ CDN của tesseract.js LẦN ĐẦU (~vài MB) — chỉ xảy ra khi user thật sự
// dùng đọc ảnh, KHÔNG nạp lúc mở app.
async function getWorker(onProgress) {
  if (!workerPromise) {
    workerPromise = import('tesseract.js').then(({ createWorker }) =>
      createWorker('eng', 1, {
        logger: (m) => {
          if (onProgress && m.status === 'recognizing text') onProgress(m.progress)
        },
      })
    )
  }
  return workerPromise
}

// Chạy OCR 1 ảnh (data URL "data:...;base64,..."). Trả TEXT thô.
// Ném lỗi nếu OCR hỏng → BÊN GỌI phải bắt và BỎ QUA đối chiếu (không chặn luồng).
export async function ocrImage(dataUrl, onProgress) {
  const worker = await getWorker(onProgress)
  const { data } = await worker.recognize(dataUrl)
  return data?.text || ''
}

// Bọc TIMEOUT: OCR (kể cả tải model lần đầu / worker treo) TUYỆT ĐỐI không được làm
// treo luồng gọi. Quá hạn hoặc lỗi → resolve về sentinel, KHÔNG throw, KHÔNG reject.
export function withTimeout(promise, ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ __ocrTimeout: true }), ms)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      () => {
        clearTimeout(timer)
        resolve({ __ocrError: true })
      }
    )
  })
}

// Tiện ích: đọc ảnh + trích token trong 1 bước, CÓ timeout. Trả token set, hoặc NULL
// khi OCR fail/quá giờ (bên gọi coi null = "chưa đối chiếu được", vẫn dùng Gemini).
// Hàm này KHÔNG BAO GIỜ throw và KHÔNG BAO GIỜ treo quá timeoutMs.
export async function ocrTokens(dataUrl, onProgress, timeoutMs = 15000) {
  const res = await withTimeout(ocrImage(dataUrl, onProgress), timeoutMs)
  if (typeof res !== 'string') return null // timeout / lỗi / không phải text
  return buildTokenSet(res)
}
