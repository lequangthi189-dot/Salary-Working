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

const SYSTEM = `Bạn là TRỢ LÝ LƯƠNG của một app chấm công. Trả lời NGẮN GỌN, thân thiện, bằng ĐÚNG ngôn ngữ của câu hỏi (Việt hoặc Anh).
Người dùng được cung cấp SỐ LIỆU thật (lương kỳ này, đơn giá lương 1 giờ ca ngày và ca đêm, lương/giờ trung bình mỗi ca). Tuyệt đối KHÔNG bịa số; chỉ dùng số liệu được cung cấp.

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
    }
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Body JSON không hợp lệ' }, 400)
  }
  const message = (body.message || '').trim()
  if (!message) return json({ error: 'Thiếu message' }, 400)
  const s = body.snapshot || {}

  const context =
    `Số liệu của tôi: lương kỳ này = ${Math.round(s.currentPay || 0)} VND; ` +
    `lương 1 giờ ca ngày = ${Math.round(s.dayRate || 0)} VND; ` +
    `lương 1 giờ ca đêm = ${Math.round(s.nightRate || 0)} VND` +
    `${s.hasNightShift === false ? ' (cửa hàng không có ca đêm)' : ''}; ` +
    `lương trung bình mỗi ca = ${Math.round(s.avgPerShift || 0)} VND; ` +
    `giờ trung bình mỗi ca = ${s.avgHoursPerShift || 0}; ` +
    `số ca đã làm = ${s.shiftCount || 0}.\n` +
    `HÔM NAY là ${body.today || ''} (dùng để tính ngày tương đối).\n` +
    `Ngôn ngữ trả lời: ${body.lang === 'vi' ? 'Tiếng Việt' : 'English'}.\n` +
    `===== HƯỚNG DẪN DÙNG APP (nguồn DUY NHẤT cho câu hỏi cách dùng) =====\n` +
    `${body.guide || '(không có hướng dẫn)'}\n` +
    `===== HẾT HƯỚNG DẪN =====\n` +
    `Câu hỏi: ${message}`

  const reqBody = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: 'user', parts: [{ text: context }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: SCHEMA,
      temperature: 0.3,
      maxOutputTokens: 1024,
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
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text || '')
        .join('') || ''
    const parsed = JSON.parse(text)
    return json(parsed, 200)
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
