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

// Model Gemini đọc ảnh + trả JSON. flash = nhanh, rẻ, có free tier.
const GEMINI_MODEL = 'gemini-2.0-flash'

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
          start: { type: 'STRING' },
          end: { type: 'STRING' },
          off: { type: 'BOOLEAN' },
          raw: { type: 'STRING' },
        },
        required: ['weekday', 'start', 'end', 'off', 'raw'],
      },
    },
  },
  required: ['found', 'matched_code', 'days'],
}

const SYSTEM = `Bạn là công cụ đọc bảng phân ca làm việc (work roster) từ ảnh.
Người dùng cung cấp MÃ NHÂN VIÊN. Nhiệm vụ:
1. Tìm trong ảnh DÒNG ứng với nhân viên có MÃ khớp nhất (bỏ qua khác biệt hoa thường/khoảng trắng/dấu cách; mã thường nằm ở cột đầu). Nếu không có mã nào khớp hợp lý, đặt found=false.
2. Với mỗi thứ trong tuần (Mon..Sun) của người đó, đọc giờ bắt đầu và kết thúc ca.
   - Chuẩn hoá về "HH:MM" 24 giờ (vd "9h"->"09:00", "5pm"->"17:00", "9-17"-> start 09:00 end 17:00).
   - Nếu ô ghi nghỉ/trống/"OFF"/"X" thì off=true, start="" , end="".
   - Nếu ảnh không có thứ nào đó, vẫn trả về thứ đó với off=true.
3. Luôn trả đủ 7 thứ Mon..Sun, không bịa giờ khi không chắc (để off=true).
Chỉ trả JSON đúng schema, không thêm chữ.`

Deno.serve(async (req) => {
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

  let body: { image?: string; mediaType?: string; employeeCode?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Body JSON không hợp lệ' }, 400)
  }
  const { image, mediaType, employeeCode } = body
  if (!image || !mediaType || !employeeCode) {
    return json({ error: 'Thiếu image / mediaType / employeeCode' }, 400)
  }

  try {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=` +
      encodeURIComponent(apiKey)

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [
          {
            role: 'user',
            parts: [
              { inline_data: { mime_type: mediaType, data: image } },
              {
                text: `Mã nhân viên cần lấy lịch: "${employeeCode}". Trả về ca từng thứ Mon..Sun.`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: SCHEMA,
          temperature: 0,
        },
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      return json({ error: `Lỗi gọi Gemini (${resp.status}): ${errText}` }, 502)
    }

    const data = await resp.json()
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text || '')
        .join('') || ''
    const parsed = JSON.parse(text)
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
