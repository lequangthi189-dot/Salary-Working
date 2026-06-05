// Supabase Edge Function: extract-schedule
// Nhận ảnh lịch làm việc + họ tên, dùng Claude (vision) đọc lịch và trả về
// ca theo từng thứ trong tuần cho đúng người. API key Anthropic được giữ ở
// server (biến môi trường ANTHROPIC_API_KEY) — KHÔNG bao giờ lộ ra frontend.
//
// Triển khai:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   supabase functions deploy extract-schedule
//
// Gọi từ frontend (kèm Authorization: Bearer <user access token>):
//   POST { image: "<base64 không gồm tiền tố data:>", mediaType: "image/png", employeeCode: "..." }

import Anthropic from 'npm:@anthropic-ai/sdk@0.70.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Schema cho structured output: mỗi thứ có giờ vào/ra (HH:MM 24h) hoặc nghỉ.
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    found: {
      type: 'boolean',
      description: 'true nếu tìm thấy dòng khớp tên trong ảnh',
    },
    matched_code: {
      type: 'string',
      description: 'Mã nhân viên trong ảnh đã khớp (chuỗi rỗng nếu không tìm thấy)',
    },
    days: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          weekday: { type: 'string', enum: WEEKDAYS },
          start: {
            type: 'string',
            description: 'Giờ bắt đầu "HH:MM" 24h, rỗng nếu nghỉ/không rõ',
          },
          end: {
            type: 'string',
            description: 'Giờ kết thúc "HH:MM" 24h, rỗng nếu nghỉ/không rõ',
          },
          off: { type: 'boolean', description: 'true nếu ngày này nghỉ' },
          raw: { type: 'string', description: 'Nội dung ô gốc trong ảnh' },
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
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

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

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'Server chưa cấu hình ANTHROPIC_API_KEY' }, 500)

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

  const anthropic = new Anthropic({ apiKey })

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      output_config: {
        format: { type: 'json_schema', schema: SCHEMA },
      },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: image,
              },
            },
            {
              type: 'text',
              text: `Mã nhân viên cần lấy lịch: "${employeeCode}". Trả về ca từng thứ Mon..Sun.`,
            },
          ],
        },
      ],
    })

    const text = msg.content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('')
    const parsed = JSON.parse(text)
    return json(parsed, 200)
  } catch (e) {
    return json({ error: `Lỗi gọi Claude: ${String(e?.message || e)}` }, 502)
  }
})

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
