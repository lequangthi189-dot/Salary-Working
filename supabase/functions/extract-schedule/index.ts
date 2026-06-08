// Supabase Edge Function: extract-schedule
// Nhận ảnh lịch làm việc + mã nhân viên, dùng Google Gemini (vision) đọc lịch
// và trả về ca theo từng thứ trong tuần cho đúng người. API key Gemini được giữ
// ở server (biến môi trường GEMINI_API_KEY) — KHÔNG bao giờ lộ ra frontend.
//
// Lấy API key: https://aistudio.google.com/app/apikey  (có gói miễn phí)
//
// Triển khai:
//   supabase secrets set GEMINI_API_KEY=AIza...
//   supabase functions deploy extract-schedule
//
// Gọi từ frontend (kèm Authorization: Bearer <user access token>):
//   POST { image: "<base64 không gồm tiền tố data:>", mediaType: "image/png", employeeCode: "..." }

import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Danh sách model Gemini thử lần lượt (env GEMINI_MODEL, ngăn cách bằng dấu phẩy).
// flash = nhanh, rẻ, có free tier. Nếu model đầu hết quota (429) sẽ thử model kế.
// Mặc định: 3.5-flash (mới nhất) -> 2.5-flash -> 2.0-flash.
const GEMINI_MODELS = (Deno.env.get('GEMINI_MODEL') ||
  'gemini-3.5-flash,gemini-2.5-flash,gemini-2.0-flash')
  .split(',')
  .map((s: string) => s.trim())
  .filter(Boolean)

// responseSchema theo định dạng OpenAPI của Gemini (type viết HOA).
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    found: { type: 'BOOLEAN' },
    matched_code: { type: 'STRING' },
    days: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          weekday: { type: 'STRING', enum: WEEKDAYS },
          date: { type: 'STRING' },
          start: { type: 'STRING' },
          end: { type: 'STRING' },
          off: { type: 'BOOLEAN' },
          raw: { type: 'STRING' },
        },
        required: ['weekday', 'date', 'start', 'end', 'off', 'raw'],
      },
    },
  },
  required: ['found', 'matched_code', 'days'],
}

const SYSTEM = `Bạn là công cụ đọc bảng phân ca làm việc (work roster) từ ảnh.
Người dùng cung cấp THÔNG TIN NHẬN DẠNG nhân viên (một hoặc nhiều trong: mã nhân viên, họ tên, số điện thoại). Nhiệm vụ:
1. Tìm trong ảnh DÒNG ứng với nhân viên khớp nhất theo BẤT KỲ thông tin nào ở trên (ưu tiên mã nhân viên; nếu không có/không khớp thì dùng họ tên; rồi tới số điện thoại). Bỏ qua khác biệt hoa thường/khoảng trắng/dấu cách/dấu tiếng Việt. Nếu không có dòng nào khớp hợp lý, đặt found=false.
2. Với mỗi thứ trong tuần (Mon..Sun) của người đó, đọc giờ bắt đầu và kết thúc ca.
   - Chuẩn hoá về "HH:MM" 24 giờ (vd "9h"->"09:00", "5pm"->"17:00", "9-17"-> start 09:00 end 17:00).
   - Nếu ô ghi nghỉ/trống/"OFF"/"X" thì off=true, start="" , end="".
   - Nếu ảnh không có thứ nào đó, vẫn trả về thứ đó với off=true.
3. Đọc NGÀY THÁNG ghi cho từng thứ trong ảnh (nếu có) và trả về field "date" dạng
   "YYYY-MM-DD". Nếu ảnh chỉ ghi số ngày hoặc dd/mm (thiếu năm/tháng) thì suy ra
   dựa trên "Tuần bắt đầu" được cung cấp. Nếu ảnh KHÔNG ghi ngày thì để date="".
4. Luôn trả đủ 7 thứ Mon..Sun, không bịa giờ khi không chắc (để off=true).
Chỉ trả JSON đúng schema, không thêm chữ.`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // Xác thực người dùng qua JWT của Supabase (chỉ user đã đăng nhập mới gọi được).
  const authHeader = req.headers.get('Authorization') || ''
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) return json({ error: 'Server chưa cấu hình GEMINI_API_KEY' }, 500)

  let body: {
    image?: string
    mediaType?: string
    employeeCode?: string
    fullName?: string
    phone?: string
    weekStart?: string
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Body JSON không hợp lệ' }, 400)
  }
  const { image, mediaType, employeeCode, fullName, phone, weekStart } = body
  const hasId = [employeeCode, fullName, phone].some(
    (v) => v && String(v).trim()
  )
  if (!image || !mediaType || !hasId) {
    return json(
      { error: 'Thiếu image / mediaType / thông tin nhận dạng (mã, họ tên hoặc SĐT)' },
      400
    )
  }

  try {
    const reqBody = JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [
        {
          role: 'user',
          parts: [
            { inline_data: { mime_type: mediaType, data: image } },
            {
              text:
                'Thông tin nhận dạng nhân viên cần lấy lịch:' +
                (employeeCode ? ` Mã: "${employeeCode}".` : '') +
                (fullName ? ` Họ tên: "${fullName}".` : '') +
                (phone ? ` SĐT: "${phone}".` : '') +
                ' Trả về ca từng thứ Mon..Sun.' +
                (weekStart ? ` Tuần bắt đầu (Thứ 2) khoảng: ${weekStart}.` : ''),
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: SCHEMA,
        temperature: 0,
        maxOutputTokens: 2048,
      },
    })

    // Thử lần lượt từng model; nếu 429 (hết quota) thì chuyển model kế tiếp.
    let resp: Response | null = null
    for (const model of GEMINI_MODELS) {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` +
        encodeURIComponent(apiKey)
      resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: reqBody,
      })
      if (resp.ok) break
      if (resp.status === 429) continue // hết quota model này, thử model sau
      // Lỗi khác (4xx/5xx) → báo luôn, không thử tiếp.
      const errText = await resp.text()
      return json({ error: `Lỗi gọi Gemini (${resp.status}): ${errText}` }, 502)
    }

    // Hết danh sách mà vẫn không OK → tất cả model đều hết quota (429).
    if (!resp || !resp.ok) {
      return json(
        {
          error:
            `Hết hạn mức (quota) Gemini cho các model đã thử (${GEMINI_MODELS.join(', ')}).\n` +
            `Vui lòng bật thanh toán cho API key tại https://aistudio.google.com/app/apikey ` +
            `hoặc dùng API key của project khác còn free tier, rồi đặt lại GEMINI_API_KEY.`,
        },
        429
      )
    }

    const data = await resp.json()
    // Nếu bị chặn (safety) hoặc không có ứng viên → báo rõ lý do.
    if (data?.promptFeedback?.blockReason) {
      return json(
        { error: `Gemini chặn ảnh: ${data.promptFeedback.blockReason}` },
        502
      )
    }
    const cand = data?.candidates?.[0]
    const text =
      cand?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') ||
      ''
    if (!text) {
      return json(
        {
          error: `Gemini không trả nội dung (finishReason: ${
            cand?.finishReason || 'unknown'
          }).`,
        },
        502
      )
    }
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      return json(
        { error: `Gemini trả không phải JSON: ${text.slice(0, 300)}` },
        502
      )
    }
    return json(parsed, 200)
  } catch (e) {
    return json({ error: `Lỗi xử lý: ${String((e as Error)?.message || e)}` }, 502)
  }
})

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
