// PARSER THUẦN cho trợ lý lương (SalaryChat) — nhận diện ý định từ câu người dùng
// bằng regex, KHÔNG phụ thuộc React/i18n/snapshot. Tách khỏi SalaryChat.jsx để test
// được (như shiftMath/reconcileDates). Mỗi parser nhận chuỗi → trả object hoặc null.
//
// SONG NGỮ: mỗi nhóm từ khoá có cả tiếng Việt (nguyên gốc) lẫn tiếng Anh — chỉ THÊM
// nhánh Anh, KHÔNG đổi hành vi tiếng Việt. Ngày dạng số hiểu là DD/MM cho MỌI ngôn
// ngữ (quyết định dự án); tên tháng tiếng Anh + ngày tương đối bỏ được mơ hồ.
import { localTodayStr } from './payPeriod.js'

export function pad2(n) {
  return String(n).padStart(2, '0')
}

// Thứ 2 (đầu tuần) của tuần chứa ngày (giờ ĐỊA PHƯƠNG) — giống TimesheetTable để
// đánh số tuần khớp. (Khác mondayOf của scheduleExtract vốn tính theo UTC.)
export function mondayOf(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dow = (dt.getDay() + 6) % 7
  dt.setDate(dt.getDate() - dow)
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`
}

// "YYYY-MM-DD" -> "DD/MM/YYYY"
export function dmy(d) {
  const [y, m, dd] = String(d).split('-')
  return `${dd}/${m}/${y}`
}

// Số ngày từ a→b (cùng "YYYY-MM-DD", theo lịch địa phương). b-a; âm nếu b trước a.
export function daysBetween(a, b) {
  const [ay, am, ad] = String(a).split('-').map(Number)
  const [by, bm, bd] = String(b).split('-').map(Number)
  return Math.round(
    (new Date(by, bm - 1, bd) - new Date(ay, am - 1, ad)) / 86400000
  )
}

// Bỏ dấu + đ→d + thường hoá, để khớp lệnh dù gõ có dấu hay không.
export function deaccent(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
}

// Cộng n ngày vào "YYYY-MM-DD" (theo lịch địa phương).
export function addDaysStr(dateStr, n) {
  const [y, m, d] = String(dateStr).split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`
}

// Tên tháng tiếng Anh → số (đầy đủ + viết tắt). Tên tháng bỏ được mơ hồ DD/MM.
const MONTHS_EN = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
  september: 9, sept: 9, sep: 9, october: 10, oct: 10, november: 11, nov: 11,
  december: 12, dec: 12,
}
const MONTHS_ALT =
  'january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec'
// Tìm số tháng theo TÊN THÁNG tiếng Anh trong chuỗi (đã deaccent). 0 nếu không có.
function monthNameIn(s) {
  const m = s.match(new RegExp(`\\b(${MONTHS_ALT})\\b`))
  return m ? MONTHS_EN[m[1]] : 0
}

// ── Đoán ngôn ngữ (chặn nhắn lệch ngôn ngữ UI) ─────────────────────────────
const VI_DIACRITIC =
  /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i

const VI_WORDS = new Set([
  'toi', 'minh', 'thang', 'tuan', 'luong', 'lam', 'nhieu', 'ngay', 'dem', 'them',
  'tao', 'thuong', 'boi', 'viec', 'ngoai', 'gio', 'khong', 'duoc', 'muon', 'hom',
  'nay', 'mai', 'lich', 'kien', 'bang', 'cong', 'cua', 'voi', 'thu', 'chu', 'nhat',
  'bao', 'cham', 'doi', 'chieu', 'nhap', 'huong', 'dan', 'ho', 'so', 'tru', 'kip',
])
const EN_WORDS = new Set([
  'the', 'you', 'your', 'how', 'much', 'many', 'what', 'when', 'is', 'are', 'do',
  'does', 'shift', 'shifts', 'month', 'week', 'need', 'make', 'salary', 'this',
  'reach', 'work', 'working', 'hours', 'hour', 'add', 'want', 'today', 'tomorrow',
  'schedule', 'pay', 'open', 'show', 'and', 'for', 'with', 'night', 'day', 'next',
  // Từ lệnh tiếng Anh — giúp câu lệnh nhận đúng 'en', không bị chặn nhầm trên UI 'en'.
  'timesheet', 'deduction', 'deductions', 'compensation', 'reconcile', 'income',
  'side', 'freelance', 'million', 'planned', 'feasible', 'deduct', 'monday',
  'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
])

