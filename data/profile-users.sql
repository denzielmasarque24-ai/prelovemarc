-- ============================================================
-- PRELOVE SHOP — Profiles / Users Migration
-- Run this entire script in Supabase → SQL Editor
-- ============================================================

-- 1. Create the users table if it does not exist
create table if not exists public.users (
  id          uuid        primary key references auth.users(id) on delete cascade,
  full_name   text        not null default 'User',
  email       text        not null default '',
  phone       text        not null default '',
  address     text        not null default '',
  avatar      text        not null default '',
  role        text        not null default 'customer',
  created_at  timestamptz not null default now()
);

-- 2. Add any missing columns (safe to run even if they already exist)
alter table public.users add column if not exists full_name  text        not null default 'User';
alter table public.users add column if not exists email      text        not null default '';
alter table public.users add column if not exists phone      text        not null default '';
alter table public.users add column if not exists address    text        not null default '';
alter table public.users add column if not exists avatar     text        not null default '';
alter table public.users add column if not exists role       text        not null default 'customer';
alter table public.users add column if not exists created_at timestamptz not null default now();

-- 3. Drop username column if it still exists (no longer used)
alter table public.users drop column if exists username;

-- 4. Normalise existing rows — fix nulls and old 'user' role value
update public.users set
  full_name  = coalesce(nullif(trim(full_name),  ''), 'User'),
  email      = coalesce(nullif(trim(email),      ''), ''),
  phone      = coalesce(nullif(trim(phone),      ''), ''),
  address    = coalesce(address, ''),
  avatar     = coalesce(avatar,  ''),
  -- migrate old 'user' role to 'customer'
  role       = case
                 when email = 'admin@gmail.com' then 'admin'
                 when role in ('user', '') or role is null then 'customer'
                 else role
               end;

-- 5. Backfill: insert any auth.users rows that are missing from public.users
insert into public.users (id, email, full_name, phone, address, avatar, role)
select
  au.id,
  coalesce(au.email, ''),
  coalesce(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1), 'User'),
  coalesce(au.raw_user_meta_data->>'phone', ''),
  '',
  '',
  case when au.email = 'admin@gmail.com' then 'admin' else 'customer' end
from auth.users au
where not exists (
  select 1 from public.users pu where pu.id = au.id
);

-- 6. Ensure admin@gmail.com always has role = 'admin'
update public.users
set role = 'admin'
where email = 'admin@gmail.com';

-- 7. Disable RLS for development (re-enable with policies before going to production)
alter table public.users disable row level security;

-- 8. Reload PostgREST schema cache
notify pgrst, 'reload schema';

-- 9. Verify — should show all users with correct roles
select id, email, full_name, role, created_at
from public.users
order by created_at;
