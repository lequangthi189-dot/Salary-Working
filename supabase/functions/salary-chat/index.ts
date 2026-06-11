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
  },
  required: ['reply', 'target'],
}

const SYSTEM = `Bạn là TRỢ LÝ LƯƠNG của một app chấm công. Trả lời NGẮN GỌN, thân thiện, bằng ĐÚNG ngôn ngữ của câu hỏi (Việt hoặc Anh).
Người dùng được cung cấp SỐ LIỆU thật (lương kỳ này, đơn giá lương 1 giờ ca ngày và ca đêm, lương/giờ trung bình mỗi ca). Tuyệt đối KHÔNG bịa số; chỉ dùng số liệu được cung cấp.
- Nếu người dùng hỏi kiểu "cần làm bao nhiêu ca / bao nhiêu giờ / bao nhiêu nữa để ĐẠT/NHẬN được X tiền", hãy đặt field "target" = X (chỉ chữ số, đơn vị VND, vd "3000000"), và để "reply" là một câu mở đầu ngắn (vd "Để đạt mục tiêu đó:"). KHÔNG tự tính trong reply — app sẽ tự tính chính xác số GIỜ ngày/đêm cần làm dựa trên lương 1 giờ.
- Nếu là câu hỏi chung (vd "tôi đang được bao nhiêu", "trung bình mỗi ca bao nhiêu"), trả lời thẳng trong "reply" dựa trên số liệu, và đặt "target" = "".
- Nếu không liên quan lương, lịch sự từ chối ngắn gọn, "target" = "".`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) return json({ error: 'Server chưa cấu hình GEMINI_API_KEY' }, 500)

  let body: {
    message?: string
    lang?: string
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
    `Ngôn ngữ trả lời: ${body.lang === 'vi' ? 'Tiếng Việt' : 'English'}.\n` +
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