// Trả 'vi' | 'en' | null (null = trung tính/không chắc). Có dấu VN → 'vi'. Không dấu
// → đếm từ đặc trưng; hơn hẳn bên nào theo bên đó; hoà/không có từ nào → null.
export function detectLang(msg) {
  if (VI_DIACRITIC.test(msg)) return 'vi'
  const tokens = deaccent(msg).match(/[a-z]+/g) || []
  if (!tokens.length) return null
  let vi = 0
  let en = 0
  for (const w of tokens) {
    if (VI_WORDS.has(w)) vi++
    if (EN_WORDS.has(w)) en++
  }
  if (vi > en) return 'vi'
  if (en > vi) return 'en'
  return null
}

// ── Số tiền ────────────────────────────────────────────────────────────────
// "200k"/"200 nghin"→200000, "2tr"/"2 trieu"/"2 million"→2000000, "200000"→200000.
// Số trần (không đơn vị) phải ≥ 1000 mới coi là tiền (tránh nhầm ngày).
export function parseAmountVnd(s) {
  const m = deaccent(s).match(/(\d[\d.]*)\s*(trieu|tr|nghin|ngan|lit|k|million|mil)?/)
  if (!m) return null
  let n = Number(m[1].replace(/\./g, ''))
  if (!Number.isFinite(n) || n <= 0) return null
  const unit = m[2]
  if (unit === 'trieu' || unit === 'tr' || unit === 'million' || unit === 'mil')
    n *= 1000000
  else if (unit === 'lit') n *= 100000 // "lít" = trăm nghìn
  else if (unit === 'nghin' || unit === 'ngan' || unit === 'k') n *= 1000
  else if (n < 1000) return null
  return Math.round(n)
}

// Tìm SỐ TIỀN trong câu, BỎ QUA giờ ("14h"/"16:00"). Ưu tiên số có đơn vị tiền.
export function findMoney(s) {
  const t = deaccent(s)
  let m = t.match(/(\d[\d.]*)\s*(trieu|tr|nghin|ngan|lit|k|million|mil)\b/)
  if (m) {
    let n = Number(m[1].replace(/\./g, ''))
    const u = m[2]
    if (u === 'trieu' || u === 'tr' || u === 'million' || u === 'mil') n *= 1000000
    else if (u === 'lit') n *= 100000
    else n *= 1000
    return Math.round(n)
  }
  m = t.match(/(\d{4,})(?!\s*[:h])/) // số lớn không theo sau bởi : hoặc h
  if (m) return Number(m[1])
  return null
}

// ── Giờ / thứ / ngày ─────────────────────────────────────────────────────────
// Tối đa 2 mốc giờ: VN "22:00"/"22h"/"22h30"/"9h" + Anh "8am"/"4:30pm"/"12 pm".
export function findTimes(s) {
  const out = []
  // Nhánh 1: am/pm (Anh). Nhánh 2: có dấu phân cách :/h/gio (VN, GIỮ NGUYÊN hành vi cũ).
  const re =
    /(\d{1,2})(?:\s*[:h]\s*(\d{2}))?\s*(am|pm)|(\d{1,2})\s*(?::|h|gio)\s*(\d{2})?/gi
  let m
  while ((m = re.exec(s)) && out.length < 2) {
    let hh
    let mm
    if (m[3]) {
      hh = Number(m[1])
      mm = m[2] ? Number(m[2]) : 0
      const ap = m[3].toLowerCase()
      if (ap === 'pm' && hh < 12) hh += 12
      if (ap === 'am' && hh === 12) hh = 0
    } else {
      hh = Number(m[4])
      mm = m[5] ? Number(m[5]) : 0
    }
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59)
      out.push(`${pad2(hh)}:${pad2(mm)}`)
  }
  return out
}

