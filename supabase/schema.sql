-- Run this in the Supabase SQL editor.

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  work_date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now()
);

alter table public.shifts enable row level security;

create policy "select own shifts"
  on public.shifts for select
  using (auth.uid() = user_id);

create policy "insert own shifts"
  on public.shifts for insert
  with check (auth.uid() = user_id);

create policy "update own shifts"
  on public.shifts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own shifts"
  on public.shifts for delete
  using (auth.uid() = user_id);
