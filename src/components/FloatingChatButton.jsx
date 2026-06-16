import { useEffect, useRef, useState, useCallback } from 'react'
import ChatbotAvatar from './ChatbotAvatar.jsx'
import './FloatingChatButton.css'

// NÚT NỔI mở trợ lý lương: position:fixed, kéo-thả bằng POINTER EVENTS (chạy cả
// chuột lẫn cảm ứng), phân biệt KÉO vs CHẠM, kẹp trong viewport, nhớ vị trí qua
// localStorage. Chạm (di chuyển < ngưỡng) → mở chat; kéo (di chuyển nhiều) → KHÔNG mở.

const SIZE = 56 // đường kính nút (px) — khớp CSS
const MARGIN = 12 // chừa mép viewport (px)
const DRAG_THRESHOLD = 5 // di chuyển ≤ ngưỡng (px) coi là CHẠM, hơn là KÉO
const STORAGE_KEY = 'chatFabPos' // {x,y} góc trên-trái nút

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

// Đọc vị trí đã lưu; sai/không có → null để dùng mặc định.
function loadPos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (typeof p?.x === 'number' && typeof p?.y === 'number') return p
  } catch {
    /* bỏ qua localStorage lỗi */
  }
  return null
}

export default function FloatingChatButton({ onOpen, label = 'Chat' }) {
  // pos = null tới khi đo được viewport (tránh nhảy vị trí lúc mount).
  const [pos, setPos] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [snapping, setSnapping] = useState(false) // đang chạy animation hít mép
  // Dữ liệu phiên kéo hiện tại (không cần re-render nên để trong ref).
  const drag = useRef(null) // { startX, startY, originX, originY, moved }
  const btnRef = useRef(null)
  const snapTimer = useRef(null)

  // Khởi tạo vị trí: lưu trước đó → HÍT MÉP (giữ dính cạnh); chưa có → mặc định
  // góc dưới-phải.
  useEffect(() => {
    const saved = loadPos()
    setPos(saved ? snapToEdge(saved.x, saved.y) : defaultPos())
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
          if (snapped) {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(snapped))
            } catch {
              /* bỏ qua */
            }
          }
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