// "thu 7"→6, "chu nhat"/"cn"→0; Anh monday..sunday (+ viết tắt an toàn). Null nếu không.
export function matchWeekday(s) {
  const map = { 2: 1, hai: 1, 3: 2, ba: 2, 4: 3, tu: 3, 5: 4, nam: 4, 6: 5, sau: 5, 7: 6, bay: 6 }
  const m = s.match(/\bthu\s*(2|3|4|5|6|7|hai|ba|tu|nam|sau|bay)\b/)
  if (m) return map[m[1]]
  if (/\bchu nhat\b|\bcn\b/.test(s)) return 0
  // Tiếng Anh: tên đầy đủ + viết tắt. KHÔNG dùng 'thu' trần cho Thursday (đụng "thứ").
  const en = s.match(
    /\b(monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thur|friday|fri|saturday|sat|sunday|sun)\b/
  )
  if (en) {
    const w = en[1]
    if (w.startsWith('mon')) return 1
    if (w.startsWith('tue')) return 2
    if (w.startsWith('wed')) return 3
    if (w.startsWith('thu')) return 4
    if (w.startsWith('fri')) return 5
    if (w.startsWith('sat')) return 6
    if (w.startsWith('sun')) return 0
  }
  return null
}

// Yêu cầu hỏi MỘT NGÀY cụ thể: DD/MM (mọi ngôn ngữ), "ngay D thang M", hoặc tên
// tháng Anh "10 june"/"june 10". Trả "YYYY-MM-DD" hoặc null.
export function parseDayReq(msg, adjustPast = true) {
  const norm = deaccent(msg)
  let day
  let month
  let yearStr = null
  let m = norm.match(/\b(\d{1,2})\s*[/-]\s*(\d{1,2})(?:\s*[/-]\s*(\d{2,4}))?\b/)
  if (m) {
    day = Number(m[1])
    month = Number(m[2])
    yearStr = m[3]
  } else if ((m = norm.match(/ngay\s*(\d{1,2})\s*thang\s*(\d{1,2})(?:\D*?(\d{4}))?/))) {
    day = Number(m[1])
    month = Number(m[2])
    yearStr = m[3]
  } else if ((m = norm.match(new RegExp(`\\b(\\d{1,2})\\s+(${MONTHS_ALT})\\b(?:\\D*?(\\d{4}))?`)))) {
    day = Number(m[1])
    month = MONTHS_EN[m[2]]
    yearStr = m[3]
  } else if ((m = norm.match(new RegExp(`\\b(${MONTHS_ALT})\\s+(\\d{1,2})\\b(?:\\D*?(\\d{4}))?`)))) {
    month = MONTHS_EN[m[1]]
    day = Number(m[2])
    yearStr = m[3]
  } else {
    return null
  }
  if (day < 1 || day > 31 || month < 1 || month > 12) return null
  let year = yearStr ? Number(yearStr) : null
  if (year && year < 100) year += 2000
  if (!year) {
    // Không ghi năm → năm nay. Với CÂU HỎI (adjustPast), ngày ở tương lai → hiểu là
    // năm trước (lần gần nhất đã qua). Với THÊM CA thì giữ năm nay (ngày tương lai).
    const now = new Date()
    year = now.getFullYear()
    if (adjustPast && new Date(year, month - 1, day) > now) year -= 1
  }
  return `${year}-${pad2(month)}-${pad2(day)}`
}

// Suy NGÀY TUYỆT ĐỐI từ câu, dựa trên HÔM NAY:
//  - tương đối: hôm nay/today, mai/tomorrow, mốt/day after tomorrow
//  - thứ (VN/Anh) kèm "tuần sau"/"next week"
//  - tuyệt đối: DD/MM, "ngay D thang M", tên tháng Anh
//  - ngày trần: "ngày 14" / "on the 14th"
export function resolveDate(msg) {
  const s = deaccent(msg)
  const today = localTodayStr()
  if (/hom nay|\btoday\b/.test(s)) return today
  // "day after tomorrow" chứa "tomorrow" → phải xét TRƯỚC "tomorrow".
  if (/ngay mot|ngay kia|day after tomorrow|overmorrow/.test(s))
    return addDaysStr(today, 2)
  if (/ngay mai|\bmai\b|\btomorrow\b/.test(s)) return addDaysStr(today, 1)
  const wd = matchWeekday(s)
  if (wd != null) {
    const [ty, tm, td] = today.split('-').map(Number)
    const todayDow = new Date(ty, tm - 1, td).getDay()
    let add = (wd - todayDow + 7) % 7
    if (/tuan sau|tuan toi|next week/.test(s)) add += 7
    return addDaysStr(today, add)
  }
  const abs = parseDayReq(msg, false)
  if (abs) return abs
  const bm = s.match(/\bngay\s*(\d{1,2})\b|\bon the (\d{1,2})(?:st|nd|rd|th)?\b/)
  if (bm) {
    const d = Number(bm[1] || bm[2])
    if (d >= 1 && d <= 31) {
      const [ty, tm] = today.split('-')
      return `${ty}-${tm}-${pad2(d)}`
    }
  }
  return null
}

