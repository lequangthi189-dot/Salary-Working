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
// CHẾ ĐỘ TUẦN: trả về 7 thứ Mon..Sun.
const SCHEMA_WEEK = {
  type: 'OBJECT',
  properties: {
    is_roster: { type: 'BOOLEAN' },
    doc_type: { type: 'STRING', enum: ['schedule', 'timesheet', 'other'] },
    found: { type: 'BOOLEAN' },
    matched_code: { type: 'STRING' },
    // Tháng/năm đọc được ở TIÊU ĐỀ bảng (nếu có). 0 = không thấy.
    sheet_month: { type: 'INTEGER' },
    sheet_year: { type: 'INTEGER' },
    days: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          weekday: { type: 'STRING', enum: WEEKDAYS },
          // SỐ NGÀY TRẦN (1–31) đọc nguyên ở header cột; 0 = cột không ghi ngày.
          day: { type: 'INTEGER' },
          date: { type: 'STRING' },
          start: { type: 'STRING' },
          end: { type: 'STRING' },
          off: { type: 'BOOLEAN' },
          raw: { type: 'STRING' },
        },
        required: ['weekday', 'day', 'date', 'start', 'end', 'off', 'raw'],
      },
    },
  },
  required: [
    'is_roster',
    'doc_type',
    'found',
    'matched_code',
    'sheet_month',
    'sheet_year',
    'days',
  ],
}

// CHẾ ĐỘ THÁNG: trả về MẢNG NGÀY (entries) theo ngày tháng, không ràng buộc thứ.
const SCHEMA_MONTH = {
  type: 'OBJECT',
  properties: {
    is_roster: { type: 'BOOLEAN' },
    doc_type: { type: 'STRING', enum: ['schedule', 'timesheet', 'other'] },
    found: { type: 'BOOLEAN' },
    matched_code: { type: 'STRING' },
    entries: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          date: { type: 'STRING' },
          start: { type: 'STRING' },
          end: { type: 'STRING' },
          off: { type: 'BOOLEAN' },
          raw: { type: 'STRING' },
        },
        required: ['date', 'start', 'end', 'off', 'raw'],
      },
    },
  },
  required: ['is_roster', 'doc_type', 'found', 'matched_code', 'entries'],
}

