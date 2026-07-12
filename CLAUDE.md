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
2. Khoảng ca được tách thành phút ngày / phút đêm theo cửa sổ đêm (mặc định `22:00–06:00`, cấu hình theo từng người). Việc tách tính bằng công thức đóng O(1) (`nightMinutesBefore`), KHÔNG lặp từng phút.
3. `pay = (phút_ngày/60) * đơn_giá_ngày + (phút_đêm/60) * đơn_giá_đêm`, lấy qua `getDayRate()/getNightRate()` (hoặc bản lễ) — đơn giá theo TỪNG NGƯỜI, không hard-code.
4. Khi ca có LỊCH DỰ KIẾN (`scheduled_*`), lương tính bằng `computeEffective()` — chỉ trả cho phần giao giữa lịch và giờ thực tế (vào sớm/ra muộn không thưởng; vào trễ/ra sớm bị "giờ mất"). Đây là hàm dùng ở mọi component; `computeShift()` chỉ là nhánh không-có-lịch.
5. `DAY_RATE = 25500`, `NIGHT_RATE = 33150` (VND/giờ) chỉ là MẶC ĐỊNH/fallback.

Chi tiết, ví dụ biên, lương lễ (đã code), và giới hạn 8 giờ/ngày (CHƯA code): xem `.claude/docs/pay_logic.md`.

## Key Constraints

Tuyệt đối KHÔNG được thay đổi hoặc tự ý giả định những điều sau nếu không có yêu cầu rõ ràng:

- **Đơn giá**: theo TỪNG NGƯỜI DÙNG, nạp từ hồ sơ qua `setRates()` trong `rates.js` (lương 1 giờ + phụ cấp % đêm/lễ). `DAY_RATE = 25500`, `NIGHT_RATE = 33150` chỉ còn là MẶC ĐỊNH/fallback. Không hard-code số khác; luôn lấy qua `getDayRate()/getNightRate()/getHolidayDayRate()/getHolidayNightRate()`.
- **Cửa sổ đêm**: `22:00–06:00` (`NIGHT_START_HOUR = 22`, `NIGHT_END_HOUR = 6`). Biên `22:00–06:00` tính 100% là đêm.
- **Quy ước qua nửa đêm**: `end <= start` nghĩa là ca kết thúc hôm sau. Đừng đổi sang yêu cầu ngày kết thúc riêng.
- **Đơn vị tiền**: số nguyên VND, không dùng số thập phân tiền tệ; định dạng qua `formatMoney` (locale `vi-VN`).
- **Bảo mật dữ liệu**: mọi truy vấn dựa vào Row Level Security của Supabase (`auth.uid() = user_id`). Không tự thêm filter `user_id` ở client để thay thế RLS, và không tắt RLS.
- **Lương lễ ĐÃ được implement** (cột `shifts.is_holiday`; đơn giá lễ `getHolidayDayRate()/getHolidayNightRate()` theo `holiday_day_pct`/`holiday_night_pct` trong hồ sơ). **Giới hạn 8 giờ/ngày hiện CHƯA được implement** — đừng giả định đã có; nếu cần thêm, đọc `.claude/docs/pay_logic.md` và xác nhận với chủ dự án trước.
- Khi đổi logic tính toán, phải cập nhật và chạy `src/lib/shiftMath.test.js`.
- **Branch Management**: Trước khi thêm bất kỳ tính năng nào hoặc sửa lỗi, luôn luôn làm việc trên một nhánh (branch) git mới. Không bao giờ commit trực tiếp trên nhánh master. Các nhánh sửa lỗi phải tuân theo quy ước đặt tên bug/[des], các nhánh tính năng phải tuân theo quy ước đặt tên feature/[desc].

## Additional Documentation

- `.claude/docs/architecture.md` — cấu trúc thư mục, luồng dữ liệu, vai trò từng module/component.
- `.claude/docs/pay_logic.md` — thuật toán tách giờ ngày/đêm, lương theo lịch (`computeEffective`), lương lễ (đã code), và giới hạn 8 giờ/ngày (chưa code).
- `.claude/docs/data_model.md` — bảng `shifts`, kiểu dữ liệu, và chính sách Row Level Security.
- `.claude/docs/state_management.md` — quản lý state React, auth flow, và vòng đời CRUD ca làm việc.
