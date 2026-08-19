# Đưa bảng màu Trung tính vào app thật

> Đây là **đường ngắn**: chỉ bảng màu, một block CSS. Muốn đưa **toàn bộ** design system
> (token chữ / khoảng cách / bo góc / bóng / chuyển động + component) thì đọc
> [`full/README.md`](full/README.md) — 4 PR, PR đầu tiên đã bao gồm bảng màu này.

Repo: **lequangthi189-dot/Salary-Working** (branch `master`). App giữ đúng **3 theme**:
`dark` / `glass` / `neumorph`. Bảng màu Trung tính **là theme `dark`** — không thêm theme
mới, nên không phải sửa `ThemeToggle.jsx`, không phải sửa `translations.js`, không cần
migration database.

## 1. Thay CSS (việc chính, và gần như là việc duy nhất)

Trong `src/styles/themes.css`, thay **toàn bộ** block `[data-theme='dark'] { … }` bằng
block trong `minimal-theme.css`. Scope này chỉ khai báo lại các biến mà `src/styles.css`
đã dùng → không cần sửa CSS của component nào.

## 2. Thêm 2 alias cho glass và neumorph

Cuối `minimal-theme.css` có phần bổ sung cho `glass` và `neumorph`: `--text-value`,
`--text-on-accent` (thiếu thì ở Soft UI số tiền và chữ trên nút bị trắng-trên-trắng), và
`--time-in` / `--time-out` cho `neumorph` (màu peach cũ của giờ vào chìm hẳn vào nền sáng).

## 3. Kiểm lại sau khi dán

- Ca vắt đêm: giờ vào **đậm**, giờ ra xám — không còn cam/xanh.
- Ca dự kiến: viền nét đứt xám, không phải nền cam.
- Ngày chưa chấm công: viền đỏ 2px — màu đỏ duy nhất trong UI.
- Ô lương: viền xanh 2px, số tiền là thứ đậm nhất màn hình.
- Thử cả 3 cỡ chữ và 2 ngôn ngữ; nhãn tiếng Việt dài hơn nên kiểm dock trước.
- Xoay qua `glass` và `neumorph` xem còn chỗ nào chữ trắng trên nền sáng.

Muốn đổi tông về sau: sửa ba giá trị `--accent` / `--green` / `--danger`; phần còn lại là xám.

## Dùng cả design system này

Ngoài bảng màu, project còn: `styles.css` (+ `tokens/`), 24 component React, UI kit đầy đủ,
`readme.md` (nguyên tắc nội dung + thị giác), `SKILL.md`. Muốn dùng khi thiết kế tiếp thì
gắn design system này vào project mới, hoặc tải cả folder và đọc `SKILL.md`.
