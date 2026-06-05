# CLAUDE.md

Tệp chỉ mục cấp cao cho SalaryWorking. Chi tiết chuyên sâu nằm trong `.claude/docs/`.
Khi cần làm việc trên một lĩnh vực cụ thể, hãy mở tệp tương ứng ở mục **Additional Documentation** trước khi sửa code.

## Project Overview

SalaryWorking là ứng dụng web một trang để ghi nhận ca làm việc và tính lương theo giờ ngày/đêm.
Người dùng đăng nhập, tạo ca (ngày làm việc + giờ bắt đầu/kết thúc), hệ thống quy đổi thời lượng ca thành
số giờ thập phân, tách phần giờ ngày và giờ đêm, rồi nhân với đơn giá tương ứng để ra thu nhập.
Dữ liệu được lưu trên Supabase, mỗi người dùng chỉ thấy ca của chính mình.

## Tech Stack

- React 18.3 (function components + hooks, không dùng router)
- Vite 5.4 (dev server + build)
- Vitest 2.0 (unit test, môi trường `node`)
- Supabase JS 2.107 (`@supabase/supabase-js`) — auth + Postgres + Row Level Security
- Không có TypeScript, không có thư viện UI/CSS framework (CSS thuần trong `src/styles.css`)

## Dev Commands

```bash
npm install              # cài dependencies
cp .env.example .env.local   # rồi điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY
npm run dev              # dev server (Vite, mặc định http://localhost:5173)
npm run build            # build production vào dist/
npm run preview          # xem thử bản build
npm test                 # chạy toàn bộ test (vitest run)
```

Schema database: chạy `supabase/schema.sql` trong Supabase SQL editor trước khi dùng app.

## Core Logic Summary

Toàn bộ phép tính nằm ở `src/lib/shiftMath.js` (đơn giá ở `src/lib/rates.js`):

1. Giờ "HH:MM" được đổi thành phút-trong-ngày. Nếu `end <= start`, ca được coi là qua nửa đêm (`end += 1440`).
2. Lặp từng phút trong khoảng ca; mỗi phút thuộc cửa sổ đêm `22:00–06:00` tính là phút đêm, còn lại là phút ngày.
3. `pay = (phút_ngày/60) * DAY_RATE + (phút_đêm/60) * NIGHT_RATE`.
4. `DAY_RATE = 25500`, `NIGHT_RATE = 33150` (VND/giờ).

Chi tiết, ví dụ biên và các quy tắc chưa được code (lương lễ 300%/390%, giới hạn 8 giờ/ngày): xem `.claude/docs/pay_logic.md`.

## Key Constraints

Tuyệt đối KHÔNG được thay đổi hoặc tự ý giả định những điều sau nếu không có yêu cầu rõ ràng:

- **Đơn giá**: `DAY_RATE = 25500`, `NIGHT_RATE = 33150`. Không hard-code số khác; luôn import từ `rates.js`.
- **Cửa sổ đêm**: `22:00–06:00` (`NIGHT_START_HOUR = 22`, `NIGHT_END_HOUR = 6`). Biên `22:00–06:00` tính 100% là đêm.
- **Quy ước qua nửa đêm**: `end <= start` nghĩa là ca kết thúc hôm sau. Đừng đổi sang yêu cầu ngày kết thúc riêng.
- **Đơn vị tiền**: số nguyên VND, không dùng số thập phân tiền tệ; định dạng qua `formatMoney` (locale `vi-VN`).
- **Bảo mật dữ liệu**: mọi truy vấn dựa vào Row Level Security của Supabase (`auth.uid() = user_id`). Không tự thêm filter `user_id` ở client để thay thế RLS, và không tắt RLS.
- **Lương lễ và giới hạn 8 giờ/ngày hiện CHƯA được implement**. Đừng giả định chúng đã có; nếu cần thêm, đọc `.claude/docs/pay_logic.md` và xác nhận với chủ dự án trước.
- Khi đổi logic tính toán, phải cập nhật và chạy `src/lib/shiftMath.test.js`.

## Additional Documentation

- `.claude/docs/architecture.md` — cấu trúc thư mục, luồng dữ liệu, vai trò từng module/component.
- `.claude/docs/pay_logic.md` — thuật toán tách giờ ngày/đêm, ví dụ biên, và các quy tắc spec chưa code (lễ, cap 8h).
- `.claude/docs/data_model.md` — bảng `shifts`, kiểu dữ liệu, và chính sách Row Level Security.
- `.claude/docs/state_management.md` — quản lý state React, auth flow, và vòng đời CRUD ca làm việc.
