-- ============================================================
-- DỌN MỘT LẦN (07/2026): bỏ các cột không còn được app đọc/ghi.
-- Chạy MỘT lần trong Supabase SQL Editor (an toàn chạy lại: if exists).
-- Tách khỏi schema.sql vì schema.sql cam kết KHÔNG xóa dữ liệu cũ.
--
-- 1) shifts.hide_at (tên cũ: auto_delete_at) — cơ chế "ẩn ca sau 12:00 trưa
--    Thứ 2 tuần kế" đã bỏ từ lâu; client không đọc/ghi cột này nữa (ca hiển
--    thị giờ lọc theo kỳ lương ĐÃ NHẬN — visibleBoardShifts).
-- 2) profiles.email_confirmed / phone_confirmed — chỉ trigger ghi vào, client
--    không bao giờ đọc; giá trị luôn suy lại được từ auth.users khi cần.
--
-- THỨ TỰ QUAN TRỌNG: thay trigger TRƯỚC rồi mới drop cột — trigger cũ còn
-- insert vào 2 cột confirmed, drop trước sẽ làm MỌI đăng ký/cập nhật user lỗi.
-- ============================================================

-- Trigger sync profiles: bản mới KHÔNG đụng email_confirmed/phone_confirmed.
-- (Trùng với định nghĩa hiện hành trong schema.sql.)
create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, employee_code, phone, email)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'employee_code',
    coalesce(new.phone, new.raw_user_meta_data ->> 'phone'),
    new.email
  )
  on conflict (id) do update set
    full_name       = coalesce(excluded.full_name, public.profiles.full_name),
    employee_code   = coalesce(excluded.employee_code, public.profiles.employee_code),
    phone           = coalesce(excluded.phone, public.profiles.phone),
    email           = excluded.email;
  return new;
end;
$$;

-- Bỏ cột chết (kèm tên cũ auto_delete_at cho DB rất cũ chưa từng rename).
alter table public.shifts drop column if exists hide_at;
alter table public.shifts drop column if exists auto_delete_at;
alter table public.profiles drop column if exists email_confirmed;
alter table public.profiles drop column if exists phone_confirmed;

-- Làm mới cache schema của PostgREST.
notify pgrst, 'reload schema';
