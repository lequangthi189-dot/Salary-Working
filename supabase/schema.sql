-- Run this in the Supabase SQL editor.

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  work_date date not null,
  start_time time not null,
  end_time time not null,
  scheduled_start time,
  scheduled_end time,
  created_at timestamptz not null default now()
);

-- For databases created before scheduled times were added (idempotent):
alter table public.shifts add column if not exists scheduled_start time;
alter table public.shifts add column if not exists scheduled_end time;

alter table public.shifts enable row level security;

drop policy if exists "select own shifts" on public.shifts;
create policy "select own shifts"
  on public.shifts for select
  using (auth.uid() = user_id);

drop policy if exists "insert own shifts" on public.shifts;
create policy "insert own shifts"
  on public.shifts for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own shifts" on public.shifts;
create policy "update own shifts"
  on public.shifts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete own shifts" on public.shifts;
create policy "delete own shifts"
  on public.shifts for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Bảng profiles: thông tin tài khoản + trạng thái xác nhận.
--   email_confirmed: TRUE nếu email đã xác nhận (dấu ✓), FALSE nếu chưa (✗).
--   phone_confirmed: TRUE nếu số điện thoại đã xác nhận (✓), FALSE nếu chưa (✗).
-- Các cờ này được đồng bộ tự động từ auth.users bằng trigger bên dưới.
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  email text,
  email_confirmed boolean not null default false,
  phone_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Cho database đã tạo trước (idempotent):
alter table public.profiles add column if not exists email_confirmed boolean not null default false;
alter table public.profiles add column if not exists phone_confirmed boolean not null default false;
-- payday: ngày nhận lương (1–10), nullable (chưa đặt). Xem payrolls bên dưới.
alter table public.profiles add column if not exists payday smallint;

alter table public.profiles enable row level security;

drop policy if exists "select own profile" on public.profiles;
create policy "select own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Đồng bộ profiles từ auth.users: chạy khi tạo user mới HOẶC khi user
-- được cập nhật (vd email/phone vừa được xác nhận → cờ chuyển sang TRUE).
create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, email, email_confirmed, phone_confirmed)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.phone, new.raw_user_meta_data ->> 'phone'),
    new.email,
    new.email_confirmed_at is not null,
    new.phone_confirmed_at is not null
  )
  on conflict (id) do update set
    full_name       = excluded.full_name,
    phone           = excluded.phone,
    email           = excluded.email,
    email_confirmed = excluded.email_confirmed,
    phone_confirmed = excluded.phone_confirmed;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.sync_profile_from_auth();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.sync_profile_from_auth();

-- Nạp profiles cho các user đã tồn tại từ trước (chạy 1 lần, an toàn lặp lại):
insert into public.profiles (id, full_name, phone, email, email_confirmed, phone_confirmed)
select
  u.id,
  u.raw_user_meta_data ->> 'full_name',
  coalesce(u.phone, u.raw_user_meta_data ->> 'phone'),
  u.email,
  u.email_confirmed_at is not null,
  u.phone_confirmed_at is not null
from auth.users u
on conflict (id) do update set
  full_name       = excluded.full_name,
  phone           = excluded.phone,
  email           = excluded.email,
  email_confirmed = excluded.email_confirmed,
  phone_confirmed = excluded.phone_confirmed;

-- ============================================================
-- Bảng payrolls: đánh dấu kỳ lương ĐÃ NHẬN.
--   period_key: "YYYY-MM" của tháng kết thúc kỳ (vd "2025-05" = công 26/04–25/05).
--   received_on: ngày thực nhận (tùy chọn, thường 1–10 tháng sau).
-- Một dòng = kỳ đó đã nhận; xóa dòng = bỏ đánh dấu. Số liệu lương vẫn được
-- tính lại từ shifts ở client (không lưu tiền vào đây).
-- ============================================================
create table if not exists public.payrolls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  period_key text not null,
  received_on date,
  received_at timestamptz not null default now(),
  unique (user_id, period_key)
);

alter table public.payrolls enable row level security;

drop policy if exists "select own payrolls" on public.payrolls;
create policy "select own payrolls"
  on public.payrolls for select
  using (auth.uid() = user_id);

drop policy if exists "insert own payrolls" on public.payrolls;
create policy "insert own payrolls"
  on public.payrolls for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own payrolls" on public.payrolls;
create policy "update own payrolls"
  on public.payrolls for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete own payrolls" on public.payrolls;
create policy "delete own payrolls"
  on public.payrolls for delete
  using (auth.uid() = user_id);

-- Làm mới cache schema của PostgREST (hết lỗi "could not find ... in schema cache").
notify pgrst, 'reload schema';
