# Data Model

Nguồn: `supabase/schema.sql`. Backend là Supabase (Postgres + Auth). Chạy file này trong SQL editor để khởi tạo.

## Bảng `public.shifts`

| Cột | Kiểu | Ràng buộc / mặc định |
|-----|------|----------------------|
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `user_id` | `uuid` | `not null`, `default auth.uid()`, FK → `auth.users(id) on delete cascade` |
| `work_date` | `date` | `not null` |
| `start_time` | `time` | nullable (giờ chấm công thực tế — bắt đầu; `null` = ca lịch dự kiến chưa chấm công) |
| `end_time` | `time` | nullable (giờ chấm công thực tế — kết thúc; `null` = ca lịch dự kiến chưa chấm công) |
| `scheduled_start` | `time` | nullable (giờ ca chuẩn theo lịch — bắt đầu) |
| `scheduled_end` | `time` | nullable (giờ ca chuẩn theo lịch — kết thúc) |
| `is_holiday` | `boolean` | `not null`, `default false` (ca ngày lễ → tính theo đơn giá lễ) |
| `created_at` | `timestamptz` | `not null`, `default now()` |

Lưu ý:
- DB **chỉ lưu thời gian thô**. `decimalHours`, `dayHours`, `nightHours`, `pay`, giờ bị mất KHÔNG lưu — luôn tính lại ở client qua `computeShift`/`computeEffective` (xem `pay_logic.md`).
- `start_time`/`end_time`/`scheduled_*` từ Supabase trả về dạng `"HH:MM:SS"`; client cắt còn `"HH:MM"` bằng helper `hhmm()` trước khi tính.
- `scheduled_start`/`scheduled_end` để **so với giờ thực tế và tính "giờ bị mất"** khi chấm công không đúng giờ. Nullable để tương thích với các ca cũ chưa có ca chuẩn — khi thiếu, `computeEffective` rơi về `computeShift` và giờ mất = 0. Schema dùng `add column if not exists` để nâng cấp DB cũ.
- `is_holiday` (`boolean`, `not null default false`): ca rơi vào ngày lễ → tính theo đơn giá lễ (phụ cấp `holiday_day_pct`/`holiday_night_pct` trong `profiles`). Schema dùng `add column if not exists` để nâng cấp DB cũ.
- Ca nhập từ ảnh lịch tuần hiển thị như ca thường; ca chỉ ẩn khỏi bảng công khi thuộc kỳ lương **đã nhận** (`visibleBoardShifts` trong `shiftRules.js` lọc theo `payrolls`). Cột `hide_at` (tên cũ `auto_delete_at`) của cơ chế "ẩn sau trưa Thứ 2" trước đây đã bỏ — xem `supabase/cleanup_2026-07_drop_unused_columns.sql`. Ca lịch dự kiến chỉ có `scheduled_*` (chưa chấm công) đóng góp 0 vào lương cho tới khi nhập `start_time`/`end_time`.

## Bảng `public.profiles`

Đồng bộ tự động từ `auth.users` qua trigger `sync_profile_from_auth` (insert/update).

| Cột | Kiểu | Ý nghĩa |
|-----|------|---------|
| `id` | `uuid` | PK, FK → `auth.users(id) on delete cascade` |
| `full_name`, `phone`, `email` | `text` | Trigger lấy từ user_metadata / auth; `coalesce` để KHÔNG ghi đè giá trị app đã đặt bằng `null` |
| `first_name`, `last_name` | `text` | Họ / tên (form thông tin NV). `full_name` = `"Họ Tên"` |
| `employee_code` | `text` | Mã nhân viên |
| `payday` | `smallint` | **Ngày nhận lương (1–10), nullable** (chưa đặt). Client `update` trực tiếp; trigger không đụng cột này. |
| `hourly_rate` | `integer` | Lương 1 giờ (VND). `null`/≤0 → hồ sơ CHƯA đủ, app chặn ở `EmployeeInfoForm` |
| `night_pct` | `integer` | Phụ cấp ca đêm (%). Form điền sẵn 30 |
| `holiday_day_pct`, `holiday_night_pct` | `integer` | Bội số lễ (%), vd 300 = ×3. Form điền sẵn 300 |
| `has_night_shift` | `boolean` | `not null default true`. `false` → không phụ cấp đêm, giờ đêm tính như giờ ngày |
| `night_start`, `night_end` | `time` | `not null default '22:00'` / `'06:00'`. Cửa sổ đêm riêng, có thể vắt nửa đêm |
| `period_start_day`, `period_end_day` | `smallint` | `not null default 26` / `25`. Kỳ lương (client kẹp 1–28) |
| `lang` | `text` | `vi`/`en`/`us`/`au` |
| `theme` | `text` | `dark`/`glass`/`neumorph` |
| `font_scale` | `text` | `sm`/`md`/`lg` |
| `chat_fab_pos` | `jsonb` | Vị trí nút nổi trợ lý lương `{x,y}`; `null` = góc dưới-phải |
| `avatar_url` | `text` | URL công khai trong bucket `avatars` (kèm `?t=` phá cache) |
| `created_at` | `timestamptz` | `default now()` |

