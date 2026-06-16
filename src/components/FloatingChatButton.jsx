import { useEffect, useRef, useState, useCallback } from 'react'
import ChatbotAvatar from './ChatbotAvatar.jsx'
import './FloatingChatButton.css'

// NÚT NỔI mở trợ lý lương: position:fixed, kéo-thả bằng POINTER EVENTS (chạy cả
// chuột lẫn cảm ứng), phân biệt KÉO vs CHẠM, kẹp trong viewport. Vị trí được lưu
// THEO TỪNG USER trên Supabase (qua onPersist) để đồng bộ nhiều thiết bị; initialPos
// là vị trí đã lưu. Chạm (< ngưỡng) → mở chat; kéo (nhiều hơn) → KHÔNG mở.

const SIZE = 56 // đường kính nút (px) — khớp CSS
const MARGIN = 12 // chừa mép viewport (px)
const DRAG_THRESHOLD = 5 // di chuyển ≤ ngưỡng (px) coi là CHẠM, hơn là KÉO

// Kẹp (x,y) để nút luôn NẰM TRONG màn hình (chừa MARGIN ở mọi cạnh).
function clamp(x, y) {
  const maxX = Math.max(MARGIN, window.innerWidth - SIZE - MARGIN)
  const maxY = Math.max(MARGIN, window.innerHeight - SIZE - MARGIN)
  return {
    x: Math.min(Math.max(MARGIN, x), maxX),
    y: Math.min(Math.max(MARGIN, y), maxY),
  }
}

// Vị trí mặc định: góc DƯỚI–PHẢI (kiểu FAB).
function defaultPos() {
  return clamp(window.innerWidth - SIZE - MARGIN, window.innerHeight - SIZE - MARGIN)
}

// HÍT MÉP: kẹp trong khung rồi đẩy x về cạnh TRÁI hoặc PHẢI gần tâm nút hơn. Giữ
// nguyên y. Hợp mobile (nút luôn dính một bên, không che giữa màn hình).
function snapToEdge(x, y) {
  const c = clamp(x, y)
  const maxX = Math.max(MARGIN, window.innerWidth - SIZE - MARGIN)
  const centerX = c.x + SIZE / 2
  return { x: centerX < window.innerWidth / 2 ? MARGIN : maxX, y: c.y }
}

// Vị trí lưu hợp lệ ({x,y} số) → trả về; sai/không có → null để dùng mặc định.
function validPos(p) {
  return p && typeof p.x === 'number' && typeof p.y === 'number' ? p : null
}

export default function FloatingChatButton({
  onOpen,
  initialPos = null,
  onPersist,
  label = 'Chat',
}) {
  // pos = null tới khi đo được viewport (tránh nhảy vị trí lúc mount).
  const [pos, setPos] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [snapping, setSnapping] = useState(false) // đang chạy animation hít mép
  // Dữ liệu phiên kéo hiện tại (không cần re-render nên để trong ref).
  const drag = useRef(null) // { startX, startY, originX, originY, moved }
  const btnRef = useRef(null)
  const snapTimer = useRef(null)

  // Khởi tạo vị trí: đã lưu theo user (initialPos) → HÍT MÉP (giữ dính cạnh, phòng
  // đổi kích thước màn hình giữa các thiết bị); chưa có → mặc định góc dưới-phải.
  // Chỉ chạy 1 LẦN (initialPos ở thời điểm mount) để không nhảy khi profile reload.
  useEffect(() => {
    const saved = validPos(initialPos)
    setPos(saved ? snapToEdge(saved.x, saved.y) : defaultPos())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Xoay/resize màn hình: hít lại mép để nút vẫn dính cạnh & trong khung mới.
  useEffect(() => {
    function onResize() {
      setPos((p) => (p ? snapToEdge(p.x, p.y) : p))
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  useEffect(() => () => clearTimeout(snapTimer.current), [])

  const onPointerDown = useCallback((e) => {
    if (e.button != null && e.button !== 0) return // chỉ nút trái / chạm
    clearTimeout(snapTimer.current)
    setSnapping(false) // kéo phải bám con trỏ tức thì (không transition)
    const rect = btnRef.current.getBoundingClientRect()
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false,
    }
    setDragging(true)
    // Giữ pointer để move/up vẫn bắn dù con trỏ rời khỏi nút.
    btnRef.current.setPointerCapture?.(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    // Vượt ngưỡng MỘT LẦN là coi như đã kéo cho tới khi thả (tránh rung cận ngưỡng).
    if (!d.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) d.moved = true
    setPos(clamp(d.originX + dx, d.originY + dy))
  }, [])

  const onPointerUp = useCallback(
    (e) => {
      const d = drag.current
      drag.current = null
      setDragging(false)
      btnRef.current?.releasePointerCapture?.(e.pointerId)
      if (!d) return
      if (d.moved) {
        // KÉO xong → HÍT MÉP (trượt dính cạnh gần nhất) + LƯU, KHÔNG mở chat.
        setSnapping(true)
        setPos((p) => {
          const snapped = p ? snapToEdge(p.x, p.y) : p
          if (snapped) onPersist?.(snapped) // lưu THEO USER (Supabase) sau mỗi lần kéo
          return snapped
        })
        // Tắt transition sau khi trượt xong (khớp thời lượng CSS).
        snapTimer.current = setTimeout(() => setSnapping(false), 230)
      } else {
        // CHẠM (gần như không di chuyển) → mở chat.
        onOpen?.()
      }
    },
    [onOpen]
  )

  if (!pos) return null

  return (
    <button
      ref={btnRef}
      type="button"
      className={`chat-fab${dragging ? ' chat-fab--dragging' : ''}${snapping ? ' chat-fab--snapping' : ''}`}
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      aria-label={label}
      title={label}
    >
      <ChatbotAvatar size={36} />
    </button>
  )
}
