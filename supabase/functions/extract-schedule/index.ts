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
// Hết quota (429) / quá tải (503) / không tồn tại (404) ở model nào → thử model kế.
// Mặc định gồm cả bản "flash-lite" (quota free cao hơn) để tránh hết hạn mức.
const GEMINI_MODELS = (Deno.env.get('GEMINI_MODEL') ||
  'gemini-3.5-flash,gemini-3.1-flash-lite,gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.0-flash')
  .split(',')
  .map((s: string) => s.trim())
  .filter(Boolean)

// responseSchema theo định dạng OpenAPI của Gemini (type viết HOA).
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    is_roster: { type: 'BOOLEAN' },
    doc_type: { type: 'STRING', enum: ['schedule', 'timesheet', 'other'] },
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
  required: ['is_roster', 'doc_type', 'found', 'matched_code', 'days'],
}

const SYSTEM = `Bạn là công cụ đọc bảng phân ca làm việc (work roster) từ ảnh.
Người dùng cung cấp THÔNG TIN NHẬN DẠNG nhân viên (một hoặc nhiều trong: mã nhân viên, họ tên, số điện thoại). Nhiệm vụ:
0. Trước tiên xác định ảnh CÓ PHẢI bảng phân ca / lịch làm việc / bảng chấm công không (có lưới thứ–ngày và giờ ca). Nếu KHÔNG phải (vd ảnh chân dung, phong cảnh, ảnh màn hình khác, văn bản không liên quan) thì đặt is_roster=false, doc_type="other", found=false, days=[] rồi dừng. Nếu phải thì is_roster=true và làm tiếp.
0b. Phân loại doc_type:
   - "schedule" = LỊCH PHÂN CA / LỊCH ĐI LÀM (giờ vào–ra DỰ KIẾN cho tuần, thường là kế hoạch sắp tới; ô ghi khung giờ như "09:00-17:00").
   - "timesheet" = BẢNG CÔNG / CHẤM CÔNG (ghi nhận công ĐÃ làm; thường có TỔNG GIỜ mỗi ngày như "7.55", "8.0", hoặc giờ check-in/out thực tế, có tiêu đề kiểu "Bảng công"/"Chấm công").
   Chọn loại khớp nhất.
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
        // Đủ rộng để JSON không bị cắt (model flash mới tốn token cho "thinking").
        maxOutputTokens: 8192,
        // Tắt thinking để dành toàn bộ token cho phần JSON.
        thinkingConfig: { thinkingBudget: 0 },
      },
    })

    // Thử lần lượt từng model. 429 (hết quota) / 404 (model không tồn tại) → model
    // kế. 503/500 (quá tải) → thử lại cùng model 1 lần (đợi ~1s) rồi sang model kế.
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    let resp: Response | null = null
    let lastStatus = 0
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
        lastStatus = resp.status
        if (resp.status === 503 || resp.status === 500) {
          if (attempt === 0) {
            await sleep(1000)
            continue // quá tải → thử lại cùng model
          }
          break // vẫn quá tải → sang model kế
        }
        if (resp.status === 429 || resp.status === 404) break // hết quota / không có model → model kế
        // Lỗi khác (4xx khác) → báo luôn.
        const errText = await resp.text()
        return json({ error: `Lỗi gọi Gemini (${resp.status}): ${errText}` }, 502)
      }
      if (resp && resp.ok) break
    }

    // Hết danh sách mà vẫn không OK.
    if (!resp || !resp.ok) {
      if (lastStatus === 503 || lastStatus === 500) {
        return json(
          { error: 'Gemini đang quá tải, vui lòng thử lại sau ít phút.' },
          503
        )
      }
      return json(
        {
          error:
            `Tất cả model đã thử đều không khả dụng (hết quota / không tồn tại): ${GEMINI_MODELS.join(', ')}.\n` +
            `Hãy đặt lại GEMINI_MODEL (env) bằng tên model hợp lệ, hoặc bật thanh toán/đổi API key tại https://aistudio.google.com/app/apikey.`,
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
      // JSON bị cắt (thường do finishReason=MAX_TOKENS) → báo rõ + gợi ý thử lại.
      if (cand?.finishReason === 'MAX_TOKENS') {
        return json(
          { error: 'Ảnh quá nhiều ca nên kết quả bị cắt. Hãy thử lại hoặc dùng ảnh gọn hơn.' },
          502
        )
      }
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