// Lấy TẤT CẢ ngày DD/MM (hoặc DD/MM/YYYY) + danh sách "ngày 12,19,26 tháng 6" trong
// câu → mảng "YYYY-MM-DD" (năm nay nếu thiếu năm). Trùng bỏ; sắp tăng dần.
export function extractDates(msg) {
  const [cy] = localTodayStr().split('-')
  const out = []
  const re = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g
  let m
  while ((m = re.exec(msg))) {
    const d = Number(m[1])
    const mo = Number(m[2])
    if (d < 1 || d > 31 || mo < 1 || mo > 12) continue
    let y = m[3] ? Number(m[3]) : Number(cy)
    if (y < 100) y += 2000
    out.push(`${y}-${pad2(mo)}-${pad2(d)}`)
  }
  // "ngày 12, 19, 26 tháng 6": danh sách NGÀY dùng chung một tháng.
  const norm = deaccent(msg)
  const tm = norm.match(/ngay\s+([\d,.\s&va]+?)\s*thang\s*(\d{1,2})/)
  if (tm) {
    const mo = Number(tm[2])
    if (mo >= 1 && mo <= 12) {
      for (const ds of tm[1].match(/\d{1,2}/g) || []) {
        const d = Number(ds)
        if (d >= 1 && d <= 31) out.push(`${cy}-${pad2(mo)}-${pad2(d)}`)
      }
    }
  }
  return [...new Set(out)].sort()
}

// ── Các parser ý định ────────────────────────────────────────────────────────

// Yêu cầu xem BẢNG CÔNG theo tháng (và tuần tuỳ chọn).
export function parseTimesheetReq(msg) {
  const norm = deaccent(msg)
  if (!/(bang cong|bang cham cong|timesheet)/.test(norm)) return null
  const m = norm.match(/thang\s*(\d{1,2})|month\s*(\d{1,2})/)
  const month = m ? Number(m[1] || m[2]) : monthNameIn(norm)
  if (month < 1 || month > 12) return null
  const w = norm.match(/tuan\s*(\d{1,2})|week\s*(\d{1,2})/)
  const y = norm.match(/(20\d{2})/)
  return {
    month,
    week: w ? Number(w[1] || w[2]) : null,
    year: y ? Number(y[1]) : null,
  }
}

// Ý ĐỊNH THÊM CA. CHỈ kích hoạt khi có ĐỘNG TỪ tạo/hẹn lịch + danh từ ca/lịch/shift,
// HOẶC đủ 2 mốc giờ. Không phải câu hỏi (?/không). Trả { date, times[], type }.
export function parseShiftIntent(msg) {
  const s = deaccent(msg)
  if (/\?|khong/.test(s)) return null
  const night = /\bdem\b|ca dem|ban dem|night/.test(s)
  const day = /ca ngay|ban ngay|day shift/.test(s)
  const addVerb =
    /(them|tao|dang ky|len lich|dat lich|lap lich|len ca|dang ca|xep (ca|lich)|add|book|schedule|set up|plan)/.test(s) &&
    /(ca|lich|shift)/.test(s)
  const times = findTimes(s)
  if (!addVerb && times.length < 2) return null
  const date = resolveDate(msg)
  const type = night ? 'night' : day ? 'day' : null
  return { date, times, type }
}

// THÊM khoản trừ: từ khoá trừ/bồi thường/deduction + số tiền + lý do (sau marker).
export function parseDeductionAdd(msg) {
  const s = deaccent(msg)
  if (!/(tru|boi thuong|khau tru|deduct|deduction|compensation|penalt|docked|\bfine)/.test(s))
    return null
  const amount = parseAmountVnd(s)
  if (!amount) return null
  const rm = s.match(/(?:ly do|vi|reason|because|due to|do|for)\s+(.+)/)
  if (!rm) return null
  let reason = rm[1]
    .replace(/\s*ngay\s*\d.*$/, '')
    .replace(/\s*on the \d.*$/, '')
    .trim()
  if (!reason) return null
  const date = parseDayReq(msg) || localTodayStr()
  return { amount, reason, date }
}