**Lưu ý `null`**: `setRates` dùng `toNum(v, fallback)` = `Number.isFinite(Number(v))`, mà `Number(null) === 0` → cột % để `null` trong DB được nạp thành **0** (không phải mặc định 30/100). Mặc định chỉ áp khi giá trị là `undefined` (cột chưa tồn tại). Hồ sơ đi qua `EmployeeInfoForm` luôn có số nên thực tế ít gặp.

Hồ sơ "đủ" (`isProfileComplete` trong `useProfile.js`) = có `first_name`, `last_name` và `hourly_rate > 0`. `useProfile.reload` nạp các cột đơn giá vào `rates.js` (`setRates`) và kỳ lương vào `payPeriod.js` (`setPayPeriod`). Cột `email_confirmed`/`phone_confirmed` cũ đã bỏ (`cleanup_2026-07_drop_unused_columns.sql`).

## Bảng `public.payrolls`

Đánh dấu **kỳ lương đã nhận** (số liệu lương vẫn tính lại từ `shifts`, không lưu tiền ở đây).

| Cột | Kiểu | Ý nghĩa |
|-----|------|---------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `auth.users(id)`, `default auth.uid()` |
| `period_key` | `text` | `"YYYY-MM"` của tháng kết thúc kỳ (xem `payPeriod.js`) |
| `received_on` | `date` | Ngày thực nhận (tùy chọn) |
| `received_at` | `timestamptz` | `default now()` |

`unique(user_id, period_key)`. Đánh dấu = upsert (onConflict `user_id,period_key`); bỏ đánh dấu = delete.

## Bảng `public.deductions`

Khoản bị trừ (bồi thường/khấu trừ), gắn theo kỳ lương. Trừ vào lương ca của kỳ đó (`sumDeductions` trong `payPeriod.js`).

| Cột | Kiểu | Ý nghĩa |
|-----|------|---------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `auth.users(id)`, `default auth.uid()` |
| `period_key` | `text` | `not null`, `"YYYY-MM"` kỳ bị trừ |
| `amount` | `bigint` | `not null default 0`, VND |
| `reason` | `text` | Lý do |
| `deduct_date` | `date` | `not null default current_date` |
| `created_at` | `timestamptz` | `default now()` |

## Bảng `public.extra_income`

Thu nhập việc ngoài — số tiền khoán, KHÔNG theo giờ, KHÔNG nhân đơn giá, tách hẳn khỏi `shiftMath` (tính ở `src/lib/extraIncome.js`).

| Cột | Kiểu | Ý nghĩa |
|-----|------|---------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `auth.users(id)`, `default auth.uid()` |
| `date` | `date` | `not null default current_date`, ngày phát sinh |
| `description` | `text` | Mô tả |
| `amount` | `bigint` | `not null default 0`, VND |
| `received` | `boolean` | `not null default false` |
| `received_at` | `date` | Ngày bấm "đã nhận"; `null` khi chưa nhận |
| `created_at` | `timestamptz` | `default now()` |

Chỉ khoản `received = true` mới cộng vào tổng kỳ, và rơi vào kỳ của **`received_at`** (không phải `date`). Khoản chưa nhận treo qua các kỳ.

## Bảng `public.chat_messages`

Lịch sử trợ lý lương (xem "Bộ nhớ chatbot" trong `state_management.md`).

| Cột | Kiểu | Ý nghĩa |
|-----|------|---------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `auth.users(id)`, `default auth.uid()` — client KHÔNG gửi cột này |
| `role` | `text` | `check in ('user','bot')` |
| `content` | `text` | `not null` |
| `created_at` | `timestamptz` | `default now()` |

Index `(user_id, created_at)`. Không có policy update (tin nhắn không sửa).

## Storage: bucket `avatars`

Bucket công khai (đọc không cần đăng nhập). Đường dẫn quy ước `<user_id>/avatar` (không đuôi) → mỗi người đúng một file, đổi ảnh = ghi đè. Insert/update/delete chỉ trong thư mục `(storage.foldername(name))[1] = auth.uid()::text`.

## Row Level Security

RLS bật cho mọi bảng. Tất cả policy ràng buộc theo chủ sở hữu:

- `shifts`, `payrolls`, `deductions`, `extra_income`: select/insert/update/delete, ràng `auth.uid() = user_id`.
- `chat_messages`: select/insert/delete, ràng `auth.uid() = user_id`.
- `profiles`: select/insert/update, ràng `auth.uid() = id`.

Hệ quả cho code client:
- **Không cần** và **không nên** tự thêm `.eq('user_id', ...)` để cách ly dữ liệu — RLS đã đảm bảo. (Các model vẫn set `user_id` khi insert ở `shifts`/`deductions`/`extra_income`, và `profileModel`/`deletePayroll` dùng `.eq` để nhắm đúng dòng, nhưng cách ly là do RLS.)
- Không tắt RLS, không thêm policy nới lỏng `using (true)`.

## Auth

Dùng Supabase Auth (email/password). Client khởi tạo ở `src/lib/supabase.js` từ env `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`. Luồng session: xem `state_management.md`.
