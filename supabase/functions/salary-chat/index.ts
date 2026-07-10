// Supabase Edge Function: salary-chat
// Trợ lý lương: hiểu câu hỏi của người dùng + diễn đạt câu trả lời. Phép TÍNH số
// ca/giờ cần làm do FRONTEND tính (chính xác); hàm này chỉ trả về:
//   - reply: câu trả lời thân thiện (cho câu hỏi chung)
//   - target: số tiền MỤC TIÊU (chuỗi số, "" nếu không phải câu hỏi ước tính)
// Số liệu của người dùng được truyền vào để AI tham chiếu (không bịa).
//
// Triển khai: supabase functions deploy salary-chat
// (dùng chung GEMINI_API_KEY / GEMINI_MODEL với extract-schedule)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const GEMINI_MODELS = (Deno.env.get('GEMINI_MODEL') ||
  'gemini-2.5-flash-lite,gemini-2.5-flash,gemini-2.0-flash')
  .split(',')
  .map((s: string) => s.trim())
  .filter(Boolean)

// CỬA SỔ TRƯỢT hội thoại: chỉ gửi N lượt gần nhất làm NGỮ CẢNH cho Gemini (giảm
// token + giảm nguy cơ chạm rate limit RPD). Đổi N tại đây (gợi ý 10–12). LƯU Ý:
// cửa sổ này CHỈ áp cho phần GỬI CHO AI — không liên quan tới lưu DB/hiển thị,
// user vẫn xem được toàn bộ lịch sử ở client.
const WINDOW_TURNS = 12

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    reply: { type: 'STRING' },
    target: { type: 'STRING' },
    action: {
      type: 'OBJECT',
      properties: {
        intent: { type: 'STRING' }, // "ca" | "viec_ngoai" | "khong_ro"
        date: { type: 'STRING' }, // "YYYY-MM-DD" hoặc ""
        start: { type: 'STRING' }, // "HH:MM" hoặc ""
        end: { type: 'STRING' }, // "HH:MM" hoặc ""
        amount: { type: 'INTEGER' }, // VND, 0 nếu không có
        description: { type: 'STRING' },
        thieu_thong_tin: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: [
        'intent',
        'date',
        'start',
        'end',
        'amount',
        'description',
        'thieu_thong_tin',
      ],
    },
  },
  required: ['reply', 'target', 'action'],
}

