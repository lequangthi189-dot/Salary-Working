import { useRef, useCallback, useEffect } from 'react'

// Trickle % ƯỚC LƯỢNG cho bước "hộp đen" (gọi Gemini) — lời gọi này KHÔNG có % thật
// ở giữa, nên cho số bò CHẬM theo thời gian, tiệm cận 'cap' nhưng KHÔNG bao giờ chạm
// tới khi chưa có kết quả. Khi bước xong, chỗ gọi tự set mốc % THẬT kế tiếp (vd 75%).
// Đây là số ước lượng cho cảm giác "đang chạy", không phải tiến độ thật của Gemini.
//
// setProgress: cùng setter của state { pct, label, indeterminate } trong modal.
export function useTrickleProgress(setProgress) {
  const timer = useRef(null)
  const pct = useRef(0)

  // Dừng & dọn timer (gọi sau khi có kết quả, khi lỗi, và khi unmount → không kẹt).
  const stop = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current)
      timer.current = null
    }
  }, [])

  // Bắt đầu bò từ 'from' tới gần 'cap'. label giữ nguyên suốt bước (vd "AI đang đọc…").
  const start = useCallback(
    (from, cap, label) => {
      stop()
      pct.current = from
      setProgress({ pct: from, label, indeterminate: false })
      timer.current = setInterval(() => {
        // Mỗi nhịp tiến 8% phần KHOẢNG CÒN LẠI → chậm dần, tiệm cận cap, không vượt.
        pct.current += (cap - pct.current) * 0.08
        setProgress({ pct: pct.current, label, indeterminate: false })
      }, 400)
    },
    [setProgress, stop]
  )

  // Dọn timer khi component unmount (đóng modal giữa chừng).
  useEffect(() => stop, [stop])

  return { start, stop }
}
