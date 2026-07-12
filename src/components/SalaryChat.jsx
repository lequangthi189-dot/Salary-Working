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
  readImage,
  extractSchedule,
  mapScheduleRows,
  pickImportRows,
  reconcileWeek,
  mondayOfThisWeek,
} from '../lib/scheduleExtract.js'
import { ocrTokens, crosscheckRecord } from '../lib/ocrCrosscheck.js'
import { useTrickleProgress } from '../lib/useTrickleProgress.js'
import { firstNameOf } from '../lib/name.js'
import ProgressButton from './ProgressButton.jsx'
import ChatMenu from './ChatMenu.jsx'
import {
  payPeriodKeyOf,
  payPeriodLabel,
  payPeriodRange,
  localTodayStr,
  sumDeductions,
} from '../lib/payPeriod.js'
import { sumExtraIncome, sumReceivedExtraIncome } from '../lib/extraIncome.js'
import {
  fetchRecentMessages,
  insertMessage,
} from '../models/chatMessagesModel.js'
import { useI18n } from '../lib/i18n.jsx'
import TimesheetTable from './TimesheetTable.jsx'
// Parser thuần + helper ngày (song ngữ VN/Anh) — tách ra lib để test được.
import {
  pad2,
  mondayOf,
  dmy,
  daysBetween,
  deaccent,
  addDaysStr,
  detectLang,
  findTimes,
  resolveDate,
  parseTimesheetReq,
  parseDayReq,
  parseShiftIntent,
  parseDeductionAdd,
  parseDeductionQuery,
  parseExtraIncomeQuery,
  parseExtraIncomeAdd,
  parseExtraIncomeBatch,
  parsePlannedReq,
  parseFeasibilityReq,
  parseProjectionReq,
  parseOpenTool,
} from '../lib/chatParse.js'

// Bộ nhớ chat: số tin NẠP LẠI khi mở (Mức 2 — lưu/hiển thị, KHÔNG bị cửa sổ trượt
// đụng tới) và CỬA SỔ TRƯỢT số tin GỬI kèm mỗi request làm ngữ cảnh cho AI (Mức 1)
// — giữ nhỏ để khỏi vượt context / tốn token / chạm rate limit. Đổi N tại đây; server
// (salary-chat) còn chốt lại lần nữa bằng WINDOW_TURNS.
const MAX_HISTORY_LOAD = 30
const MAX_HISTORY_SEND = 12