const SYSTEM = `Bạn là TRỢ LÝ LƯƠNG của app chấm công SalaryWorking. Trả lời NGẮN GỌN, thân thiện, bằng ĐÚNG ngôn ngữ của câu hỏi (Việt hoặc Anh).
Người dùng được cung cấp SỐ LIỆU thật trong phần "DỮ LIỆU" (lương kỳ này, lương dự kiến, tiền phạt do đi trễ, tổng giờ, giờ ngày/đêm, giờ trễ, số ca ngày/đêm, đơn giá 1 giờ, đơn giá lễ, cấu hình kỳ lương). Mọi con số đã được app TÍNH SẴN.
TUYỆT ĐỐI KHÔNG bịa số và KHÔNG tự tính lại — chỉ trích đúng số trong "DỮ LIỆU". Nếu "DỮ LIỆU" KHÔNG có thông tin cần thiết để trả lời, hãy nói rõ "mình chưa có thông tin đó" thay vì đoán.

CÁCH TÍNH LƯƠNG CỦA APP (dùng để GIẢI THÍCH khi người dùng hỏi vì sao, KHÔNG để tự bịa số):
- Lương ca = giờ-ngày × đơn giá ngày + giờ-đêm × đơn giá đêm. Giờ trong khung ĐÊM (xem nightStart–nightEnd) hưởng đơn giá đêm cao hơn.
- Lương DỰ KIẾN (idealPay) = lương đáng lẽ nhận nếu đi ĐÚNG GIỜ ca. Nếu vào trễ hoặc về sớm, phần giờ thiếu bị PHẠT (lostPay) → lương thực = dự kiến − phạt.
- "lostHours" là số giờ bị mất do đi trễ/về sớm; "lostPay" là tiền tương ứng. Khi người dùng hỏi "vì sao bị phạt/trừ", hãy giải thích là do đi trễ hoặc về sớm so với giờ ca, dẫn tới mất {lostHours} giờ ≈ {lostPay}.
- Ngày lễ hưởng đơn giá lễ (holidayDayRate/holidayNightRate) cao hơn ngày thường.
- Kỳ lương tính từ ngày {periodStartDay} đến ngày {periodEndDay} hằng tháng.

QUAN TRỌNG NHẤT — khi người dùng hỏi CÁCH DÙNG app (vd "làm sao để…", "tính năng X ở đâu", "thêm việc ngoài thế nào"): CHỈ trả lời DỰA TRÊN phần "HƯỚNG DẪN DÙNG APP" được cung cấp. TUYỆT ĐỐI KHÔNG bịa thêm bước, nút, hay tính năng KHÔNG có trong hướng dẫn. Nếu hướng dẫn không đề cập, hãy thành thật nói "mình không chắc" và gợi ý mở mục "Hướng dẫn" trong app. Câu hỏi cách-dùng KHÔNG phải lệnh ghi nhận → đặt action.intent="khong_ro".
- Nếu người dùng hỏi kiểu "cần làm bao nhiêu ca / bao nhiêu giờ / bao nhiêu nữa để ĐẠT/NHẬN được X tiền", hãy đặt field "target" = X (chỉ chữ số, đơn vị VND, vd "3000000"), và để "reply" là một câu mở đầu ngắn (vd "Để đạt mục tiêu đó:"). KHÔNG tự tính trong reply — app sẽ tự tính chính xác số GIỜ ngày/đêm cần làm dựa trên lương 1 giờ.
- Nếu là câu hỏi chung (vd "tôi đang được bao nhiêu", "trung bình mỗi ca bao nhiêu"), trả lời thẳng trong "reply" dựa trên số liệu, và đặt "target" = "".
- Nếu không liên quan lương, lịch sự từ chối ngắn gọn, "target" = "".

NGOÀI RA, hãy PHÂN LOẠI xem người dùng có muốn GHI NHẬN thu nhập không, điền vào "action":
- intent:
  • "ca" — nói về CA LÀM VIỆC có giờ vào/ra (vd "làm 8h-17h", "ca đêm hôm nay", "mai làm từ 6h chiều").
  • "viec_ngoai" — một KHOẢN TIỀN làm thêm KHÔNG theo giờ, thường có số tiền + mô tả (vd "nhận 500k sửa máy", "làm freelance được 1 triệu", "ai đó trả 300k").
  • "khong_ro" — chỉ là câu hỏi/không đủ thông tin để ghi nhận.
- date: NGÀY TUYỆT ĐỐI "YYYY-MM-DD" tính từ HÔM NAY (đã cho). Hiểu ngày tương đối: "hôm nay", "mai", "mốt", "thứ 6 tuần sau"... Không nói ngày → "".
- start/end: giờ vào/ra "HH:MM" — CHỈ cho "ca". Không có → "".
- amount: số tiền VND (số nguyên) — CHỈ cho "viec_ngoai". Hiểu tiền Việt: "k"=nghìn, "tr"/"triệu"=triệu, "lít"=trăm nghìn (2 lít=200000). Không có → 0.
- description: mô tả công việc — cho "viec_ngoai". Không có → "".
- thieu_thong_tin: mảng tên trường còn THIẾU. Ca thiếu giờ → "gio_vao"/"gio_ra"; thiếu ngày → "ngay". Việc ngoài thiếu tiền → "so_tien". Đủ → [].
QUY TẮC: "ca" KHÔNG có amount; "viec_ngoai" KHÔNG có giờ. Nếu intent="khong_ro" thì để date/start/end="", amount=0, description="", thieu_thong_tin=[].`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // Xác thực người dùng qua JWT (chỉ user đã đăng nhập mới gọi được). Gọi GoTrue
  // REST /auth/v1/user thay vì SDK npm:@supabase/supabase-js để hàm là Deno THUẦN
  // → deploy KHÔNG cần Docker bundling (giống extract-schedule).
  const authHeader = req.headers.get('Authorization') || ''
  const userResp = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
    headers: {
      Authorization: authHeader,
      apikey: Deno.env.get('SUPABASE_ANON_KEY') || '',
    },
  })
  const user = userResp.ok ? await userResp.json() : null
  if (!user?.id) return json({ error: 'Unauthorized' }, 401)

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) return json({ error: 'Server chưa cấu hình GEMINI_API_KEY' }, 500)

  let body: {
    message?: string
    lang?: string
    today?: string
    guide?: string
    snapshot?: {
      currentPay?: number
      dayRate?: number
      nightRate?: number
      hasNightShift?: boolean
      avgPerShift?: number
      avgHoursPerShift?: number
      shiftCount?: number
      period?: {
        label?: string
        grossPay?: number
        idealPay?: number
        lostPay?: number
        deductionTotal?: number
        extraIncome?: number
        netPay?: number
        totalIncome?: number
        totalHours?: number
        dayHours?: number
        nightHours?: number
        lostHours?: number
        dayShiftCount?: number
        nightShiftCount?: number
        workDays?: number
      }
      config?: {
        holidayDayRate?: number
        holidayNightRate?: number
        nightStart?: string
        nightEnd?: string
        periodStartDay?: number
        periodEndDay?: number
      }
    }
    history?: { role?: string; content?: string }[]
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Body JSON không hợp lệ' }, 400)
  }
  const message = (body.message || '').trim()
  if (!message) return json({ error: 'Thiếu message' }, 400)
  const s = body.snapshot || {}
  const p = s.period || {}
  const cfg = s.config || {}
  const n = (v: number | undefined) => Math.round(Number(v) || 0)
  const h = (v: number | undefined) => Number(v || 0).toFixed(2)

  // KHỐI DỮ LIỆU: mọi con số đã tính sẵn ở client — AI chỉ trích, không tính lại.
  const data =
    `Kỳ lương đang xem: ${p.label || '(kỳ hiện tại)'} ` +
    `(tính từ ngày ${cfg.periodStartDay ?? 26} đến ngày ${cfg.periodEndDay ?? 25} hằng tháng).\n` +
    `- TỔNG THU NHẬP kỳ này (lương ca sau khấu trừ + việc ngoài) = ${n(p.totalIncome)} VND.\n` +
    `- Lương ca thực nhận (sau khấu trừ) = ${n(p.netPay)} VND.\n` +
    `- Lương ca trước khấu trừ = ${n(p.grossPay)} VND.\n` +
    `- Lương DỰ KIẾN nếu đi đúng giờ = ${n(p.idealPay)} VND.\n` +
    `- Tiền PHẠT do đi trễ/về sớm = ${n(p.lostPay)} VND (tương ứng ${h(p.lostHours)} giờ bị mất).\n` +
    `- Tiền bồi thường/khấu trừ = ${n(p.deductionTotal)} VND.\n` +
    `- Thu nhập việc ngoài đã nhận = ${n(p.extraIncome)} VND.\n` +
    `- Tổng giờ làm = ${h(p.totalHours)} giờ (giờ ngày = ${h(p.dayHours)}, giờ đêm = ${h(p.nightHours)}).\n` +
    `- Giờ bị mất do trễ = ${h(p.lostHours)} giờ.\n` +
    `- Số ca ngày = ${p.dayShiftCount ?? 0}; số ca đêm = ${p.nightShiftCount ?? 0}; số ngày công = ${p.workDays ?? 0}.\n` +
    `Đơn giá lương 1 giờ: ca ngày = ${n(s.dayRate)} VND; ca đêm = ${n(s.nightRate)} VND` +
    `${s.hasNightShift === false ? ' (cửa hàng KHÔNG có ca đêm — mọi giờ tính lương thường)' : ''}.\n` +
    `Đơn giá ngày LỄ: ca ngày = ${n(cfg.holidayDayRate)} VND; ca đêm = ${n(cfg.holidayNightRate)} VND.\n` +
    `Khung giờ ĐÊM: ${cfg.nightStart || '22:00'}–${cfg.nightEnd || '06:00'}.\n` +
    `Trung bình mỗi ca: ${n(s.avgPerShift)} VND, ${h(s.avgHoursPerShift)} giờ; tổng số ca đã làm = ${s.shiftCount || 0}.`

  const context =
    `===== DỮ LIỆU (nguồn DUY NHẤT cho số liệu — KHÔNG bịa, KHÔNG tự tính lại) =====\n` +
    `${data}\n` +
    `===== HẾT DỮ LIỆU =====\n` +
    `HÔM NAY là ${body.today || ''} (dùng để tính ngày tương đối).\n` +
    `Ngôn ngữ trả lời: ${body.lang === 'vi' ? 'Tiếng Việt' : 'English'}.\n` +
    `===== HƯỚNG DẪN DÙNG APP (nguồn DUY NHẤT cho câu hỏi cách dùng) =====\n` +
    `${body.guide || '(không có hướng dẫn)'}\n` +
    `===== HẾT HƯỚNG DẪN =====\n` +
    `Câu hỏi: ${message}`

  // CỬA SỔ TRƯỢT (Mức 1): làm sạch ở server — chỉ giữ role hợp lệ ('user'/'model'),
  // content là chuỗi, cắt bớt độ dài. Đây là hội thoại của CHÍNH user (gửi từ client
  // của họ) — không trộn dữ liệu user khác. System prompt + khối DỮ LIỆU nằm NGOÀI
  // cửa sổ này (xem systemInstruction + context bên dưới) nên KHÔNG bao giờ bị cắt.
  const history = Array.isArray(body.history) ? body.history : []
  const cleaned = history.filter(
    (m) =>
      (m?.role === 'user' || m?.role === 'model') &&
      typeof m?.content === 'string' &&
      m.content.trim()
  )
  // Lấy N lượt gần nhất, rồi CẮT THEO CẶP: bỏ các lượt 'model' (câu trả lời) còn nằm
  // ở ĐẦU cửa sổ mà câu hỏi 'user' tương ứng đã bị đẩy ra → tránh để lại câu trả lời
  // mồ côi, giữ ngữ cảnh hỏi-đáp mạch lạc. Cửa sổ luôn bắt đầu bằng lượt 'user'.
  const windowed = cleaned.slice(-WINDOW_TURNS)
  while (windowed.length && windowed[0].role === 'model') windowed.shift()
  const historyTurns = windowed.map((m) => ({
    role: m.role as string,
    parts: [{ text: (m.content as string).slice(0, 2000) }],
  }))

  const reqBody = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    // Các lượt cũ làm NGỮ CẢNH, rồi tới câu hỏi mới (kèm DỮ LIỆU) ở lượt cuối.
    contents: [...historyTurns, { role: 'user', parts: [{ text: context }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: SCHEMA,
      temperature: 0.3,
      maxOutputTokens: 2048,
      thinkingConfig: { thinkingBudget: 0 },
    },
  })

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
  let resp: Response | null = null
  for (const model of GEMINI_MODELS) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` +
      encodeURIComponent(apiKey)
    for (let attempt = 0; attempt < 2; attempt++) {
      resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: reqBody,
      })
      if (resp.ok) break
      if (resp.status === 503 || resp.status === 500) {
        if (attempt === 0) {
          await sleep(1000)
          continue
        }
        break
      }
      if (resp.status === 429 || resp.status === 404) break
      return json(
        { error: `Lỗi gọi Gemini (${resp.status}): ${await resp.text()}` },
        502
      )
    }
    if (resp && resp.ok) break
  }
  if (!resp || !resp.ok) {
    return json({ error: 'AI tạm thời không khả dụng, thử lại sau.' }, 503)
  }

  try {
    const data = await resp.json()
    const cand = data?.candidates?.[0]
    const text =
      cand?.content?.parts
        ?.map((p: { text?: string }) => p.text || '')
        .join('') || ''
    try {
      const parsed = JSON.parse(text)
      return json(parsed, 200)
    } catch {
      // JSON bị cắt (thường do finishReason=MAX_TOKENS) → báo rõ + gợi ý thử lại.
      if (cand?.finishReason === 'MAX_TOKENS') {
        return json(
          { error: 'Câu trả lời quá dài nên bị cắt. Hãy hỏi ngắn gọn hơn.' },
          502
        )
      }
      return json({ error: 'AI trả về không hợp lệ, thử lại.' }, 502)
    }
  } catch {
    return json({ error: 'AI trả về không hợp lệ, thử lại.' }, 502)
  }
})

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
