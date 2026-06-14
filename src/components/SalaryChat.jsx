import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  formatMoney,
  formatHours,
  computeEffective,
  shiftTotals,
  hhmm,
} from '../lib/shiftMath.js'
import {
  payPeriodKeyOf,
  payPeriodLabel,
  payPeriodRange,
  localTodayStr,
  sumDeductions,
} from '../lib/payPeriod.js'
import { sumExtraIncome } from '../lib/extraIncome.js'

// Gom toàn bộ HƯỚNG DẪN dùng app (từ các bước WelcomeGuide) thành text, theo đúng
// ngôn ngữ hiện tại. Gửi cho AI để trả lời câu "cách dùng" — CHỈ dựa vào đây.
function buildGuide(t) {
  const lines = [t('welcome.subtitle')]
  for (let i = 1; i <= 8; i++) {
    lines.push(`${i}. ${t(`welcome.step${i}.title`)}: ${t(`welcome.step${i}.desc`)}`)
  }
  return lines.join('\n')
}

// Bỏ dấu + đ→d + thường hoá, để khớp lệnh dù gõ có dấu hay không.
function deaccent(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
}

// Ký tự có dấu đặc trưng tiếng Việt (gồm ă â đ ê ô ơ ư và mọi nguyên âm có dấu).
const VI_DIACRITIC =
  /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i

// Từ ĐẶC TRƯNG để đoán ngôn ngữ khi câu KHÔNG có dấu (đã bỏ dấu, thường hoá).
// Chỉ chứa từ ít trùng giữa hai ngôn ngữ để hạn chế đoán sai.
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
])

// Đoán ngôn ngữ của câu: trả 'vi' | 'en' | null (null = trung tính/không chắc).
// Có dấu tiếng Việt → 'vi'. Không dấu → đếm từ đặc trưng; hơn hẳn bên nào thì theo
// bên đó, hoà/không có từ nào (vd chỉ số "200k", giờ "22h") → null để KHÔNG chặn.
function detectLang(msg) {
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

// Đọc số tiền VND từ chuỗi: "200k"/"200 nghìn"→200000, "2tr"/"2 triệu"→2000000,
// "200000"→200000. Số trần (không đơn vị) phải ≥ 1000 mới coi là tiền (tránh nhầm ngày).
function parseAmountVnd(s) {
  const m = s.match(/(\d[\d.]*)\s*(trieu|tr|nghin|ngan|lit|k)?/)
  if (!m) return null
  let n = Number(m[1].replace(/\./g, ''))
  if (!Number.isFinite(n) || n <= 0) return null
  const unit = m[2]
  if (unit === 'trieu' || unit === 'tr') n *= 1000000
  else if (unit === 'lit') n *= 100000 // "lít" = trăm nghìn (2 lít = 200.000)
  else if (unit === 'nghin' || unit === 'ngan' || unit === 'k') n *= 1000
  else if (n < 1000) return null
  return Math.round(n)
}
import { useI18n } from '../lib/i18n.jsx'
import TimesheetTable from './TimesheetTable.jsx'

function pad2(n) {
  return String(n).padStart(2, '0')
}

// Thứ 2 (đầu tuần) của tuần chứa ngày — giống TimesheetTable để đánh số tuần khớp.
function mondayOf(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dow = (dt.getDay() + 6) % 7
  dt.setDate(dt.getDate() - dow)
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`
}

// Cộng n ngày vào "YYYY-MM-DD" (theo lịch địa phương).
function addDaysStr(dateStr, n) {
  const [y, m, d] = String(dateStr).split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`
}

// "YYYY-MM-DD" -> "DD/MM/YYYY"
function dmy(d) {
  const [y, m, dd] = String(d).split('-')
  return `${dd}/${m}/${y}`
}

// Nhận diện yêu cầu xem BẢNG CÔNG theo tháng (và tuần tuỳ chọn). Bỏ dấu để khớp
// "bảng công tháng 3 tuần 2" dù gõ có dấu hay không. Trả {month, week, year} hoặc null.
function parseTimesheetReq(msg) {
  const norm = msg
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
  if (!/(bang cong|bang cham cong|timesheet)/.test(norm)) return null
  const m = norm.match(/thang\s*(\d{1,2})/)
  if (!m) return null
  const month = Number(m[1])
  if (month < 1 || month > 12) return null
  const w = norm.match(/tuan\s*(\d{1,2})/)
  const y = norm.match(/(20\d{2})/)
  return { month, week: w ? Number(w[1]) : null, year: y ? Number(y[1]) : null }
}

// Nhận diện yêu cầu hỏi MỘT NGÀY cụ thể: "10/6", "10-6-2026", hoặc "ngày 10 tháng 6".
// Trả "YYYY-MM-DD" hoặc null. (Mặc định năm hiện tại nếu không ghi.)
function parseDayReq(msg, adjustPast = true) {
  const norm = msg
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
  let m = norm.match(/\b(\d{1,2})\s*[/-]\s*(\d{1,2})(?:\s*[/-]\s*(\d{2,4}))?\b/)
  if (!m) m = norm.match(/ngay\s*(\d{1,2})\s*thang\s*(\d{1,2})(?:\D*?(\d{4}))?/)
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2])
  if (day < 1 || day > 31 || month < 1 || month > 12) return null
  let year = m[3] ? Number(m[3]) : null
  if (year && year < 100) year += 2000
  if (!year) {
    // Không ghi năm → mặc định năm nay. Với CÂU HỎI (adjustPast), nếu ngày suy ra
    // ở TƯƠNG LAI thì hiểu là năm trước (lần gần nhất đã qua). Với THÊM CA thì giữ
    // năm nay để ngày tương lai vẫn là tương lai (→ lịch dự kiến).
    const now = new Date()
    year = now.getFullYear()
    if (adjustPast && new Date(year, month - 1, day) > now) year -= 1
  }
  return `${year}-${pad2(month)}-${pad2(day)}`
}

// Tìm tối đa 2 mốc giờ trong câu: "22:00", "22h", "22h30", "9h", "06:00".
function findTimes(s) {
  const re = /(\d{1,2})\s*(?::|h|gio)\s*(\d{2})?/g
  const out = []
  let m
  while ((m = re.exec(s)) && out.length < 2) {
    const hh = Number(m[1])
    const mm = m[2] ? Number(m[2]) : 0
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) out.push(`${pad2(hh)}:${pad2(mm)}`)
  }
  return out
}

