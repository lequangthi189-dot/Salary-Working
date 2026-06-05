// Ô nhập giờ 24h thuần text — KHÔNG phụ thuộc locale của trình duyệt/OS,
// nên không bao giờ hiện AM/PM (sáng/chiều). Giá trị luôn ở dạng "HH:MM".

function pad(n) {
  return String(n).padStart(2, '0')
}

// Trong lúc gõ: chỉ giữ chữ số, tự chèn dấu ":" và chặn giờ > 23.
function maskTyping(raw) {
  const d = raw.replace(/\D/g, '').slice(0, 4)
  if (d.length === 0) return ''
  if (d.length === 1) return d
  // Nếu 2 số đầu > 23 thì coi như chỉ có 1 chữ số giờ (vd "9" rồi "30").
  const hourLen = parseInt(d.slice(0, 2), 10) > 23 ? 1 : 2
  const h = d.slice(0, hourLen)
  const m = d.slice(hourLen, hourLen + 2)
  return m.length === 0 ? h : `${h}:${m}`
}

// Khi rời ô: chuẩn hóa về "HH:MM" hợp lệ (kẹp 0–23 / 0–59), rỗng nếu để trống.
function normalize(value) {
  if (!value) return ''
  const [hRaw, mRaw] = value.split(':')
  const h = Math.min(23, parseInt(hRaw, 10) || 0)
  const m = Math.min(59, parseInt(mRaw, 10) || 0)
  return `${pad(h)}:${pad(m)}`
}

export default function TimeInput({ value, onChange, ...props }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="HH:MM"
      maxLength={5}
      pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
      value={value}
      onChange={(e) => onChange(maskTyping(e.target.value))}
      onBlur={(e) => onChange(normalize(e.target.value))}
      {...props}
    />
  )
}
