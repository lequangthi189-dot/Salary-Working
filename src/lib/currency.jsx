import { createContext, useContext, useEffect, useState } from 'react'

// Tỉ giá quy đổi từ VND sang ngoại tệ (1 VND = rate đơn vị tiền đó).
// Nguồn: Wise (mid-market) qua Edge Function `fx-rate` (token giữ ở server),
// làm mới mỗi 24h. Có cache localStorage + tỉ giá dự phòng để offline/hỏng API
// không làm vỡ app.

const FALLBACK = { GBP: 1 / 31000, USD: 1 / 25000, AUD: 1 / 16500 } // ~xấp xỉ, chỉ dùng khi chưa có tỉ giá thật
const STORAGE_KEY = 'fx-rates'
export const FX_MAX_AGE = 24 * 60 * 60 * 1000 // 24 giờ

let _rates = { ...FALLBACK }
let _updatedAt = null

export function getRate(cur) {
  return _rates[cur] ?? FALLBACK[cur] ?? 1
}
export function getRatesUpdatedAt() {
  return _updatedAt
}

function loadCache() {
  try {
    const c = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (c && c.rates && c.ts) return c
  } catch {
    /* ignore */
  }
  return null
}

// Đảm bảo có tỉ giá: dùng cache nếu còn mới (<24h), nếu không thì fetch mới.
export async function ensureRates(force = false) {
  const cached = loadCache()
  if (cached) {
    _rates = { ...FALLBACK, ...cached.rates }
    _updatedAt = cached.ts
  }
  const fresh = cached && Date.now() - cached.ts < FX_MAX_AGE
  if (fresh && !force) return { ts: _updatedAt }

  try {
    // Import động để lib tính toán (shiftMath) không kéo theo supabase lúc load.
    const { supabase } = await import('./supabase.js')
    const { data, error } = await supabase.functions.invoke('fx-rate')
    if (!error && data?.rates && (data.rates.GBP || data.rates.USD)) {
      _rates = { ...FALLBACK, ...data.rates }
      _updatedAt = data.time || Date.now()
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ rates: _rates, ts: _updatedAt })
      )
    }
  } catch {
    /* giữ cache/fallback */
  }
  return { ts: _updatedAt }
}

const CurrencyContext = createContext({ updatedAt: null })

export function CurrencyProvider({ children }) {
  const [updatedAt, setUpdatedAt] = useState(getRatesUpdatedAt())
  useEffect(() => {
    let alive = true
    ensureRates().then((r) => alive && setUpdatedAt(r.ts))
    // Tự làm mới mỗi 24h khi app đang mở.
    const id = setInterval(
      () => ensureRates(true).then((r) => alive && setUpdatedAt(r.ts)),
      FX_MAX_AGE
    )
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])
  return (
    <CurrencyContext.Provider value={{ updatedAt }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