const SYSTEM_WEEK = `Bạn là công cụ đọc bảng phân ca làm việc (work roster) từ ảnh.
Người dùng cung cấp THÔNG TIN NHẬN DẠNG nhân viên (một hoặc nhiều trong: mã nhân viên, họ tên, số điện thoại). Nhiệm vụ:
0. Trước tiên xác định ảnh CÓ PHẢI bảng phân ca / lịch làm việc / bảng chấm công không (có lưới thứ–ngày và giờ ca). Nếu KHÔNG phải (vd ảnh chân dung, phong cảnh, ảnh màn hình khác, văn bản không liên quan) thì đặt is_roster=false, doc_type="other", found=false, sheet_month=0, sheet_year=0, days=[] rồi dừng. Nếu phải thì is_roster=true và làm tiếp.
0b. Phân loại doc_type:
   - "schedule" = LỊCH PHÂN CA / LỊCH ĐI LÀM (giờ vào–ra DỰ KIẾN cho tuần, thường là kế hoạch sắp tới; ô ghi khung giờ như "09:00-17:00").
   - "timesheet" = BẢNG CÔNG / CHẤM CÔNG (ghi nhận công ĐÃ làm; thường có TỔNG GIỜ mỗi ngày như "7.55", "8.0", hoặc giờ check-in/out thực tế, có tiêu đề kiểu "Bảng công"/"Chấm công").
   Chọn loại khớp nhất.
1. Tìm trong ảnh DÒNG ứng với nhân viên khớp nhất theo BẤT KỲ thông tin nào ở trên (ưu tiên mã nhân viên; nếu không có/không khớp thì dùng họ tên; rồi tới số điện thoại). Bỏ qua khác biệt hoa thường/khoảng trắng/dấu cách/dấu tiếng Việt. Nếu không có dòng nào khớp hợp lý, đặt found=false.
2. Với mỗi thứ trong tuần (Mon..Sun) của người đó, đọc giờ bắt đầu và kết thúc ca.
   - Chuẩn hoá về "HH:MM" 24 giờ (vd "9h"->"09:00", "5pm"->"17:00", "9-17"-> start 09:00 end 17:00).
   - Nếu ô ghi nghỉ/trống/"OFF"/"X" thì off=true, start="" , end="".
   - Nếu ảnh không có thứ nào đó, vẫn trả về thứ đó với off=true.
   - "raw": NẾU ảnh có in sẵn TỔNG GIỜ CÔNG của ngày đó (vd "7.55", "8.0", "8h"),
     hãy ghi CHỈ con số tổng giờ đó vào "raw" (vd "7.55"). Con số tổng này đã trừ
     giờ nghỉ giải lao nên là nguồn đúng nhất — luôn ghi nó kể cả khi đã có start/end.
     Nếu ảnh KHÔNG in tổng giờ thì để raw="". KHÔNG ghi khoảng giờ vào "raw".
3. "day" = SỐ NGÀY (số nguyên 1–31) ghi ở header của cột thứ đó (vd cột ghi
   "8 T2 Mon" → day=8). CHỈ đọc đúng con số HIỆN trên ảnh; TUYỆT ĐỐI KHÔNG tự suy,
   KHÔNG tự tính, KHÔNG cộng/trừ, KHÔNG ghép tháng/năm. Cột không ghi số ngày → day=0.
4. "date": CHỈ điền khi ảnh in SẴN ngày ĐẦY ĐỦ có cả ngày-tháng-năm (vd "08/06/2026"
   hoặc "2026-06-08") → chuẩn hoá "YYYY-MM-DD". Nếu ảnh không in đủ năm thì để date=""
   (đừng bịa tháng/năm — phần ghép ngày do hệ thống tự làm dựa trên "day").
5. "sheet_month"/"sheet_year": nếu TIÊU ĐỀ / đầu bảng có ghi THÁNG (và NĂM) áp dụng
   cho cả bảng (vd "Bảng công tháng 6/2026", "THÁNG 06", "Kỳ công 06/2026") thì đặt
   sheet_month=6, sheet_year=2026. Chỉ điền khi thấy rõ; không thấy tháng → sheet_month=0;
   không thấy năm → sheet_year=0.
6. Luôn trả đủ 7 thứ Mon..Sun, không bịa giờ khi không chắc (để off=true).
Chỉ trả JSON đúng schema, không thêm chữ.`

