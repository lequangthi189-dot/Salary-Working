import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import './NavBar.css'

// Icon SVG (stroke currentColor → tự đổi sang trắng khi mục active nằm trong cục
// tròn). Vẽ trực tiếp để khỏi phụ thuộc thư viện / tránh emoji không render.
const ICONS = {
  payPeriod: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  account: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  guide: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" />
      <path d="M8 7h8M8 11h6" />
    </svg>
  ),
  lang: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
    </svg>
  ),
  theme: (
    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" fill="none" />
      <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none" />
    </svg>
  ),
  tools: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a4 4 0 0 0 5 5L21 12l-7 7-2-2 5-5" />
      <path d="M9.3 8.7l-2-2L4 10l2 2zM3 21l6-6" />
    </svg>
  ),
}

// Animated pill navbar có indicator: cục tròn accent trượt ngang tới mục đang chọn.
// Data-driven & quản lý mục chọn bằng useState (KHÔNG thao tác DOM trực tiếp).
//   items  — [{ key, label, icon }]  (icon = khóa trong ICONS)
//   active — chỉ số mục đồng bộ theo trạng thái view hiện tại (App truyền vào)
//   onSelect(index) — báo cho App mở panel/modal tương ứng
export default function NavBar({ items, active = 0, onSelect }) {
  const [sel, setSel] = useState(active >= 0 ? active : 0)
  const [openMenu, setOpenMenu] = useState(null) // chỉ số item đang mở menu chọn
  const [visible, setVisible] = useState(false) // mặc định ẩn; cuộn XUỐNG mới hiện
  const [indicatorX, setIndicatorX] = useState(0)
  const itemRefs = useRef([])
  const indicatorRef = useRef(null)

  // Hiện navbar khi cuộn XUỐNG, ẩn khi cuộn LÊN (hoặc đang ở đỉnh trang).
  useEffect(() => {
    let lastY = window.scrollY
    function onScroll() {
      const y = window.scrollY
      if (y > lastY + 4) setVisible(true)
      else if (y < lastY - 4 || y <= 0) setVisible(false)
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Đồng bộ với view hiện tại: app không dùng router nên "route" = trạng thái mở
  // panel/modal; App suy ra chỉ số và truyền qua `active`.
  useEffect(() => {
    if (active >= 0) setSel(active)
  }, [active])

  // Đo VỊ TRÍ THỰC của ô đang chọn rồi căn giữa indicator vào đó — không hardcode
  // chiều rộng (ô có thể co giãn/padding khác nhau). Đo lại khi đổi mục/resize.
  useLayoutEffect(() => {
    function measure() {
      const li = itemRefs.current[sel]
      const ind = indicatorRef.current
      if (!li || !ind) return
      const center = li.offsetLeft + li.offsetWidth / 2
      setIndicatorX(center - ind.offsetWidth / 2)
      // Tâm lỗ mask trên thanh pill (xem .navbar-list) bám đúng tâm ô active.
      ind.parentElement?.style.setProperty('--ind-cx', `${center}px`)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [sel, items.length])

  // KÍCH HOẠT thật (chạm lần 2 vào đúng mục đang chọn): item có `menu` → mở popover
  // chọn; item thường → báo App mở panel/modal. TÁCH khỏi việc chọn.
  function activate(i) {
    if (items[i].menu) {
      setOpenMenu((cur) => (cur === i ? null : i))
    } else {
      setOpenMenu(null)
      onSelect?.(i)
    }
  }

  // Cơ chế 2 chạm:
  //  - Chạm vào mục KHÁC mục đang chọn → chỉ CHỌN (indicator trượt + hiện nhãn),
  //    KHÔNG đổi trang/không kích hoạt.
  //  - Chạm lần 2 vào ĐÚNG mục đang chọn → mới kích hoạt.
  function handleTap(i) {
    if (i === sel) {
      activate(i)
    } else {
      setSel(i) // chỉ trỏ tới, tách biệt với route/trang đang mở thật
      setOpenMenu(null)
    }
  }

  return (
    <nav
      className={`navbar${visible ? '' : ' navbar--hidden'}`}
      aria-label="Main"
    >
      {/* Overlay bắt click-ra-ngoài để đóng menu (dưới navbar nên vẫn bấm được item khác) */}
      {openMenu != null && (
        <div className="navbar-menu-overlay" onClick={() => setOpenMenu(null)} />
      )}

      <ul className="navbar-list">
        {items.map((item, i) => (
          <li
            key={item.key}
            ref={(el) => (itemRefs.current[i] = el)}
            className={`navbar-item${sel === i ? ' active' : ''}${
              openMenu === i ? ' menu-open' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => handleTap(i)}
              aria-current={sel === i ? 'page' : undefined}
              aria-haspopup={item.menu ? 'true' : undefined}
              aria-expanded={item.menu ? openMenu === i : undefined}
              title={item.label}
            >
              <span className="navbar-icon">{ICONS[item.icon]}</span>
              <span className="navbar-text">{item.label}</span>
            </button>

            {/* Popover neo NGAY TRÊN nút này (canh mép phải), mở lên trên. */}
            {item.menu && openMenu === i && (
              <div className="navbar-menu" role="menu">
                {item.menu.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={opt.active ? 'active' : ''}
                    onClick={() => {
                      opt.onPick()
                      setOpenMenu(null)
                    }}
                  >
                    {opt.node}
                    {opt.swatch && (
                      <span className={`theme-swatch theme-swatch-${opt.swatch}`} />
                    )}
                    <span className="navbar-menu-label">{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
        <span
          className="navbar-indicator"
          aria-hidden="true"
          ref={indicatorRef}
          style={{ left: indicatorX }}
        />
      </ul>
    </nav>
  )
}
