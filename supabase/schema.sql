-- ============================================================
-- SalaryWorking — toàn bộ schema database.
-- Cách dùng: Supabase -> SQL Editor -> New query -> dán cả file này -> Run.
-- An toàn chạy lại nhiều lần (idempotent): create if not exists / add column if
-- not exists / drop policy if exists / create or replace / drop trigger if exists.
-- KHÔNG xóa dữ liệu cũ.
-- ============================================================

-- ===================== shifts (ca làm việc) =====================
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  work_date date not null,
  start_time time not null,
  end_time time not null,
  scheduled_start time,
  scheduled_end time,
  -- Ca nhập từ ảnh lịch tuần: MỐC ẨN (12:00 trưa Thứ 2 tuần kế tiếp). Qua mốc này
  -- ca được ẨN khỏi bảng công nhưng KHÔNG xoá — dữ liệu vẫn dùng để tổng hợp kỳ lương.
  -- null = ca nhập tay, luôn hiển thị. Lưu ở DB để ẩn nhất quán trên mọi thiết bị.
  hide_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.shifts add column if not exists scheduled_start time;
alter table public.shifts add column if not exists scheduled_end time;
-- Ca rơi vào ngày lễ → tính theo đơn giá lễ (phụ cấp lễ trong hồ sơ).
alter table public.shifts add column if not exists is_holiday boolean not null default false;

-- Đổi tên cột cũ auto_delete_at -> hide_at (mốc ẨN, không còn tự xoá). An toàn chạy
-- lại nhiều lần: chỉ rename khi cột cũ còn tồn tại và cột mới chưa có.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shifts'
      and column_name = 'auto_delete_at'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shifts'
      and column_name = 'hide_at'
  ) then
    alter table public.shifts rename column auto_delete_at to hide_at;
  end if;
end $$;

alter table public.shifts add column if not exists hide_at timestamptz;

-- Ca nhập từ lịch tuần chỉ có giờ DỰ KIẾN (scheduled_*); check-in/check-out để
-- trống tới khi đi làm. Vì vậy start_time/end_time được phép null.
alter table public.shifts alter column start_time drop not null;
alter table public.shifts alter column end_time drop not null;

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

-- ===================== profiles (tài khoản) =====================
-- employee_code: mã nhân viên (9 chữ số) — bắt buộc khi đăng ký ở phía app.
-- payday: ngày nhận lương (1–10).
-- email_confirmed / phone_confirmed: đồng bộ tự động từ auth.users (trigger dưới).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  first_name text,
  last_name text,
  employee_code text,
  phone text,
  email text,
  payday smallint,
  -- Đơn giá theo từng người: lương 1 giờ + phụ cấp (%) đêm/lễ.
  hourly_rate integer,
  night_pct integer,
  holiday_day_pct integer,
  holiday_night_pct integer,
  has_night_shift boolean not null default true,
  email_confirmed boolean not null default false,
  phone_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Cho database tạo từ trước (idempotent):
alter table public.profiles add column if not exists employee_code text;
alter table public.profiles add column if not exists payday smallint;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists hourly_rate integer;
alter table public.profiles add column if not exists night_pct integer;
alter table public.profiles add column if not exists holiday_day_pct integer;
alter table public.profiles add column if not exists holiday_night_pct integer;
alter table public.profiles add column if not exists has_night_shift boolean not null default true;
alter table public.profiles add column if not exists email_confirmed boolean not null default false;
alter table public.profiles add column if not exists phone_confirmed boolean not null default false;

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

-- Đồng bộ profiles từ auth.users khi tạo user mới HOẶC khi user được cập nhật.
create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, employee_code, phone, email, email_confirmed, phone_confirmed)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'employee_code',
    coalesce(new.phone, new.raw_user_meta_data ->> 'phone'),
    new.email,
    new.email_confirmed_at is not null,
    new.phone_confirmed_at is not null
  )
  on conflict (id) do update set
    full_name       = excluded.full_name,
    employee_code   = coalesce(excluded.employee_code, public.profiles.employee_code),
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

-- Nạp profiles cho user đã tồn tại từ trước (an toàn lặp lại):
insert into public.profiles (id, full_name, employee_code, phone, email, email_confirmed, phone_confirmed)
select
  u.id,
  u.raw_user_meta_data ->> 'full_name',
  u.raw_user_meta_data ->> 'employee_code',
  coalesce(u.phone, u.raw_user_meta_data ->> 'phone'),
  u.email,
  u.email_confirmed_at is not null,
  u.phone_confirmed_at is not null
from auth.users u
on conflict (id) do update set
  full_name       = excluded.full_name,
  employee_code   = coalesce(excluded.employee_code, public.profiles.employee_code),
  phone           = excluded.phone,
  email           = excluded.email,
  email_confirmed = excluded.email_confirmed,
  phone_confirmed = excluded.phone_confirmed;

-- ===================== payrolls (kỳ lương đã nhận) =====================
-- period_key: "YYYY-MM" của tháng kết thúc kỳ. received_on: ngày thực nhận.
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

-- ===================== deductions (tiền bị trừ) =====================
-- Gắn theo kỳ lương (period_key). amount: VND. deduct_date: ngày bị trừ.
create table if not exists public.deductions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  period_key text not null,
  amount bigint not null default 0,
  reason text,
  deduct_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.deductions add column if not exists deduct_date date not null default current_date;

alter table public.deductions enable row level security;

drop policy if exists "select own deductions" on public.deductions;
create policy "select own deductions"
  on public.deductions for select
  using (auth.uid() = user_id);

drop policy if exists "insert own deductions" on public.deductions;
create policy "insert own deductions"
  on public.deductions for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own deductions" on public.deductions;
create policy "update own deductions"
  on public.deductions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete own deductions" on public.deductions;
create policy "delete own deductions"
  on public.deductions for delete
  using (auth.uid() = user_id);

-- Làm mới cache schema của PostgREST.
notify pgrst, 'reload schema';