// TRA CỨU khoản trừ của một kỳ (tháng). Không tháng → kỳ hiện tại (null).
export function parseDeductionQuery(msg) {
  const s = deaccent(msg)
  if (!/(tru|boi thuong|khau tru|deduct|deduction|compensation|penalt)/.test(s))
    return null
  const m = s.match(/thang\s*(\d{1,2})|month\s*(\d{1,2})/)
  const y = s.match(/(20\d{2})/)
  const mo = m ? Number(m[1] || m[2]) : monthNameIn(s) || null
  return { month: mo, year: y ? Number(y[1]) : null }
}

// Từ khoá VIỆC NGOÀI (VN + Anh) — dùng chung cho add/query/batch.
const EXTRA_RE =
  /(thu nhap (viec )?ngoai|viec ngoai|luong ngoai|extra income|side (income|job|gig)|freelance|outside work)/

// TRA CỨU thu nhập việc ngoài của một kỳ.
export function parseExtraIncomeQuery(msg) {
  const s = deaccent(msg)
  if (!EXTRA_RE.test(s)) return null
  const m = s.match(/thang\s*(\d{1,2})|month\s*(\d{1,2})/)
  const y = s.match(/(20\d{2})/)
  const mo = m ? Number(m[1] || m[2]) : monthNameIn(s) || null
  return { month: mo, year: y ? Number(y[1]) : null }
}

