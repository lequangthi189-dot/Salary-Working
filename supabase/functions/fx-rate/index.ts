// Supabase Edge Function: fx-rate
// Lấy tỉ giá mid-market từ Wise cho VND -> GBP/USD/AUD. Token Wise giữ ở server
// (biến môi trường WISE_API_TOKEN) — KHÔNG bao giờ lộ ra frontend.
//
// Lấy token: wise.com -> Settings -> "API tokens" (tạo token read-only).
//
// Triển khai:
//   supabase secrets set WISE_API_TOKEN=xxxxxxxx
//   supabase functions deploy fx-rate
//   (môi trường live mặc định api.transferwise.com; sandbox: đặt
//    WISE_API_BASE=https://api.sandbox.transferwise.com)
//
// Gọi từ frontend: supabase.functions.invoke('fx-rate') -> { rates: {GBP,USD,AUD}, time }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

const BASE = Deno.env.get('WISE_API_BASE') || 'https://api.transferwise.com'
const WANT = ['GBP', 'USD', 'AUD']

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const token = Deno.env.get('WISE_API_TOKEN')
  if (!token) return json({ error: 'Server chưa cấu hình WISE_API_TOKEN' }, 500)

  try {
    // source=VND → trả tỉ giá VND sang mọi đồng tiền; mỗi phần tử { rate, source, target }.
    const res = await fetch(`${BASE}/v1/rates?source=VND`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const txt = await res.text()
      return json({ error: `Lỗi Wise (${res.status}): ${txt}` }, 502)
    }
    const arr = (await res.json()) as Array<{
      rate: number
      target: string
    }>
    const rates: Record<string, number> = {}
    for (const r of arr) {
      if (WANT.includes(r.target)) rates[r.target] = r.rate
    }
    return json({ rates, time: Date.now() }, 200)
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