const SYSTEM_MONTH = `Bạn là công cụ đọc BẢNG CÔNG / BẢNG PHÂN CA cả THÁNG từ ảnh.
Người dùng cung cấp THÔNG TIN NHẬN DẠNG nhân viên (một hoặc nhiều trong: mã nhân viên, họ tên, số điện thoại). Nhiệm vụ:
0. Xác định ảnh CÓ PHẢI bảng phân ca / lịch làm việc / bảng chấm công không. Nếu KHÔNG phải thì is_roster=false, doc_type="other", found=false, entries=[] rồi dừng. Nếu phải thì is_roster=true.
0b. Phân loại doc_type: "schedule" = lịch phân ca (giờ vào–ra dự kiến); "timesheet" = bảng công đã làm (tổng giờ/ngày hoặc giờ check-in/out). Chọn loại khớp nhất.
1. Tìm DÒNG/Ô ứng với nhân viên khớp nhất theo bất kỳ thông tin nào (ưu tiên mã, rồi họ tên, rồi SĐT). Bỏ qua khác biệt hoa thường/khoảng trắng/dấu. Không khớp → found=false, entries=[].
2. Đọc TẤT CẢ CÁC NGÀY có công của người đó TRONG THÁNG. Mỗi ngày trả về MỘT entry:
   - "date" dạng "YYYY-MM-DD". Nếu ảnh chỉ ghi số ngày hoặc dd/mm (thiếu năm/tháng) thì suy ra theo "Kỳ lương cần đọc" (khoảng ngày) hoặc "Tháng cần đọc" được cung cấp. Khi kỳ VẮT QUA 2 THÁNG: số ngày LỚN (cuối tháng, ≥ ngày bắt đầu kỳ) thuộc THÁNG ĐẦU; số ngày NHỎ (≤ ngày chốt kỳ) thuộc THÁNG CHỐT.
   - "start"/"end": chuẩn hoá "HH:MM" 24 giờ (vd "9h"->"09:00"). Nếu ảnh chỉ ghi TỔNG GIỜ (vd "7.55") thì để start="" end="".
   - "raw": NẾU ảnh có in sẵn TỔNG GIỜ CÔNG của ngày (vd "7.55", "8.0", "8h") thì ghi CHỈ con số tổng giờ đó vào "raw" (vd "7.55"). Tổng này đã trừ giờ nghỉ nên là nguồn đúng nhất — luôn ghi kể cả khi đã có start/end. Nếu ảnh KHÔNG in tổng giờ thì raw="". KHÔNG ghi khoảng giờ vào "raw".
   - Ngày nghỉ/trống/"OFF"/"X" → off=true, start="", end="".
3. CHỈ trả các ngày THỰC SỰ có trong ảnh cho người đó; KHÔNG bịa ngày, KHÔNG cần liệt kê ngày không xuất hiện.
4. Không bịa giờ khi không chắc (off=true). Chỉ trả JSON đúng schema, không thêm chữ.`

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
    scope?: string
    month?: string
    // Chế độ KỲ LƯƠNG: khoảng ngày thật của kỳ ("YYYY-MM-DD"), có thể vắt 2 tháng.
    periodStart?: string
    periodEnd?: string
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Body JSON không hợp lệ' }, 400)
  }
  // weekStart không còn dùng ở server (chế độ tuần): client tự ghép số ngày → ngày
  // đầy đủ dựa trên ô "Tuần đầu" / tháng đọc trong ảnh.
  const { image, mediaType, employeeCode, fullName, phone, scope, month } = body
  const periodStart = (body.periodStart || '').trim()
  const periodEnd = (body.periodEnd || '').trim()
  const isoRe = /^\d{4}-\d{2}-\d{2}$/
  const hasPeriod = isoRe.test(periodStart) && isoRe.test(periodEnd)
  const isMonth = scope === 'month'
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
    const idText =
      'Thông tin nhận dạng nhân viên cần lấy lịch:' +
      (employeeCode ? ` Mã: "${employeeCode}".` : '') +
      (fullName ? ` Họ tên: "${fullName}".` : '') +
      (phone ? ` SĐT: "${phone}".` : '')
    // Chế độ kỳ lương: hướng dẫn AI map SỐ NGÀY trần qua ranh giới 2 tháng dựa trên
    // khoảng kỳ thật (vd 26/05–25/06): số ngày lớn (≥ ngày bắt đầu) thuộc tháng đầu,
    // số ngày nhỏ (≤ ngày chốt) thuộc tháng chốt. Không có khoảng kỳ → fallback tháng.
    const periodHint = hasPeriod
      ? ` Kỳ lương cần đọc TỪ ${periodStart} ĐẾN ${periodEnd} (có thể vắt qua 2 tháng).` +
        ` Nếu ảnh CHỈ ghi SỐ NGÀY trần (thiếu tháng/năm): số ngày >= ${Number(
          periodStart.slice(8, 10)
        )} thuộc tháng ${periodStart.slice(0, 7)}; số ngày <= ${Number(
          periodEnd.slice(8, 10)
        )} thuộc tháng ${periodEnd.slice(0, 7)}.` +
        ` CHỈ trả các ngày NẰM TRONG khoảng ${periodStart}..${periodEnd}.`
      : month
        ? ` Tháng cần đọc: ${month}.`
        : ''
    const userText = isMonth
      ? idText +
        ' Trả về TẤT CẢ ngày có công trong kỳ (mỗi ngày một entry).' +
        periodHint
      : idText +
        ' Trả về ca từng thứ Mon..Sun. Với mỗi cột đọc "day" = SỐ NGÀY trần ghi ở' +
        ' header (1–31, không có thì 0) và đọc tháng/năm ở tiêu đề nếu có' +
        ' (sheet_month/sheet_year). KHÔNG tự suy hay ghép ngày — hệ thống tự ghép.'

    const reqBody = JSON.stringify({
      systemInstruction: { parts: [{ text: isMonth ? SYSTEM_MONTH : SYSTEM_WEEK }] },
      contents: [
        {
          role: 'user',
          parts: [
            { inline_data: { mime_type: mediaType, data: image } },
            { text: userText },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: isMonth ? SCHEMA_MONTH : SCHEMA_WEEK,
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
