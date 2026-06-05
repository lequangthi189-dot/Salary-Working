# Data Model

Nguồn: `supabase/schema.sql`. Backend là Supabase (Postgres + Auth). Chạy file này trong SQL editor để khởi tạo.

## Bảng `public.shifts`

| Cột | Kiểu | Ràng buộc / mặc định |
|-----|------|----------------------|
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `user_id` | `uuid` | `not null`, `default auth.uid()`, FK → `auth.users(id) on delete cascade` |
| `work_date` | `date` | `not null` |
| `start_time` | `time` | `not null` (giờ chấm công thực tế — bắt đầu) |
| `end_time` | `time` | `not null` (giờ chấm công thực tế — kết thúc) |
| `scheduled_start` | `time` | nullable (giờ ca chuẩn theo lịch — bắt đầu) |
| `scheduled_end` | `time` | nullable (giờ ca chuẩn theo lịch — kết thúc) |
| `created_at` | `timestamptz` | `not null`, `default now()` |

Lưu ý:
- DB **chỉ lưu thời gian thô**. `decimalHours`, `dayHours`, `nightHours`, `pay`, giờ bị mất KHÔNG lưu — luôn tính lại ở client qua `computeShift`/`computeEffective` (xem `pay_logic.md`).
- `start_time`/`end_time`/`scheduled_*` từ Supabase trả về dạng `"HH:MM:SS"`; client cắt còn `"HH:MM"` bằng helper `hhmm()` trước khi tính.
- `scheduled_start`/`scheduled_end` để **so với giờ thực tế và tính "giờ bị mất"** khi chấm công không đúng giờ. Nullable để tương thích với các ca cũ chưa có ca chuẩn — khi thiếu, `computeLost` trả về 0. Schema dùng `add column if not exists` để nâng cấp DB cũ.
- Không có cột phân biệt ngày lễ → tính năng lương lễ vẫn chưa được hỗ trợ ở tầng dữ liệu.

## Bảng `public.profiles`

Đồng bộ tự động từ `auth.users` qua trigger `sync_profile_from_auth` (insert/update).

| Cột | Kiểu | Ý nghĩa |
|-----|------|---------|
| `id` | `uuid` | PK, FK → `auth.users(id)` |
| `full_name`, `phone`, `email` | `text` | Lấy từ user_metadata / auth |
| `email_confirmed`, `phone_confirmed` | `boolean` | Cờ ✓/✗, đồng bộ từ `*_confirmed_at` |
| `payday` | `smallint` | **Ngày nhận lương (1–10), nullable** (chưa đặt). Client `update` trực tiếp; trigger không đụng cột này. |

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

## Row Level Security

RLS được bật cho cả 3 bảng. Tất cả policy ràng buộc theo chủ sở hữu:

- `shifts`: select/insert/update/delete, ràng `auth.uid() = user_id`.
- `payrolls`: select/insert/update/delete, ràng `auth.uid() = user_id`.
- `profiles`: select/insert/update, ràng `auth.uid() = id` (insert cho phép client upsert payday).

Hệ quả cho code client:
- **Không cần** và **không nên** tự thêm `.eq('user_id', ...)` để cách ly dữ liệu — RLS đã đảm bảo. (`App.jsx` vẫn set `user_id` khi insert vì cột yêu cầu giá trị, nhưng cách ly là do RLS.)
- Không tắt RLS, không thêm policy nới lỏng `using (true)`.

## Auth

Dùng Supabase Auth (email/password). Client khởi tạo ở `src/lib/supabase.js` từ env `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`. Luồng session: xem `state_management.md`.