// "thu 7"/"thu bay" → 6 (getDay Thứ 7), "chu nhat"/"cn" → 0. Null nếu không có.
function matchWeekday(s) {
  const map = { 2: 1, hai: 1, 3: 2, ba: 2, 4: 3, tu: 3, 5: 4, nam: 4, 6: 5, sau: 5, 7: 6, bay: 6 }
  const m = s.match(/\bthu\s*(2|3|4|5|6|7|hai|ba|tu|nam|sau|bay)\b/)
  if (m) return map[m[1]]
  if (/\bchu nhat\b|\bcn\b/.test(s)) return 0
  return null
}

// Suy ra NGÀY TUYỆT ĐỐI ("YYYY-MM-DD") từ câu, dựa trên HÔM NAY:
//  - tương đối: hôm nay / mai / mốt (ngày kia)
//  - thứ: "thứ 6", kèm "tuần này" / "tuần sau" (mặc định lần gần nhất sắp tới)
//  - tuyệt đối: DD/MM, "ngày D tháng M"
//  - ngày trần: "ngày 14" hoặc số ngày còn lại sau khi bỏ mốc giờ
// Trả null nếu không xác định được ngày.
function resolveDate(msg) {
  const s = deaccent(msg)
  const today = localTodayStr()
  if (/hom nay/.test(s)) return today
  if (/ngay mai|\bmai\b/.test(s)) return addDaysStr(today, 1)
  if (/ngay mot|ngay kia/.test(s)) return addDaysStr(today, 2)
  const wd = matchWeekday(s)
  if (wd != null) {
    const [ty, tm, td] = today.split('-').map(Number)
    const todayDow = new Date(ty, tm - 1, td).getDay()
    let add = (wd - todayDow + 7) % 7
    if (/tuan sau|tuan toi/.test(s)) add += 7
    return addDaysStr(today, add)
  }
  const abs = parseDayReq(msg, false)
  if (abs) return abs
  const bm = s.match(/\bngay\s*(\d{1,2})\b/)
  if (bm && Number(bm[1]) >= 1 && Number(bm[1]) <= 31) {
    const [ty, tm] = today.split('-')
    return `${ty}-${tm}-${pad2(Number(bm[1]))}`
  }
  return null
}

// Ý ĐỊNH THÊM CA từ câu tự nhiên. Kích hoạt khi có loại ca ("đêm"/"ca ngày") HOẶC
// động từ thêm/tạo + ca; KHÔNG phải câu hỏi. Trả { date, times[], type } — phần nào
// thiếu để null/[] và chatbot sẽ hỏi lại. type: 'night'|'day'|null.
function parseShiftIntent(msg) {
  const s = deaccent(msg)
  if (/\?|khong/.test(s)) return null
  const night = /\bdem\b|ca dem|ban dem/.test(s)
  const day = /ca ngay|ban ngay/.test(s)
  const addVerb = /(them|tao|dang ky|add)/.test(s) && /(ca|lich|shift)/.test(s)
  if (!night && !day && !addVerb) return null
  const date = resolveDate(msg)
  const times = findTimes(s)
  const type = night ? 'night' : day ? 'day' : null
  // Tránh nhận nhầm câu mơ hồ: cần có loại ca, hoặc đủ 2 mốc giờ, hoặc ngày rõ.
  if (!type && times.length < 2 && !date) return null
  return { date, times, type }
}

// Yêu cầu THÊM khoản trừ: cần từ khoá "trừ/bồi thường" + số tiền (≥1000 hoặc có
// đơn vị) + lý do (sau "lý do"/"vì"/"do"). Ngày tuỳ chọn (mặc định hôm nay).
function parseDeductionAdd(msg) {
  const s = deaccent(msg)
  if (!/(tru|boi thuong|khau tru)/.test(s)) return null
  const amount = parseAmountVnd(s)
  if (!amount) return null
  const rm = s.match(/(?:ly do|vi|do)\s+(.+)/)
  if (!rm) return null
  let reason = rm[1].replace(/\s*ngay\s*\d.*$/, '').trim()
  if (!reason) return null
  const date = parseDayReq(msg) || localTodayStr()
  return { amount, reason, date }
}

// Yêu cầu TRA CỨU khoản trừ của một kỳ (tháng). Không có tháng → kỳ hiện tại.
function parseDeductionQuery(msg) {
  const s = deaccent(msg)
  if (!/(tru|boi thuong|khau tru)/.test(s)) return null
  const m = s.match(/thang\s*(\d{1,2})/)
  const y = s.match(/(20\d{2})/)
  return { month: m ? Number(m[1]) : null, year: y ? Number(y[1]) : null }
}

// Yêu cầu TRA CỨU thu nhập việc ngoài của một kỳ (tháng). Keyword việc ngoài +
// KHÔNG có số tiền để thêm (câu hỏi). Không tháng → kỳ hiện tại.
function parseExtraIncomeQuery(msg) {
  const s = deaccent(msg)
  if (!/(thu nhap (viec )?ngoai|viec ngoai|luong ngoai)/.test(s)) return null
  const m = s.match(/thang\s*(\d{1,2})/)
  const y = s.match(/(20\d{2})/)
  return { month: m ? Number(m[1]) : null, year: y ? Number(y[1]) : null }
}