// THÊM thu nhập việc ngoài: keyword + số tiền. Ngày tuỳ chọn; mặc định hôm nay.
export function parseExtraIncomeAdd(msg) {
  const s = deaccent(msg)
  if (!EXTRA_RE.test(s)) return null
  const amount = parseAmountVnd(s)
  if (!amount) return null
  const date = resolveDate(msg) || localTodayStr()
  const description = msg
    .replace(/thu nhập việc ngoài|thu nhập ngoài|việc ngoài|lương ngoài/gi, ' ')
    .replace(/extra income|side income|side job|side gig|freelance|outside work/gi, ' ')
    .replace(/\d[\d.,]*\s*(triệu|tr|nghìn|ngàn|k|đ|vnd|million|mil)?/gi, ' ')
    .replace(/ngày\s*\d{1,2}([/-]\d{1,2}([/-]\d{2,4})?)?/gi, ' ')
    .replace(/\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?/g, ' ')
    .replace(/hôm nay|ngày mai|mai|mốt|thứ\s*\d|chủ nhật|tuần sau|tuần này/gi, ' ')
    .replace(/today|tomorrow|day after tomorrow|next week|this week/gi, ' ')
    .replace(/(thêm|tạo|cho|với|mô tả|tôi|có|\badd\b|\bfor\b|\bwith\b|\bon\b)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return { date, description, amount }
}

// Nhập HÀNG LOẠT việc ngoài: NHIỀU ngày (>=2) + một số tiền (mỗi buổi).
export function parseExtraIncomeBatch(msg) {
  const s = deaccent(msg)
  if (/\btru\b|boi thuong|khau tru|deduct|penalt/.test(s)) return null // là khoản trừ
  const dates = extractDates(msg)
  if (dates.length < 2) return null
  const amount = findMoney(s)
  if (!amount || amount <= 0) return null
  const description = msg
    .replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, ' ')
    .replace(/\d{1,2}\s*[:h]\s*\d{0,2}/gi, ' ')
    .replace(/\d[\d.]*\s*(triệu|tr|nghìn|ngàn|lít|k|đ|vnd|million|mil)?/gi, ' ')
    .replace(/các ngày|mỗi buổi|mỗi ngày|mỗi lần|mỗi|buổi|làm|các|ngày|từ|đến/gi, ' ')
    .replace(/\beach\b|\bevery\b|\bday\b|\bfrom\b|\bto\b|\bon\b|\bworked?\b/gi, ' ')
    .replace(/[-,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return { dates, description, amount }
}

// Yêu cầu xem LỊCH DỰ KIẾN tuần này.
export function parsePlannedReq(msg) {
  const s = deaccent(msg)
  if (
    /lich du kien|lich tuan nay|tuan nay co lich|lich.*tuan nay|planned schedule|scheduled shifts|upcoming shifts|this week'?s schedule|schedule this week/.test(
      s
    )
  ) {
    return { scope: 'week' }
  }
  return null
}

// XÉT TÍNH KHẢ THI của mục tiêu thu nhập: từ khoá khả thi + số tiền. Hạn chót tuỳ
// chọn ("trong N ngày"/"in N days"/ngày cụ thể); mặc định hết kỳ.
export function parseFeasibilityReq(msg) {
  const s = deaccent(msg)
  if (
    !/(kha thi|co kip|kip khong|kip ko|dat duoc|co the dat|lieu co|co dat|feasible|achievable|can i (make|reach|hit|get)|is it possible|in time|will i (make|reach|hit))/.test(
      s
    )
  )
    return null
  let withinDays = null
  const wd = s.match(/trong\s*(\d{1,3})\s*ngay|(?:in|within)\s*(\d{1,3})\s*days?/)
  if (wd) withinDays = Number(wd[1] || wd[2])
  const deadline = withinDays == null ? parseDayReq(msg, false) : null
  // Bỏ "trong N ngày"/"in N days" + ngày để không nhầm thành SỐ TIỀN.
  const cleaned = s
    .replace(/trong\s*\d{1,3}\s*ngay/g, ' ')
    .replace(/(?:in|within)\s*\d{1,3}\s*days?/g, ' ')
    .replace(/\b\d{1,2}\s*[/-]\s*\d{1,2}(\s*[/-]\s*\d{2,4})?\b/g, ' ')
    .replace(new RegExp(`\\bby\\b.*$`), ' ')
  const target = parseAmountVnd(cleaned)
  if (!target) return null
  return { target, withinDays, deadline }
}

// Câu hỏi DỰ PHÓNG: "làm thêm N ca [đêm/ngày] nữa thì tổng bao nhiêu" / "how much if
// I work N more night shifts". Trả { count, type } (type 'night'|'day'|null) hoặc null.
export function parseProjectionReq(msg) {
  const s = deaccent(msg)
  if (!/(bao nhieu|tong|how much|total|\?)/.test(s)) return null
  if (!/(them|nua|\bmore\b|\bextra\b|another|additional)/.test(s)) return null
  // Cho phép "more/extra/another/additional" chen GIỮA số và đơn vị (tiếng Anh nói
  // "3 more night shifts"); tiếng Việt "3 ca đêm" (số liền đơn vị) vẫn khớp.
  const m = s.match(
    /(\d{1,3})\s*(?:more\s+|extra\s+|another\s+|additional\s+)?(ca dem|ca ngay|ca|dem|ngay|night shifts?|day shifts?|shifts?|nights?|days?)\b/
  )
  if (!m) return null
  const count = Number(m[1])
  if (!count || count < 1 || count > 100) return null
  const unit = m[2]
  const type = /dem|night/.test(unit)
    ? 'night'
    : /ngay|day/.test(unit)
      ? 'day'
      : /\bdem\b|ca dem|ban dem|night/.test(s)
        ? 'night'
        : /ca ngay|ban ngay|day shift/.test(s)
          ? 'day'
          : null
  return { count, type }
}

// Nhận diện lệnh MỞ một công cụ/màn hình. Trả khoá công cụ hoặc null. Các công cụ dễ
// trùng với thêm/tra cứu chỉ mở khi có động từ "mở/open/show…".
export function parseOpenTool(msg) {
  const s = deaccent(msg)
  // Nhập lịch / đối chiếu: không cần động từ "mở". \bimport\b tránh "important".
  if (/nhap lich|\bimport\b/.test(s)) return 'import'
  if (/doi chieu|reconcile|verify( timesheet)?/.test(s)) return 'reconcile'
  const open = /\b(mo|open|hien thi|hien|vao|toi|di toi|go to|show)\b/.test(s)
  if (!open) return null
  if (/(ho so|tai khoan|profile|account)/.test(s)) return 'profile'
  if (/(ky luong|chu ky luong|pay period)/.test(s)) return 'payPeriod'
  if (/(huong dan|tro giup|\bhelp\b|\bguide\b)/.test(s)) return 'guide'
  if (/(boi thuong|khoan tru|khau tru|den bu|compensation|deduction)/.test(s))
    return 'deductions'
  if (/(viec ngoai|thu nhap ngoai|luong ngoai|lam them|extra income|side (income|job))/.test(s))
    return 'extra'
  return null
}