// Gom toàn bộ HƯỚNG DẪN dùng app (từ các bước WelcomeGuide) thành text, theo đúng
// ngôn ngữ hiện tại. Gửi cho AI để trả lời câu "cách dùng" — CHỈ dựa vào đây.
function buildGuide(t) {
  const lines = [t('welcome.subtitle')]
  for (let i = 1; i <= 8; i++) {
    lines.push(`${i}. ${t(`welcome.step${i}.title`)}: ${t(`welcome.step${i}.desc`)}`)
  }
  return lines.join('\n')
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
  employeeCode = '',
  fullName = '',
  phone = '',
  onImportSchedule,
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
  // Tin MỞ ĐẦU trong khung chat: chào gọi TÊN GỌI của user (chữ cuối trong họ-và-tên)
  // + gợi ý bấm ☰ Chức năng. Chưa có tên → chào chung ("Chào bạn,"). Chỉ chèn biến
  // {greeting}; phần chữ vẫn dịch qua i18n. greetingOnly = đánh dấu đây là tin mở đầu
  // (chưa có hội thoại) → cho phép cập nhật khi TÊN về trễ / ĐỔI NGÔN NGỮ, nhưng KHÔNG
  // đụng tới khi đã có lịch sử / user đã nhắn.
  const firstName = firstNameOf(fullName)
  const greeting = firstName
    ? t('chat.introGreetName', { name: firstName })
    : t('chat.introGreet')
  const introText = t('chat.intro', { greeting })
  const [messages, setMessages] = useState([
    { role: 'bot', greetingOnly: true, text: introText },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState(null) // { date } đang chờ nhập giờ ca ngày
  // Ảnh đính kèm đang chờ chọn hành động: { file, url }. null = chưa đính kèm.
  const [attach, setAttach] = useState(null)
  const [attachBusy, setAttachBusy] = useState(false)
  // Tiến độ THẬT khi xử lý ảnh trong chat (giống modal): trickle trong lúc chờ Gemini.
  const [attachProgress, setAttachProgress] = useState({
    pct: 0,
    label: '',
    indeterminate: false,
  })
  const { start: startTrickle, stop: stopTrickle } =
    useTrickleProgress(setAttachProgress)
  const fileRef = useRef(null)
  const listRef = useRef(null)
  const loadedRef = useRef(false) // đã nạp lịch sử từ DB chưa (chỉ nạp 1 lần)

  // MỨC 2 — nạp lại lịch sử chat của ĐÚNG user (RLS giới hạn theo auth.uid()) khi
  // mở chatbot lần đầu. Có lịch sử → thay lời chào bằng các tin cũ; lỗi/không có →
  // giữ nguyên lời chào. Chỉ chạy 1 lần để không đè tin đang gõ.
  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    let alive = true
    ;(async () => {
      const { data, error } = await fetchRecentMessages(MAX_HISTORY_LOAD)
      if (!alive || error || !data || data.length === 0) return
      // Fetch có thể về TRỄ sau khi user đã kịp nhắn → chỉ thay khi màn hình vẫn
      // là đúng một tin mở đầu (greetingOnly), tránh đè mất tin vừa gõ.
      setMessages((m) =>
        m.length === 1 && m[0].greetingOnly
          ? data.map((x) => ({ role: x.role, text: x.content }))
          : m
      )
    })()
    return () => {
      alive = false
    }
  }, [])

  // Tên user về TRỄ hoặc ĐỔI NGÔN NGỮ khi chưa chat → cập nhật lại tin mở đầu. CHỈ thay
  // khi màn hình vẫn đúng một tin mở đầu (greetingOnly); đã có lịch sử / user đã nhắn
  // thì bỏ qua.
  useEffect(() => {
    setMessages((m) =>
      m.length === 1 && m[0].greetingOnly
        ? [{ role: 'bot', greetingOnly: true, text: introText }]
        : m
    )
  }, [introText])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

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

  // DỰ PHÓNG tổng thu nhập khi làm thêm N ca: tổng = TỔNG THU NHẬP kỳ này (lương ca
  // sau khoản trừ + thu nhập việc ngoài đã thực nhận) + N × tiền ước tính mỗi ca.
  // Tiền mỗi ca theo loại (đêm/ngày) = lương 1 giờ × số giờ TB mỗi ca; không rõ loại
  // → TB mỗi ca theo lịch sử. CODE tính (không để AI tính).
  function buildProjection({ count, type }) {
    const dayRate = snapshot.dayRate || 0
    const nightRate = snapshot.nightRate || 0
    if (!dayRate) return t('chat.noRate')
    // Tổng thu nhập kỳ này = lương ca sau trừ (currentPay) + việc ngoài đã NHẬN
    // (tính vào kỳ theo received_at). Khoản chưa nhận (treo) không cộng.
    const key = payPeriodKeyOf(localTodayStr())
    const extraNow = sumReceivedExtraIncome(
      (extraIncome || []).filter(
        (x) => x.received && payPeriodKeyOf(x.received_at) === key
      )
    )
    const cur = (snapshot.currentPay || 0) + extraNow
    const hours = snapshot.avgHoursPerShift > 0 ? snapshot.avgHoursPerShift : 8
    // Ca đêm nhưng cửa hàng không có ca đêm → coi như ca ngày.
    let kind = type
    if (kind === 'night' && !snapshot.hasNightShift) kind = 'day'
    let perShift
    if (kind === 'night') perShift = nightRate * hours
    else if (kind === 'day') perShift = dayRate * hours
    else perShift = snapshot.avgPerShift > 0 ? snapshot.avgPerShift : dayRate * hours
    perShift = Math.round(perShift)
    const added = perShift * count
    const total = cur + added
    const shift =
      kind === 'night'
        ? t('chat.projNight')
        : kind === 'day'
          ? t('chat.projDay')
          : t('chat.projShift')
    return [
      t('chat.projLine', {
        count,
        shift,
        hours: formatHours(hours),
        per: formatMoney(perShift),
        added: formatMoney(added),
      }),
      t('chat.projTotal', { total: formatMoney(total), current: formatMoney(cur) }),
    ].join('\n')
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
    bot(lines.join('\n'))
  }

  // Lưu 1 tin vào DB (bộ nhớ). Fire-and-forget — không chặn UI, nuốt lỗi (vd offline
  // / chưa chạy migration) để chat vẫn hoạt động. KHÔNG truyền user_id (default
  // auth.uid()). role: 'user' | 'bot'.
  function persist(role, text) {
    if (!text) return
    try {
      insertMessage(role, text).then?.(() => {}, () => {})
    } catch {
      /* bỏ qua lỗi lưu lịch sử */
    }
  }

  // Hiện 1 tin bot dạng text VÀ lưu vào bộ nhớ. Các tin chỉ-UI (menu/bảng/thẻ xác
  // nhận) dùng setMessages trực tiếp với `node` → KHÔNG lưu (không serialize được).
  const bot = (text) => {
    setMessages((m) => [...m, { role: 'bot', text }])
    persist('bot', text)
  }

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

  // TRA CỨU thu nhập việc ngoài của một kỳ: liệt kê + tổng đã nhận + treo chưa nhận.
  function handleExtraIncomeQuery({ month, year }) {
    const key = month
      ? `${year || new Date().getFullYear()}-${pad2(month)}`
      : payPeriodKeyOf(localTodayStr())
    const label = payPeriodLabel(key)
    const all = extraIncome || []
    // Đã nhận tính vào kỳ này (theo received_at) + mọi khoản chưa nhận (treo).
    const received = all.filter(
      (x) => x.received && payPeriodKeyOf(x.received_at) === key
    )
    const pendingList = all.filter((x) => !x.received)
    const list = [...received, ...pendingList]
    if (list.length === 0) return bot(t('chat.extraNone', { label }))
    const sorted = [...list].sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    )
    const realized = sumReceivedExtraIncome(received)
    const pending = sumExtraIncome(pendingList)
    const lines = [t('chat.extraHeader', { label, total: formatMoney(realized) })]
    for (const x of sorted)
      lines.push(
        t('chat.extraLine', {
          date: dmy(x.date),
          desc: x.description || '—',
          amount: formatMoney(x.amount),
        }) + (!x.received ? ` · ${t('extra.pendingBadge')}` : '')
      )
    if (pending > 0) lines.push(t('chat.extraPendingLine', { amount: formatMoney(pending) }))
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

  // MENU "Chức năng": 2 nhóm nút gom vào 2 DROPDOWN (component ChatMenu tự giữ trạng
  // thái mở/đóng). Hành động từng mục GIỮ NGUYÊN: quickAction / openTool như trước.
  function pushMenu() {
    setMessages((m) => [
      ...m,
      {
        role: 'bot',
        node: <ChatMenu onQuick={quickAction} onTool={openTool} />,
      },
    ])
  }

  // ===== LỐI VÀO THỨ HAI: ảnh đính kèm trong chat =====
  // Chọn ảnh từ nút đính kèm → chỉ hiện preview + 3 nút; KHÔNG tự đọc, chờ user chọn.
  function pickChatImage(e) {
    const f = e.target.files?.[0]
    e.target.value = '' // cho chọn lại cùng ảnh sau khi Hủy
    if (!f) return
    if (attach?.url) URL.revokeObjectURL(attach.url)
    setAttach({ file: f, url: URL.createObjectURL(f) })
  }

  // [Hủy] → bỏ ảnh, không làm gì.
  function cancelAttach() {
    if (attach?.url) URL.revokeObjectURL(attach.url)
    setAttach(null)
    bot(t('chat.attachCancelled'))
  }

  // Đọc ảnh đính kèm rồi GỌI LẠI đúng luồng cũ: kind='create' → Nhập lịch tuần (đọc
  // ảnh → tạo ca, kèm bỏ ca trùng qua onImportSchedule); kind='reconcile' → Đối chiếu
  // công. Dùng chung readImage/extractSchedule/mapScheduleRows/reconcileWeek với modal
  // nên nhất quán tuyệt đối (và dính bug đọc ảnh y hệt — cố ý, xử lý ở nhánh khác).
  async function runAttach(kind) {
    const file = attach?.file
    if (!file || attachBusy) return
    // Cần định danh NV như modal cũ (mã / tên / SĐT), nếu không server không đọc được.
    if (![employeeCode, fullName, phone].some((v) => String(v || '').trim())) {
      bot(t('import.errNoCode'))
      return
    }
    setAttachBusy(true)
    setAttachProgress({ pct: 10, label: t('import.stageUpload'), indeterminate: false })
    try {
      const { base64, mediaType } = await readImage(file)
      const dataUrl = `data:${mediaType};base64,${base64}`
      setAttachProgress({ pct: 25, label: t('import.stageUpload'), indeterminate: false })
      const weekStart = mondayOfThisWeek()
      // Gọi Gemini — hộp đen → % bò chậm 25→~90% (ước lượng), giống modal.
      startTrickle(25, 90, t('import.stageAI'))
      // CHỈ await GEMINI ở luồng chính — OCR KHÔNG chặn. OCR đối chiếu chạy NỀN sau khi
      // đã báo kết quả (hậu kiểm), có timeout nội bộ nên không bao giờ treo chat.
      const data = await extractSchedule({
        base64,
        mediaType,
        employeeCode,
        fullName,
        phone,
        weekStart,
      })
      stopTrickle()
      setAttachProgress({ pct: 90, label: t('import.stageProcessing'), indeterminate: false })
      if (data?.is_roster === false) return bot(t('import.errNotRoster'))
      if (!data?.found) return bot(t('import.errNotFound', { code: employeeCode }))

      if (kind === 'create') {
        // [Tạo lịch] → tạo ca cả tuần bằng ĐÚNG hàm của luồng Nhập lịch (bỏ ca trùng).
        const picked = pickImportRows(mapScheduleRows(data, weekStart))
        if (picked.length === 0) return bot(t('import.errNoShift'))
        if (!onImportSchedule) return bot(t('chat.error'))
        const { created, skipped, errors } = await onImportSchedule(picked)
        setAttachProgress({ pct: 100, label: t('import.stageDone'), indeterminate: false })
        if (errors && errors.length) bot(t('import.errSome', { errs: errors.join('\n') }))
        else if (created === 0) bot(t('import.allExist'))
        else bot(t('import.importSummary', { created, skipped }))
        // OCR HẬU KIỂM (nền, KHÔNG chặn): sau khi đã tạo, nếu có ngày AI–OCR lệch thì
        // báo để user mở 'Nhập lịch tuần' soát lại. OCR fail/quá giờ → nhắc kiểm tra kỹ.
        ocrTokens(dataUrl).then((tokens) => {
          if (!tokens) return bot(t('ocr.unchecked'))
          const warnDays = picked
            .filter((r) => crosscheckRecord(r, tokens).overall === 'warn')
            .map((r) => t(`wd.${r.weekday}`))
          if (warnDays.length) bot(t('chat.ocrWarnCreate', { days: warnDays.join(', ') }))
        })
      } else {
        // [Đối chiếu] → đối chiếu 1 ảnh tuần với bảng công (reconcileWeek dùng chung).
        const { match, total } = reconcileWeek(data, weekStart, shifts)
        setAttachProgress({ pct: 100, label: t('import.stageDone'), indeterminate: false })
        bot(t('reconcile.summary', { match, total }))
        // OCR cảnh báo (nền, KHÔNG chặn): số ngày AI đọc lệch với OCR.
        ocrTokens(dataUrl).then((tokens) => {
          if (!tokens) return
          const warn = (data.days || []).filter(
            (d) => crosscheckRecord(d, tokens).overall === 'warn'
          ).length
          if (warn) bot(t('ocr.warnBanner', { count: warn }))
        })
      }
      // Xong → bỏ ảnh (kết quả đã báo trong chat). OCR nền dùng dataUrl (biến cục bộ),
      // không phụ thuộc attach nên vẫn chạy sau khi bỏ ảnh.
      if (attach?.url) URL.revokeObjectURL(attach.url)
      setAttach(null)
    } catch (e) {
      // Lỗi (Gemini/quota RPD…) → báo rõ trong chat; giữ ảnh để thử lại.
      bot(`${String(e.message || e)}\n${t('import.errRetry')}`)
    } finally {
      stopTrickle()
      setAttachBusy(false)
    }
  }

  async function send() {
    const msg = input.trim()
    if (!msg || busy) return
    setInput('')
    // CỬA SỔ TRƯỢT (Mức 1) = các tin TEXT trước câu vừa gõ, lấy N tin gần nhất. Lấy
    // TRƯỚC khi thêm tin mới để không gồm chính nó. Đây CHỈ là phần gửi cho AI —
    // KHÔNG đụng tới lưu DB/hiển thị (user vẫn cuộn xem toàn bộ lịch sử như cũ).
    const recent = messages
      .filter((m) => typeof m.text === 'string' && m.text)
      .slice(-MAX_HISTORY_SEND)
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', content: m.text }))
    // Cắt THEO CẶP: bỏ câu trả lời 'model' mồ côi ở đầu cửa sổ (câu hỏi đã bị đẩy ra).
    while (recent.length && recent[0].role === 'model') recent.shift()
    const history = recent
    setMessages((m) => [...m, { role: 'user', text: msg }])
    persist('user', msg) // Mức 2: lưu câu hỏi của user

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
      if (/huy|cancel|thoi|bo qua|stop|never ?mind|nvm|forget it/.test(norm)) {
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
    if (
      /\b(chuc nang|menu|cong cu|ban lam duoc gi|giup gi|lam duoc gi|what can you do|what can i do|help me|tools|features|commands)\b/.test(
        norm
      )
    ) {
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
    // Câu DỰ PHÓNG: "làm thêm N ca đêm nữa thì tổng bao nhiêu" → tính tổng dự kiến
    // tại client. Đặt TRƯỚC thêm-ca để câu HỎI không bị hiểu nhầm thành lệnh thêm ca.
    const projReq = parseProjectionReq(msg)
    if (projReq) {
      bot(buildProjection(projReq))
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
          history, // Mức 1: ngữ cảnh hội thoại (≤ N tin gần nhất)
        },
      })
      if (error || data?.error)
        throw new Error(data?.error || error?.message || 'salary-chat failed')

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
      bot(text)
    } catch (e) {
      // Server đã trả thông điệp thân thiện (tiếng Việt) → hiện kèm để user phân
      // biệt lỗi quota/mạng/parse thay vì chỉ một câu lỗi chung.
      const detail = e?.message && e.message !== 'salary-chat failed' ? `\n(${e.message})` : ''
      setMessages((m) => [...m, { role: 'bot', text: t('chat.error') + detail }])
    } finally {
      setBusy(false)
    }
  }

  // Đóng chat = ẩn (component vẫn mount → giữ tin nhắn). Reload trang mới reset.
  if (!open) return null

  return (
    <div
      className="chat-float comp-pop"
      role="dialog"
      aria-label={t('chat.title')}
    >
      <div className="modal-head">
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

      {/* Ảnh đính kèm: preview + 3 nút [Tạo lịch] [Đối chiếu] [Hủy]. Đang xử lý →
          hiện tiến độ THẬT (ProgressButton) thay cho 3 nút. */}
      {attach && (
        <div className="chat-attach">
          <img className="chat-attach-preview" src={attach.url} alt="" />
          {attachBusy ? (
            <div className="import-progress">
              <ProgressButton
                value={attachProgress.pct}
                label={attachProgress.label}
                indeterminate={attachProgress.indeterminate}
              />
            </div>
          ) : (
            <>
              <div className="chat-attach-hint">{t('chat.attachHint')}</div>
              <div className="chat-choice-btns">
                <button type="button" onClick={() => runAttach('create')}>
                  {t('chat.btnCreateSchedule')}
                </button>
                <button type="button" onClick={() => runAttach('reconcile')}>
                  {t('chat.btnReconcile')}
                </button>
                <button type="button" onClick={cancelAttach}>
                  {t('chat.btnCancel')}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="chat-input">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={pickChatImage}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className="chat-attach-btn"
          onClick={() => fileRef.current?.click()}
          disabled={attachBusy}
          title={t('chat.attachAria')}
          aria-label={t('chat.attachAria')}
        >
          📎
        </button>
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
