// Pay rate configuration. All rates are per hour (VND-style integers).

// Đơn giá MẶC ĐỊNH (cũng là fallback khi hồ sơ chưa cấu hình). Giữ để test & tương thích.
export const DAY_RATE = 25500
export const NIGHT_RATE = 33150
// Mặc định phụ cấp đêm 30% → 25500 × 1.3 = 33150 (khớp NIGHT_RATE cũ).
export const DEFAULT_NIGHT_PCT = 30

// Night window on a 24-hour clock: [NIGHT_START:00, 24:00) ∪ [00:00, NIGHT_END:00)
export const NIGHT_START_HOUR = 22 // 22:00
export const NIGHT_END_HOUR = 6 // 06:00

// --- Cấu hình đơn giá THEO TỪNG NGƯỜI DÙNG (nạp từ hồ sơ lúc chạy) ---
// dayRate: lương 1 giờ (ca ngày). nightPct: phụ cấp ca đêm (%).
// holidayDayPct / holidayNightPct: phụ cấp ngày lễ cho ca ngày / ca đêm (%).
// Mặc định tái hiện đúng DAY_RATE / NIGHT_RATE.
let _dayRate = DAY_RATE
let _nightPct = DEFAULT_NIGHT_PCT
// Phụ cấp lễ là BỘI SỐ: lương lễ/giờ = lương ngày × (pct/100). VD 300% → ×3.
// Mặc định 100% (×1 = như ngày thường) để không trả 0 khi chưa cấu hình.
let _holidayDayPct = 100
let _holidayNightPct = 100
// Cửa hàng có ca đêm không. false → KHÔNG có phụ cấp đêm: mọi giờ tính lương thường.
let _hasNightShift = true

const toNum = (v, fallback) =>
  Number.isFinite(Number(v)) ? Number(v) : fallback

export function setRates(cfg = {}) {
  _dayRate = toNum(cfg.dayRate, _dayRate)
  _nightPct = toNum(cfg.nightPct, _nightPct)
  _holidayDayPct = toNum(cfg.holidayDayPct, _holidayDayPct)
  _holidayNightPct = toNum(cfg.holidayNightPct, _holidayNightPct)
  if (cfg.hasNightShift !== undefined) _hasNightShift = !!cfg.hasNightShift
}

// Làm tròn để tránh sai số dấu phẩy động (vd 25500×1.3).
export function getDayRate() {
  return Math.round(_dayRate)
}
export function getNightRate() {
  // Không có ca đêm → không phụ cấp: giờ đêm tính bằng lương thường (ngày).
  if (!_hasNightShift) return getDayRate()
  return Math.round(_dayRate * (1 + _nightPct / 100))
}
// Ca NGÀY lễ = lương ngày × (phụ cấp lễ ngày%). VD 25000 × 300% = 75000/giờ.
export function getHolidayDayRate() {
  return Math.round(_dayRate * (_holidayDayPct / 100))
}
// Ca ĐÊM lễ = lương ca đêm × (phụ cấp lễ đêm%) — có cộng dồn phụ cấp đêm thường.
// VD (25000 × 1.3) × 300% = 97500/giờ.
// Không có ca đêm → dùng đơn giá lễ ca ngày (không phụ cấp đêm).
export function getHolidayNightRate() {
  if (!_hasNightShift) return getHolidayDayRate()
  const nightRate = _dayRate * (1 + _nightPct / 100)
  return Math.round(nightRate * (_holidayNightPct / 100))
}
