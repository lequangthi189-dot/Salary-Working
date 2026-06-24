import { useState, useEffect, useRef, useCallback } from "react";
import "./NavBar.css";

// Icon SVG (stroke currentColor → đổi màu theo trạng thái). Vẽ trực tiếp để khỏi
// phụ thuộc thư viện / tránh emoji không render.
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
  tools: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a4 4 0 0 0 5 5L21 12l-7 7-2-2 5-5" />
      <path d="M9.3 8.7l-2-2L4 10l2 2zM3 21l6-6" />
    </svg>
  ),
};

// Phóng to theo VỊ TRÍ con trỏ/ngón tay (giống macOS dock). Icon gần con trỏ nhất
// to nhất (MAX_SCALE), càng xa càng về 1x trong bán kính RANGE.
const MAX_SCALE = 1.6;
const RANGE = 82; // px: bán kính ảnh hưởng quanh con trỏ
// Hàm giảm dần (quadratic): dist=0 → MAX; dist≥RANGE → 1. Neighbor (~58px) ≈ 1.3x.
function scaleFor(dist) {
  if (dist >= RANGE) return 1;
  const t = dist / RANGE;
  return 1 + (MAX_SCALE - 1) * (1 - t * t);
}

// Dock điều hướng kiểu macOS. Giữ NGUYÊN hợp đồng cũ:
//   items  — [{ key, label, icon, badge? }]  (icon = khóa trong ICONS; badge = số THẬT)
//   active — chỉ số mục đồng bộ view hiện tại (App truyền vào); -1 = không mở gì
//   onSelect(index) — báo App mở panel/modal tương ứng
//
// Phóng to dùng pointermove (chuột + cảm ứng), KHÔNG dùng :hover. Cập nhật bằng cách
// ghi MỘT custom prop --s cho mỗi icon trong requestAnimationFrame; CSS lo transform
// (không đụng layout) nên mượt cả trên máy yếu.
export default function NavBar({ items, active = 0, onSelect }) {
  const [sel, setSel] = useState(active >= 0 ? active : 0);
  const [visible, setVisible] = useState(false); // mặc định ẩn; cuộn mới hiện

  const dockRef = useRef(null);
  const itemRefs = useRef([]); // <li> để ghi --s + đo tâm
  const centers = useRef([]); // tâm X (px) của từng icon lúc 1x (đo 1 lần/phiên)
  const rafId = useRef(null);
  const pointerX = useRef(null);
  // 'touch' | 'mouse' | null — loại con trỏ của phiên hiện tại. Dùng để: (1) chỉ
  // CHỌN-KHI-NHẤC trên cảm ứng, (2) bỏ qua ghost-click sau khi touch đã xử lý.
  const sessionType = useRef(null);

  // Hiện dock khi đang cuộn; ngừng cuộn ~5s thì tự ẩn.
  useEffect(() => {
    let hideTimer;
    function onScroll() {
      setVisible(true);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setVisible(false), 5000);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(hideTimer);
    };
  }, []);

  // Đồng bộ mục active theo view hiện tại (App suy ra từ panel/modal đang mở).
  useEffect(() => {
    if (active >= 0) setSel(active);
  }, [active]);

  // Đo tâm X của từng icon lúc CHƯA phóng to (transform rỗng). Gọi khi bắt đầu phiên
  // và khi resize. Dùng tâm gốc để tính khoảng cách → KHÔNG bị scale dội ngược.
  const measureCenters = useCallback(() => {
    centers.current = itemRefs.current.map((el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.left + r.width / 2;
    });
  }, []);

  useEffect(() => {
    window.addEventListener("resize", measureCenters);
    return () => window.removeEventListener("resize", measureCenters);
  }, [measureCenters]);

  // Vẽ 1 frame: với mỗi icon, scale = scaleFor(|pointerX − tâm|). Chỉ GHI custom prop
  // --s (không đọc layout ở đây) → không layout-thrash. CSS biến --s thành transform.
  const paint = useCallback(() => {
    rafId.current = null;
    const x = pointerX.current;
    if (x == null) return;
    itemRefs.current.forEach((el, i) => {
      const c = centers.current[i];
      if (!el || c == null) return;
      const s = scaleFor(Math.abs(x - c));
      el.style.setProperty("--s", s.toFixed(3));
    });
  }, []);

  const schedule = useCallback(() => {
    if (rafId.current == null) rafId.current = requestAnimationFrame(paint);
  }, [paint]);

  // Về 1x: xoá pointer, huỷ frame chờ, đặt lại --s cho mọi icon.
  const reset = useCallback(() => {
    pointerX.current = null;
    if (rafId.current != null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    itemRefs.current.forEach((el) => el && el.style.setProperty("--s", "1"));
  }, []);

  // Dọn frame khi unmount.
  useEffect(() => reset, [reset]);

  // Chỉ số icon NẰM DƯỚI điểm (x,y) khi NHẤC tay. Trả null nếu nhấc NGOÀI vùng dock
  // (cách để "thoát" khi lỡ vuốt). Trong vùng → chọn icon có tâm X gần nhất (chắc
  // ăn cả khi thả vào khe giữa 2 icon). Nới biên TRÊN vì icon phóng to nhô lên.
  function indexAtPoint(x, y) {
    const dock = dockRef.current;
    if (!dock) return null;
    const r = dock.getBoundingClientRect();
    const outside =
      x < r.left || x > r.right || y < r.top - 56 || y > r.bottom + 16;
    if (outside) return null;
    let best = null;
    let bestDist = Infinity;
    centers.current.forEach((c, i) => {
      if (c == null) return;
      const d = Math.abs(x - c);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }

  // CHỌN mục i → đồng bộ active + báo App điều hướng/mở Công cụ (routing giữ nguyên).
  function selectIndex(i) {
    if (i == null) return;
    setSel(i);
    onSelect?.(i);
  }

  // ----- Pointer handlers (dùng chung desktop + mobile) -----

  // Chuột rê vào dock (không cần nhấn) → bắt đầu phóng to theo vị trí.
  function onPointerEnter(e) {
    if (e.pointerType === "touch") return; // touch xử lý ở pointerdown
    sessionType.current = "mouse";
    measureCenters();
    pointerX.current = e.clientX;
    schedule();
  }

  // Ngón tay chạm xuống dock → mở phiên trượt: bắt giữ pointer để vẫn nhận move dù
  // ngón trượt ra mép, đo tâm, phóng to ngay theo vị trí chạm.
  function onPointerDown(e) {
    if (e.pointerType !== "touch") return; // chuột: chọn bằng click như thường
    sessionType.current = "touch";
    measureCenters();
    pointerX.current = e.clientX;
    try {
      dockRef.current.setPointerCapture(e.pointerId);
    } catch {
      /* trình duyệt cũ: bỏ qua, vẫn chạy được trong vùng dock */
    }
    schedule();
  }

  // Rê/trượt: chỉ cập nhật vị trí + lên lịch vẽ. KHÔNG điều hướng ở đây (trượt = chỉ
  // phóng to xem).
  function onPointerMove(e) {
    if (sessionType.current == null) return;
    if (centers.current.length === 0) measureCenters();
    pointerX.current = e.clientX;
    schedule();
  }

  // Chuột rời dock → về 1x.
  function onPointerLeave() {
    if (sessionType.current === "touch") return; // touch kết thúc ở pointerup
    sessionType.current = null;
    reset();
  }

  // NHẤC ngón tay (chỉ cảm ứng): chọn icon đang ở DƯỚI ngón tay tại thời điểm nhấc.
  // Nhấc ngoài vùng dock → indexAtPoint=null → KHÔNG chọn gì (thoát). Có phản hồi
  // haptic nhẹ khi chọn được. Sau đó mọi icon về 1x.
  function onPointerUp(e) {
    if (sessionType.current !== "touch") return; // chuột không chọn-khi-nhấc
    const idx = indexAtPoint(e.clientX, e.clientY);
    try {
      dockRef.current.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    reset();
    sessionType.current = "touch"; // giữ để onClick (ghost) biết touch đã xử lý
    if (idx != null) {
      if (navigator.vibrate) navigator.vibrate(10); // phản hồi rung nhẹ nếu hỗ trợ
      selectIndex(idx);
    }
  }

  // Click chuột desktop → chọn như thường. Trên cảm ứng, pointerup đã xử lý nên BỎ
  // QUA ghost-click (sessionType vẫn là 'touch').
  function onItemClick(i) {
    if (sessionType.current === "touch") {
      sessionType.current = null;
      return;
    }
    selectIndex(i);
  }

  return (
    <nav
      className={`dock${visible ? "" : " dock--hidden"}`}
      aria-label="Main"
    >
      <ul
        className="dock-list"
        ref={dockRef}
        onPointerEnter={onPointerEnter}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerLeave}
      >
        {items.map((item, i) => (
          <li
            key={item.key}
            ref={(el) => (itemRefs.current[i] = el)}
            data-dock-index={i}
            className={`dock-item${sel === i ? " active" : ""}`}
            style={{ "--s": 1 }}
          >
            <button
              type="button"
              onClick={() => onItemClick(i)}
              aria-current={sel === i ? "page" : undefined}
              title={item.label}
            >
              <span className="dock-icon">
                {ICONS[item.icon]}
                {/* Badge số THẬT: chỉ hiện khi > 0 (App tính, không hardcode). */}
                {item.badge > 0 && (
                  <span className="dock-badge" aria-hidden="true">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </span>
              {/* Nhãn nổi lên trên icon đang phóng to (opacity bám theo --s). */}
              <span className="dock-label">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