// Yêu cầu THÊM thu nhập việc ngoài: keyword "thu nhập ngoài/việc ngoài" + số tiền.
// Ngày tuỳ chọn (hiểu mai/thứ…); mặc định hôm nay. Mô tả lấy phần chữ còn lại.
function parseExtraIncomeAdd(msg) {
  const s = deaccent(msg)
  if (!/(thu nhap (viec )?ngoai|viec ngoai|luong ngoai)/.test(s)) return null
  const amount = parseAmountVnd(s)
  if (!amount) return null
  const date = resolveDate(msg) || localTodayStr()
  const description = msg
    .replace(/thu nhập việc ngoài|thu nhập ngoài|việc ngoài|lương ngoài/gi, ' ')
    .replace(/\d[\d.,]*\s*(triệu|tr|nghìn|ngàn|k|đ|vnd)?/gi, ' ')
    .replace(/ngày\s*\d{1,2}([/-]\d{1,2}([/-]\d{2,4})?)?/gi, ' ')
    .replace(/\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?/g, ' ')
    .replace(/hôm nay|ngày mai|mai|mốt|thứ\s*\d|chủ nhật|tuần sau|tuần này/gi, ' ')
    .replace(/(thêm|tạo|cho|với|mô tả|tôi|có)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return { date, description, amount }
}

// Tìm SỐ TIỀN trong câu, BỎ QUA giờ ("14h"/"16:00"). Ưu tiên số có đơn vị tiền;
// nếu không, số ≥ 4 chữ số (không phải giờ). Trả số nguyên VND hoặc null.
function findMoney(s) {
  let m = s.match(/(\d[\d.]*)\s*(trieu|tr|nghin|ngan|lit|k)\b/)
  if (m) {
    let n = Number(m[1].replace(/\./g, ''))
    const u = m[2]
    if (u === 'trieu' || u === 'tr') n *= 1000000
    else if (u === 'lit') n *= 100000
    else n *= 1000
    return Math.round(n)
  }
  m = s.match(/(\d{4,})(?!\s*[:h])/) // số lớn không theo sau bởi : hoặc h
  if (m) return Number(m[1])
  return null
}

// Lấy TẤT CẢ ngày dạng DD/MM (hoặc DD/MM/YYYY) trong câu → mảng "YYYY-MM-DD" (năm
// nay nếu thiếu năm; KHÔNG lùi năm vì đây là ngày lịch). Trùng → bỏ; sắp tăng dần.
function extractDates(msg) {
  const [cy] = localTodayStr().split('-')
  const out = []
  // 1) Dạng DD/MM hoặc DD/MM/YYYY (mỗi ngày ghi rõ tháng).
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
  // 2) Dạng "ngày 12, 19, 26 tháng 6": danh sách NGÀY dùng chung một tháng. Lấy
  // các số nằm giữa "ngày … tháng M" làm ngày, năm nay nếu không ghi.
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

// Nhập HÀNG LOẠT việc ngoài: NHIỀU ngày (>=2) + một số tiền (mỗi buổi). vd:
// "các ngày 12/6, 19/6, 26/6 làm AC mỗi buổi 200k". Mỗi ngày = 1 khoản cùng tiền.
function parseExtraIncomeBatch(msg) {
  const s = deaccent(msg)
  if (/\btru\b|boi thuong|khau tru/.test(s)) return null // đó là khoản trừ, không phải việc ngoài
  const dates = extractDates(msg)
  if (dates.length < 2) return null
  const amount = findMoney(s)
  if (!amount || amount <= 0) return null
  const description = msg
    .replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, ' ')
    .replace(/\d{1,2}\s*[:h]\s*\d{0,2}/gi, ' ')
    .replace(/\d[\d.]*\s*(triệu|tr|nghìn|ngàn|lít|k|đ|vnd)?/gi, ' ')
    .replace(/các ngày|mỗi buổi|mỗi ngày|mỗi lần|mỗi|buổi|làm|các|ngày|từ|đến/gi, ' ')
    .replace(/[-,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return { dates, description, amount }
}

// Yêu cầu xem LỊCH DỰ KIẾN tuần này.
function parsePlannedReq(msg) {
  const s = deaccent(msg)
  if (/lich du kien|lich tuan nay|tuan nay co lich|lich.*tuan nay/.test(s)) {
    return { scope: 'week' }
  }
  return null
}

// Số ngày từ a→b (cùng "YYYY-MM-DD", theo lịch địa phương). b-a; âm nếu b trước a.
function daysBetween(a, b) {
  const [ay, am, ad] = String(a).split('-').map(Number)
  const [by, bm, bd] = String(b).split('-').map(Number)
  return Math.round(
    (new Date(by, bm - 1, bd) - new Date(ay, am - 1, ad)) / 86400000
  )
}

// XÉT TÍNH KHẢ THI của mục tiêu thu nhập: cần từ khoá khả thi/kịp/đạt được + số
// tiền. Hạn chót tuỳ chọn: "trong N ngày" hoặc một ngày cụ thể; mặc định hết kỳ
// hiện tại. Trả { target, withinDays, deadline } hoặc null.
function parseFeasibilityReq(msg) {
  const s = deaccent(msg)
  if (!/(kha thi|co kip|kip khong|kip ko|dat duoc|co the dat|lieu co|co dat)/.test(s))
    return null
  let withinDays = null
  const wd = s.match(/trong\s*(\d{1,3})\s*ngay/)
  if (wd) withinDays = Number(wd[1])
  const deadline = withinDays == null ? parseDayReq(msg, false) : null
  // Bỏ phần "trong N ngày" và ngày hạn chót để không nhầm thành SỐ TIỀN.
  const cleaned = s
    .replace(/trong\s*\d{1,3}\s*ngay/g, ' ')
    .replace(/\b\d{1,2}\s*[/-]\s*\d{1,2}(\s*[/-]\s*\d{2,4})?\b/g, ' ')
  const target = parseAmountVnd(cleaned)
  if (!target) return null
  return { target, withinDays, deadline }
}

// Nhận diện lệnh MỞ một công cụ/màn hình của web. Trả khoá công cụ hoặc null.
// Các công cụ dễ trùng với thêm/tra cứu (bồi thường, việc ngoài, nhập lịch, đối
// chiếu) chỉ mở khi có động từ "mở/xem/vào…" để không nuốt câu thêm/hỏi dữ liệu.
function parseOpenTool(msg) {
  const s = deaccent(msg)
  // Nhập lịch / đối chiếu: giữ như cũ (không cần động từ "mở").
  if (/nhap lich/.test(s)) return 'import'
  if (/doi chieu/.test(s)) return 'reconcile'
  // Còn lại CẦN động từ "mở/xem…" để không nuốt câu HỎI ("kỳ lương này bao nhiêu",
  // "cách dùng …") hay câu THÊM/TRA CỨU (bồi thường, việc ngoài).
  const open = /\b(mo|open|hien thi|hien|vao|toi|di toi)\b/.test(s)
  if (!open) return null
  if (/(ho so|tai khoan|profile|account)/.test(s)) return 'profile'
  if (/(ky luong|chu ky luong|pay period)/.test(s)) return 'payPeriod'
  if (/(huong dan|tro giup|\bhelp\b|\bguide\b)/.test(s)) return 'guide'
  if (/(boi thuong|khoan tru|khau tru|den bu)/.test(s)) return 'deductions'
  if (/(viec ngoai|thu nhap ngoai|luong ngoai|lam them)/.test(s)) return 'extra'
  return null
}

// Trợ lý lương: AI hiểu câu hỏi + diễn đạt; phép TÍNH số ca cần làm do CODE tính
// (chính xác) dựa trên số liệu lịch sử (snapshot). Bảng công / chi tiết ngày /
// bồi thường / lịch dự kiến đều xử lý tại client từ dữ liệu (không gọi AI).
export default function SalaryChat({
  open = true,
  snapshot,
  shifts = [],
  deductions = [],
  extraIncome = [],
  onAddDeduction,
  onAddExtraIncome,
  onAddShift,
  onOpenImport,
  onOpenReconcile,
  onOpenDeductions,
  onOpenExtraIncome,
  onOpenPayPeriod,
  onOpenProfile,
  onOpenGuide,
  onClose,
}) {
  const { t, lang } = useI18n()
  const [messages, setMessages] = useState([
    { role: 'bot', text: t('chat.intro') },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState(null) // { date } đang chờ nhập giờ ca ngày
  const [pos, setPos] = useState(null) // {x,y}; null = vị trí mặc định (góc dưới phải)
  const listRef = useRef(null)
  const cardRef = useRef(null)
  const dragRef = useRef(null) // { dx, dy } khi đang kéo

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Kéo cửa sổ chat (nổi như bong bóng). Lắng nghe toàn cục, chỉ hoạt động khi
  // đang kéo (dragRef đã set ở startDrag).
  useEffect(() => {
    function move(e) {
      if (!dragRef.current) return
      const w = cardRef.current?.offsetWidth || 320
      let x = e.clientX - dragRef.current.dx
      let y = e.clientY - dragRef.current.dy
      x = Math.max(4, Math.min(x, window.innerWidth - w))
      y = Math.max(4, Math.min(y, window.innerHeight - 48))
      setPos({ x, y })
    }
    function up() {
      dragRef.current = null
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [])

  // Bắt đầu kéo từ thanh tiêu đề (bỏ qua khi bấm nút đóng).
  function startDrag(e) {
    if (e.target.closest('.modal-close, .chat-menu-btn')) return
    const rect = cardRef.current.getBoundingClientRect()
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
    if (!pos) setPos({ x: rect.left, y: rect.top })
  }

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight)
  }, [messages, busy])

  // Tính số GIỜ cần làm để đạt mục tiêu, dựa trên LƯƠNG 1 GIỜ (đơn giá ngày/đêm) —
  // CODE tính, không để AI tính. Trả về: cần ~X giờ nếu làm toàn ca ngày, ~Y giờ nếu
  // làm toàn ca đêm (đêm trả cao hơn → cần ít giờ hơn), hoặc kết hợp (tổng giờ nằm giữa).
  function buildEstimate(target) {
    const cur = snapshot.currentPay || 0
    const remaining = Math.max(0, target - cur)
    if (remaining <= 0)
      return t('chat.alreadyReached', { target: formatMoney(target) })
    const dayRate = snapshot.dayRate || 0
    if (!dayRate) return t('chat.noRate')

    const ceil1 = (h) => Math.ceil(h * 10) / 10 // làm tròn LÊN 0.1h để đủ mục tiêu
    const nightRate = snapshot.nightRate || 0
    const hasNight = snapshot.hasNightShift && nightRate > dayRate

    const lines = [
      t('chat.estHeader', {
        target: formatMoney(target),
        current: formatMoney(cur),
        remaining: formatMoney(remaining),
      }),
      t('chat.estDayLine', {
        rate: formatMoney(dayRate),
        hours: ceil1(remaining / dayRate),
      }),
    ]
    if (hasNight) {
      lines.push(
        t('chat.estNightLine', {
          rate: formatMoney(nightRate),
          hours: ceil1(remaining / nightRate),
        })
      )
      lines.push(t('chat.estMix'))
    }
    return lines.join('\n')
  }

  // XÉT KHẢ THI: trả lời CÓ/KHÔNG đạt mục tiêu trước hạn chót, kèm số CA cần làm.
  // CODE tính (không để AI tính): dựa trên lương 1 giờ + thời lượng ca trung bình
  // của chính người dùng. Hạn chót mặc định = ngày chốt kỳ lương hiện tại.
  function buildFeasibility({ target, withinDays, deadline }) {
    const cur = snapshot.currentPay || 0
    const remaining = Math.max(0, target - cur)
    if (remaining <= 0)
      return t('chat.alreadyReached', { target: formatMoney(target) })
    const dayRate = snapshot.dayRate || 0
    if (!dayRate) return t('chat.noRate')

    const nightRate = snapshot.nightRate || 0
    const hasNight = snapshot.hasNightShift && nightRate > dayRate
    const bestRate = hasNight ? nightRate : dayRate // đêm trả cao hơn → cần ít giờ hơn

    // Hạn chót: "trong N ngày" → cộng N ngày; ngày cụ thể → dùng luôn; mặc định →
    // ngày chốt kỳ lương hiện tại.
    const today = localTodayStr()
    let endDate
    if (withinDays != null) endDate = addDaysStr(today, withinDays)
    else if (deadline) endDate = deadline
    else endDate = payPeriodRange(payPeriodKeyOf(today)).end
    const daysLeft = daysBetween(today, endDate) + 1 // kể cả hôm nay
    if (daysLeft <= 0)
      return t('chat.feasEnded', { target: formatMoney(target) })

    const ceil1 = (h) => Math.ceil(h * 10) / 10
    const hoursNeeded = ceil1(remaining / bestRate)
    // Thời lượng ca điển hình của chính người dùng (fallback 8 giờ cho người mới).
    const typicalShift =
      snapshot.avgHoursPerShift > 0 ? snapshot.avgHoursPerShift : 8
    const shiftsNeeded = Math.ceil(hoursNeeded / typicalShift)
    const perDay = ceil1(hoursNeeded / daysLeft) // số giờ phải làm trung bình mỗi ngày

    // Verdict theo SỐ GIỜ/NGÀY phải làm (so với 1 ngày công ~8 giờ): khả thi nếu
    // không vượt quá sức làm thực tế trong số ngày còn lại.
    const feasible = perDay <= 11 // tới ~11 giờ/ngày vẫn còn làm được (có tăng ca)
    let verdict
    if (perDay <= 6) verdict = t('chat.feasEasy')
    else if (perDay <= 8) verdict = t('chat.feasOk')
    else if (perDay <= 11) verdict = t('chat.feasHard')
    else verdict = t('chat.feasNo', { perDay })

    const lines = [
      `${feasible ? '✅' : '❌'} ${t(feasible ? 'chat.feasYes' : 'chat.feasNoTitle', { target: formatMoney(target) })}`,
      t('chat.feasHeader', {
        current: formatMoney(cur),
        remaining: formatMoney(remaining),
        deadline: dmy(endDate),
        days: daysLeft,
      }),
      t('chat.feasNeed', {
        shifts: shiftsNeeded,
        hours: hoursNeeded,
        rate: formatMoney(bestRate),
        perDay,
      }),
      verdict,
    ]
    return lines.join('\n')
  }

  // Xuất bảng công cho 1 kỳ (tháng) hoặc 1 tuần trong kỳ — render TimesheetTable
  // ngay trong khung chat. Tuần bắt đầu Thứ 2, đánh số theo ca đã chấm công.
  function handleTimesheet({ month, week, year }) {
    const key = `${year || new Date().getFullYear()}-${pad2(month)}`
    const periodShifts = (shifts || []).filter(
      (s) => payPeriodKeyOf(s.work_date) === key
    )
    const checkedIn = periodShifts.filter((s) => s.start_time)
    if (checkedIn.length === 0) {
      setMessages((m) => [
        ...m,
        { role: 'bot', text: t('chat.tsEmpty', { label: payPeriodLabel(key) }) },
      ])
      return
    }
    let chosen = periodShifts
    let label = payPeriodLabel(key)
    if (week) {
      const mondays = [...new Set(checkedIn.map((s) => mondayOf(s.work_date)))].sort()
      const mon = mondays[week - 1]
      if (!mon) {
        setMessages((m) => [
          ...m,
          { role: 'bot', text: t('chat.tsNoWeek', { week, label }) },
        ])
        return
      }
      chosen = periodShifts.filter((s) => mondayOf(s.work_date) === mon)
      label = `${label} · ${t('tt.week', { n: week })}`
    }
    setMessages((m) => [
      ...m,
      {
        role: 'bot',
        wide: true,
        node: (
          <div className="chat-ts">
            <div className="chat-ts-title">{t('chat.tsTitle', { label })}</div>
            <TimesheetTable shifts={chosen} />
          </div>
        ),
      },
    ])
  }

  // Trả lời chi tiết MỘT NGÀY: có ca không, giờ vào/ra, làm mấy giờ, lương.
  function handleDay(date) {
    const dmy = (d) => {
      const [y, m, dd] = d.split('-')
      return `${dd}/${m}/${y}`
    }
    const rows = (shifts || []).filter((s) => s.work_date === date)
    if (rows.length === 0) {
      setMessages((m) => [
        ...m,
        { role: 'bot', text: t('chat.dayNone', { date: dmy(date) }) },
      ])
      return
    }
    const worked = rows.filter((s) => s.start_time)
    if (worked.length === 0) {
      const s = rows.find((x) => x.scheduled_start) || rows[0]
      const sched = `${hhmm(s.scheduled_start) || '—'} – ${hhmm(s.scheduled_end) || '—'}`
      setMessages((m) => [
        ...m,
        { role: 'bot', text: t('chat.dayPlanned', { date: dmy(date), sched }) },
      ])
      return
    }
    const lines = [t('chat.dayHeader', { date: dmy(date) })]
    let totH = 0
    let totPay = 0
    for (const s of worked) {
      const eff = computeEffective(
        hhmm(s.scheduled_start),
        hhmm(s.scheduled_end),
        hhmm(s.start_time),
        hhmm(s.end_time),
        !!s.is_holiday
      )
      totH += eff.decimalHours
      totPay += eff.pay
      lines.push(
        t('chat.dayShiftLine', {
          in: hhmm(s.start_time),
          out: hhmm(s.end_time) || '—',
          hours: formatHours(eff.decimalHours),
          pay: formatMoney(eff.pay),
        })
      )
    }
    if (worked.length > 1) {
      lines.push(
        t('chat.dayTotal', { hours: formatHours(totH), pay: formatMoney(totPay) })
      )
    }
    setMessages((m) => [...m, { role: 'bot', text: lines.join('\n') }])
  }

  const bot = (text) => setMessages((m) => [...m, { role: 'bot', text }])

  // Ca ngày không ghi giờ → hỏi chọn: 6–14, 14–22, hoặc Giờ khác (tự nhập).
  function pushDayChoice(date) {
    setMessages((m) => [
      ...m,
      {
        role: 'bot',
        node: (
          <div className="chat-choice">
            <div>{t('chat.askDayTimes', { date: dmy(date) })}</div>
            <div className="chat-choice-btns">
              <button
                type="button"
                onClick={() => pushShiftConfirm({ date, start: '06:00', end: '14:00' })}
              >
                06:00–14:00
              </button>
              <button
                type="button"
                onClick={() => pushShiftConfirm({ date, start: '14:00', end: '22:00' })}
              >
                14:00–22:00
              </button>
              <button
                type="button"
                onClick={() => {
                  setPending({ date })
                  bot(t('chat.askDayCustom'))
                }}
              >
                {t('chat.otherHours')}
              </button>
            </div>
          </div>
        ),
      },
    ])
  }

  // THÊM CA qua chat. Ngày TƯƠNG LAI → lưu lịch dự kiến (scheduled_*, chưa chấm
  // công). Ngày hôm nay/quá khứ → lưu ca thực tế (start/end).
  async function handleAddShift({ date, start, end }) {
    if (!onAddShift) return bot(t('chat.error'))
    const future = date > localTodayStr()
    const shift = future
      ? {
          work_date: date,
          start_time: null,
          end_time: null,
          scheduled_start: start,
          scheduled_end: end,
          is_holiday: false,
        }
      : {
          work_date: date,
          start_time: start,
          end_time: end,
          scheduled_start: null,
          scheduled_end: null,
          is_holiday: false,
        }
    setBusy(true)
    const err = await onAddShift(shift)
    setBusy(false)
    if (err) bot(t('chat.addShiftErr', { err }))
    else
      bot(
        t(future ? 'chat.addShiftPlanned' : 'chat.addShiftActual', {
          date: dmy(date),
          start,
          end,
        })
      )
  }

  // Hoàn tất 1 ý định thêm ca: đủ giờ → THẺ XÁC NHẬN; ca đêm → 22:00–06:00; ca ngày
  // → hỏi chọn giờ; còn lại (thiếu giờ) → hỏi giờ vào/ra. (Đã có ngày tới đây.)
  function finalizeShift({ date, times, type }) {
    // Cửa hàng không có ca đêm (hồ sơ has_night_shift = false) → "ca đêm" vẫn coi là
    // ca ngày: hỏi chọn giờ ngày thay vì mặc định 22:00–06:00.
    if (type === 'night' && !snapshot?.hasNightShift) type = 'day'
    if (times && times.length >= 2) {
      pushShiftConfirm({ date, start: times[0], end: times[1] })
    } else if (type === 'day') {
      pushDayChoice(date)
    } else {
      // Ca đêm (hoặc chưa rõ loại) → KHÔNG cố định 22:00–06:00; hỏi giờ vào/ra để
      // lấy dữ liệu thật của ca.
      setPending({ date, awaiting: 'times' })
      bot(t('chat.askTimes'))
    }
  }

  // Thẻ XÁC NHẬN ca trước khi ghi DB — đồng nhất với thu nhập việc ngoài. Ngày
  // tương lai → ghi rõ "Ca dự kiến".
  function pushShiftConfirm({ date, start, end }) {
    const planned = date > localTodayStr()
    setMessages((m) => [
      ...m,
      {
        role: 'bot',
        node: (
          <div className="chat-confirm">
            <div className="chat-confirm-line">
              <strong>
                {t(planned ? 'chat.confirmPlannedShift' : 'chat.confirmShift')}
              </strong>
              {` · ${dmy(date)} · ${start}–${end || '—'}`}
            </div>
            <div className="chat-choice-btns">
              <button
                type="button"
                onClick={() => handleAddShift({ date, start, end })}
              >
                {t('chat.save')}
              </button>
              <button type="button" onClick={() => bot(t('chat.editPrompt'))}>
                {t('chat.edit')}
              </button>
            </div>
          </div>
        ),
      },
    ])
  }

  // THÊM khoản trừ qua chat → ghi DB (period_key suy từ ngày bị trừ).
  async function handleAddDeduction({ amount, reason, date }) {
    if (!onAddDeduction) return bot(t('chat.error'))
    setBusy(true)
    const key = payPeriodKeyOf(date)
    const err = await onAddDeduction(key, amount, reason, date)
    setBusy(false)
    if (err) bot(t('chat.dedAddErr', { err }))
    else
      bot(
        t('chat.dedAdded', {
          amount: formatMoney(amount),
          reason,
          date: dmy(date),
          label: payPeriodLabel(key),
        })
      )
  }

  // THÊM thu nhập việc ngoài qua chat. Ngày tương lai → dự kiến (chưa nhận).
  async function handleAddExtraIncome({ date, description, amount }) {
    if (!onAddExtraIncome) return bot(t('chat.error'))
    setBusy(true)
    const err = await onAddExtraIncome({ date, description, amount })
    setBusy(false)
    if (err) return bot(t('chat.extraAddErr', { err }))
    const planned = date > localTodayStr()
    bot(
      t(planned ? 'chat.extraAddedPlanned' : 'chat.extraAdded', {
        amount: formatMoney(amount),
        desc: description || '—',
        date: dmy(date),
      })
    )
  }

  // Thẻ XÁC NHẬN việc ngoài trước khi ghi DB — để bắt lỗi phân loại nhầm / sai tiền.
  function pushExtraConfirm({ date, description, amount }) {
    setMessages((m) => [
      ...m,
      {
        role: 'bot',
        node: (
          <div className="chat-confirm">
            <div className="chat-confirm-line">
              <strong>{t('extra.title')}</strong>
              {` · ${dmy(date)} · ${description || '—'} · ${formatMoney(amount)}`}
            </div>
            <div className="chat-choice-btns">
              <button
                type="button"
                onClick={() => handleAddExtraIncome({ date, description, amount })}
              >
                {t('chat.save')}
              </button>
              <button type="button" onClick={() => bot(t('chat.editPrompt'))}>
                {t('chat.edit')}
              </button>
            </div>
          </div>
        ),
      },
    ])
  }

  // Ghi NHIỀU khoản việc ngoài (mỗi ngày 1 khoản, cùng tiền).
  async function handleAddExtraBatch(dates, description, amount) {
    if (!onAddExtraIncome) return bot(t('chat.error'))
    setBusy(true)
    let ok = 0
    for (const date of dates) {
      const err = await onAddExtraIncome({ date, description, amount })
      if (!err) ok++
    }
    setBusy(false)
    bot(t('chat.extraBatchDone', { ok, total: dates.length }))
  }

  // Thẻ XÁC NHẬN nhập HÀNG LOẠT: liệt kê tất cả ngày + tiền/buổi, Lưu một lần.
  function pushExtraBatchConfirm({ dates, description, amount }) {
    const today = localTodayStr()
    setMessages((m) => [
      ...m,
      {
        role: 'bot',
        node: (
          <div className="chat-confirm">
            <div className="chat-confirm-line">
              <strong>{t('extra.title')}</strong>
              {` × ${dates.length} · ${description || '—'} · ${formatMoney(amount)}${t('chat.perTime')}`}
            </div>
            <ul className="chat-confirm-list">
              {dates.map((d) => (
                <li key={d}>
                  {dmy(d)}
                  {d > today ? ` · ${t('extra.plannedBadge')}` : ''}
                </li>
              ))}
            </ul>
            <div className="chat-choice-btns">
              <button
                type="button"
                onClick={() => handleAddExtraBatch(dates, description, amount)}
              >
                {t('chat.saveAll')}
              </button>
              <button type="button" onClick={() => bot(t('chat.editPrompt'))}>
                {t('chat.edit')}
              </button>
            </div>
          </div>
        ),
      },
    ])
  }

  // TRA CỨU khoản trừ của một kỳ: liệt kê + tổng + thực nhận sau trừ.
  function handleDeductionQuery({ month, year }) {
    const key = month
      ? `${year || new Date().getFullYear()}-${pad2(month)}`
      : payPeriodKeyOf(localTodayStr())
    const label = payPeriodLabel(key)
    const list = (deductions || []).filter((d) => d.period_key === key)
    if (list.length === 0) return bot(t('chat.dedNone', { label }))
    const sorted = [...list].sort((a, b) =>
      String(a.deduct_date).localeCompare(String(b.deduct_date))
    )
    const total = sumDeductions(list)
    const gross = shiftTotals(
      (shifts || []).filter((s) => payPeriodKeyOf(s.work_date) === key)
    ).pay
    const lines = [t('chat.dedHeader', { label, total: formatMoney(total) })]
    for (const d of sorted)
      lines.push(
        t('chat.dedLine', {
          date: dmy(d.deduct_date),
          reason: d.reason || '—',
          amount: formatMoney(d.amount),
        })
      )
    lines.push(t('chat.dedNet', { net: formatMoney(gross - total) }))
    bot(lines.join('\n'))
  }

  // TRA CỨU thu nhập việc ngoài của một kỳ: liệt kê + tổng thực nhận + dự kiến.
  function handleExtraIncomeQuery({ month, year }) {
    const key = month
      ? `${year || new Date().getFullYear()}-${pad2(month)}`
      : payPeriodKeyOf(localTodayStr())
    const label = payPeriodLabel(key)
    const list = (extraIncome || []).filter(
      (x) => payPeriodKeyOf(x.date) === key
    )
    if (list.length === 0) return bot(t('chat.extraNone', { label }))
    const today = localTodayStr()
    const sorted = [...list].sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    )
    const realized = sumExtraIncome(list.filter((x) => x.date <= today))
    const planned = sumExtraIncome(list.filter((x) => x.date > today))
    const lines = [t('chat.extraHeader', { label, total: formatMoney(realized) })]
    for (const x of sorted)
      lines.push(
        t('chat.extraLine', {
          date: dmy(x.date),
          desc: x.description || '—',
          amount: formatMoney(x.amount),
        }) + (x.date > today ? ` · ${t('extra.plannedBadge')}` : '')
      )
    if (planned > 0) lines.push(t('chat.extraPlannedLine', { amount: formatMoney(planned) }))
    bot(lines.join('\n'))
  }

  // LỊCH DỰ KIẾN tuần này (các ca có scheduled_*).
  function handlePlanned() {
    const mon = mondayOf(localTodayStr())
    const week = new Set(Array.from({ length: 7 }, (_, i) => addDaysStr(mon, i)))
    const planned = (shifts || [])
      .filter((s) => s.scheduled_start && week.has(s.work_date))
      .sort((a, b) => String(a.work_date).localeCompare(String(b.work_date)))
    if (planned.length === 0) return bot(t('chat.plannedNone'))
    const lines = [t('chat.plannedHeader')]
    for (const s of planned)
      lines.push(
        t('chat.plannedLine', {
          date: dmy(s.work_date),
          sched: `${hhmm(s.scheduled_start)}–${hhmm(s.scheduled_end) || '—'}`,
        })
      )
    bot(lines.join('\n'))
  }

  // MỞ một công cụ/màn hình của web từ chat (báo 1 dòng rồi gọi callback của App).
  function openTool(key) {
    const map = {
      import: [onOpenImport, 'chat.openImport'],
      reconcile: [onOpenReconcile, 'chat.openReconcile'],
      deductions: [onOpenDeductions, 'chat.openDeductions'],
      extra: [onOpenExtraIncome, 'chat.openExtra'],
      payPeriod: [onOpenPayPeriod, 'chat.openPayPeriod'],
      profile: [onOpenProfile, 'chat.openProfile'],
      guide: [onOpenGuide, 'chat.openGuide'],
    }
    const [cb, msgKey] = map[key] || []
    if (!cb) return bot(t('chat.error'))
    bot(t(msgKey))
    cb()
  }

  // "Xem nhanh" của kỳ/tuần hiện tại (chạy luôn các hàm tra cứu sẵn có).
  function quickAction(key) {
    const periodKey = payPeriodKeyOf(localTodayStr())
    const [y, m] = periodKey.split('-').map(Number)
    if (key === 'timesheet') handleTimesheet({ month: m, year: y, week: null })
    else if (key === 'planned') handlePlanned()
    else if (key === 'deductions') handleDeductionQuery({ month: m, year: y })
    else if (key === 'extra') handleExtraIncomeQuery({ month: m, year: y })
  }

  // MENU "Chức năng": lưới nút mở công cụ + xem nhanh, ngay trong khung chat.
  function pushMenu() {
    const tools = [
      { key: 'import', label: t('nav.importWeek') },
      { key: 'reconcile', label: t('reconcile.title') },
      { key: 'deductions', label: t('nav.deductions') },
      { key: 'extra', label: t('nav.extraIncome') },
      { key: 'payPeriod', label: t('nav.payPeriod') },
      { key: 'profile', label: t('nav.account') },
      { key: 'guide', label: t('nav.guide') },
    ]
    const quick = [
      { key: 'timesheet', label: t('chat.qTimesheet') },
      { key: 'planned', label: t('chat.qPlanned') },
      { key: 'deductions', label: t('chat.qDeductions') },
      { key: 'extra', label: t('chat.qExtra') },
    ]
    setMessages((m) => [
      ...m,
      {
        role: 'bot',
        node: (
          <div className="chat-menu">
            <div className="chat-confirm-line">{t('chat.menuTitle')}</div>
            <div className="chat-menu-group">{t('chat.menuTools')}</div>
            <div className="chat-choice-btns">
              {tools.map((it) => (
                <button key={it.key} type="button" onClick={() => openTool(it.key)}>
                  {it.label}
                </button>
              ))}
            </div>
            <div className="chat-menu-group">{t('chat.menuQuick')}</div>
            <div className="chat-choice-btns">
              {quick.map((it) => (
                <button
                  key={it.key}
                  type="button"
                  onClick={() => quickAction(it.key)}
                >
                  {it.label}
                </button>
              ))}
            </div>
          </div>
        ),
      },
    ])
  }

  async function send() {
    const msg = input.trim()
    if (!msg || busy) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: msg }])

    // VALIDATION ngôn ngữ: chỉ cho nhắn đúng ngôn ngữ đang chọn. Chỉ chặn khi đoán
    // chắc chắn lệch (câu trung tính như số tiền/giờ vẫn cho qua). Đang chờ bổ sung
    // (giờ/ngày) thì bỏ qua để không cản các câu ngắn.
    if (!pending) {
      const detected = detectLang(msg)
      if (detected && detected !== lang) {
        bot(t('chat.langMismatch'))
        return
      }
    }

    const norm = deaccent(msg)

    // Đang chờ bổ sung thông tin còn thiếu (giờ vào/ra hoặc ngày).
    if (pending) {
      if (/huy|cancel|thoi|bo qua/.test(norm)) {
        setPending(null)
        bot(t('chat.cancelled'))
        return
      }
      if (pending.awaiting === 'date') {
        const d = resolveDate(msg)
        if (!d) {
          bot(t('chat.askDateRetry'))
          return
        }
        setPending(null)
        await finalizeShift({ date: d, times: pending.times, type: pending.type })
        return
      }
      // awaiting times
      const times = findTimes(norm)
      if (times.length >= 2) {
        const d = pending.date
        setPending(null)
        pushShiftConfirm({ date: d, start: times[0], end: times[1] })
        return
      }
      bot(t('chat.askDayTimesRetry'))
      return
    }

    // Mở MENU chức năng.
    if (/\b(chuc nang|menu|cong cu|ban lam duoc gi|giup gi|lam duoc gi)\b/.test(norm)) {
      pushMenu()
      return
    }
    // Mở một công cụ/màn hình của web (nhập lịch, đối chiếu, bồi thường, việc ngoài,
    // kỳ lương, hồ sơ, hướng dẫn).
    const toolKey = parseOpenTool(msg)
    if (toolKey) {
      openTool(toolKey)
      return
    }
    // Nhập HÀNG LOẠT việc ngoài: nhiều ngày + 1 mức tiền/buổi (kiểm trước thêm-ca
    // vì câu có cả giờ lẫn ngày).
    const exBatch = parseExtraIncomeBatch(msg)
    if (exBatch) {
      pushExtraBatchConfirm(exBatch)
      return
    }
    // Thêm ca từ câu tự nhiên (keyword ngày/đêm hoặc 'thêm ca' + ngày/giờ). Tương
    // lai → lịch dự kiến. Thiếu ngày/giờ → hỏi lại thay vì tạo ca lỗi.
    const si = parseShiftIntent(msg)
    if (si) {
      if (!si.date) {
        setPending({ awaiting: 'date', times: si.times, type: si.type })
        bot(t('chat.askDate'))
      } else {
        await finalizeShift(si)
      }
      return
    }
    // Bồi thường: thêm khoản trừ (ưu tiên trước hỏi-ngày vì câu có thể kèm ngày).
    const dedAdd = parseDeductionAdd(msg)
    if (dedAdd) {
      await handleAddDeduction(dedAdd)
      return
    }
    // Bồi thường: tra cứu khoản trừ theo kỳ.
    const dedQ = parseDeductionQuery(msg)
    if (dedQ) {
      handleDeductionQuery(dedQ)
      return
    }
    // Thu nhập việc ngoài: hiện thẻ xác nhận (tránh phân loại nhầm / sai tiền) rồi
    // mới ghi khi bấm Lưu.
    const exReq = parseExtraIncomeAdd(msg)
    if (exReq) {
      pushExtraConfirm(exReq)
      return
    }
    // Thu nhập việc ngoài: tra cứu theo kỳ (câu hỏi, không có số tiền để thêm).
    const exQ = parseExtraIncomeQuery(msg)
    if (exQ) {
      handleExtraIncomeQuery(exQ)
      return
    }
    // Yêu cầu bảng công → xử lý tại client từ shifts, không gọi AI.
    const tsReq = parseTimesheetReq(msg)
    if (tsReq) {
      handleTimesheet(tsReq)
      return
    }
    // Hỏi về một ngày cụ thể (có slash/dash) → trả lời chi tiết ngày đó.
    const dayReq = parseDayReq(msg)
    if (dayReq) {
      handleDay(dayReq)
      return
    }
    // Lịch dự kiến tuần này.
    if (parsePlannedReq(msg)) {
      handlePlanned()
      return
    }
    // Xét tính khả thi của mục tiêu ("tháng này làm được 5 triệu không?") → CÓ/KHÔNG
    // + số ca cần làm, tính tại client từ lương 1 giờ (không gọi AI).
    const feasReq = parseFeasibilityReq(msg)
    if (feasReq) {
      bot(buildFeasibility(feasReq))
      return
    }

    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('salary-chat', {
        body: {
          message: msg,
          lang,
          today: localTodayStr(),
          snapshot,
          guide: buildGuide(t),
        },
      })
      if (error || data?.error) throw new Error(data?.error || error.message)

      // AI phân loại ý định GHI NHẬN → xử lý ở client (validate + thẻ xác nhận).
      const act = data.action
      const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''))
      const isTime = (x) => /^\d{1,2}:\d{2}$/.test(String(x || ''))
      if (act && act.intent === 'viec_ngoai') {
        const amount = Math.round(Number(act.amount) || 0)
        if (!(amount > 0)) {
          bot(t('chat.extraAskAmount'))
          return
        }
        const date = isDate(act.date) ? act.date : localTodayStr()
        pushExtraConfirm({ date, description: act.description || '', amount })
        return
      }
      if (act && act.intent === 'ca') {
        const times = [act.start, act.end].filter(isTime)
        if (!isDate(act.date)) {
          setPending({ awaiting: 'date', times, type: null })
          bot(t('chat.askDate'))
          return
        }
        await finalizeShift({ date: act.date, times, type: null })
        return
      }

      let text = data.reply || ''
      const target = parseInt(String(data.target || '').replace(/\D/g, ''), 10)
      if (Number.isFinite(target) && target > 0) {
        text = `${text}\n\n${buildEstimate(target)}`.trim()
      }
      setMessages((m) => [...m, { role: 'bot', text }])
    } catch {
      setMessages((m) => [...m, { role: 'bot', text: t('chat.error') }])
    } finally {
      setBusy(false)
    }
  }

  // Đóng chat = ẩn (component vẫn mount → giữ tin nhắn). Reload trang mới reset.
  if (!open) return null

  return (
    <div
      ref={cardRef}
      className="chat-float comp-pop"
      role="dialog"
      aria-label={t('chat.title')}
      style={pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined}
    >
      <div className="modal-head chat-drag" onPointerDown={startDrag}>
        <h2>🤖 {t('chat.title')}</h2>
        <div className="chat-head-actions">
          <button
            type="button"
            className="chat-menu-btn"
            onClick={pushMenu}
            title={t('chat.menuBtn')}
          >
            ☰ {t('chat.menuBtn')}
          </button>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>
      </div>

      <div className="chat-list" ref={listRef}>
        {messages.map((m, i) => (
          <div
            key={i}
            className={`chat-msg chat-${m.role}${m.wide ? ' chat-table' : ''}`}
          >
            {m.node || m.text}
          </div>
        ))}
        {busy && <div className="chat-msg chat-bot chat-typing">…</div>}
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={t('chat.placeholder')}
        />
        <button type="button" onClick={send} disabled={busy || !input.trim()}>
          {t('chat.send')}
        </button>
      </div>
    </div>
  )
}
