// Supabase Edge Function: fx-rate
// Lấy tỉ giá VND -> GBP/USD/AUD từ open.er-api.com (miễn phí, KHÔNG cần API key).
//
// Triển khai:
//   supabase functions deploy fx-rate
//
// Gọi từ frontend: supabase.functions.invoke('fx-rate') -> { rates: {GBP,USD,AUD}, time }
//
// Ngữ nghĩa rate: 1 VND = rate đơn vị ngoại tệ (giống FALLBACK ở currency.jsx).

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

const BASE = Deno.env.get('FX_API_BASE') || 'https://open.er-api.com/v6'
const WANT = ['GBP', 'USD', 'AUD']

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  // FX là tính năng phụ (frontend có tỉ giá fallback). Mọi lỗi nguồn vẫn trả
  // HTTP 200 với rates:{} + trường error để: (1) console không có dòng đỏ,
  // (2) client tự dùng fallback. Không bao giờ trả mã lỗi ở đây.
  try {
    // base=VND → trả tỉ giá 1 VND sang mọi đồng tiền trong `rates`.
    const res = await fetch(`${BASE}/latest/VND`)
    if (!res.ok) {
      const txt = await res.text()
      return json({ rates: {}, error: `Lỗi nguồn tỉ giá (${res.status}): ${txt}` })
    }
    const body = (await res.json()) as {
      result?: string
      rates?: Record<string, number>
    }
    if (body.result !== 'success' || !body.rates) {
      return json({ rates: {}, error: 'Nguồn tỉ giá trả dữ liệu không hợp lệ' })
    }
    const rates: Record<string, number> = {}
    for (const cur of WANT) {
      if (typeof body.rates[cur] === 'number') rates[cur] = body.rates[cur]
    }
    return json({ rates, time: Date.now() })
  } catch (e) {
    return json({ rates: {}, error: `Lỗi xử lý: ${String((e as Error)?.message || e)}` })
  }
})

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
