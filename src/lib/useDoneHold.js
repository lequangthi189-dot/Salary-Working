import { useEffect, useRef, useState } from 'react'

// Giữ trạng thái "Hoàn tất" của ProgressButton hiển thị THÊM một nhịp ngắn sau khi
// xử lý xong, rồi mới ẩn nút và cho xem kết quả. Nếu không, loading=false sẽ ẩn nút
// tức thì nên người dùng không kịp thấy mốc 100% / "Hoàn tất ✓".
//
// CHỈ gọi hold() ở nhánh THÀNH CÔNG — khi lỗi thì đừng gọi, done vẫn false → không
// bao giờ hiện "Done" lúc thật ra lỗi.
export function useDoneHold(holdMs = 900) {
  const [done, setDone] = useState(false)
  const timer = useRef(null)

  function clear() {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  // Bật done (nút giữ trạng thái hoàn tất) rồi tự tắt sau holdMs; chạy onAfter (vd
  // hiện bảng kết quả) đúng lúc tắt để kết quả lộ ra sau khi đã thấy "Hoàn tất".
  function hold(onAfter) {
    clear()
    setDone(true)
    timer.current = setTimeout(() => {
      timer.current = null
      setDone(false)
      onAfter?.()
    }, holdMs)
  }

  // Dọn timer khi đóng modal giữa chừng → tránh setState sau khi unmount.
  useEffect(() => clear, [])

  return { done, hold }
}
