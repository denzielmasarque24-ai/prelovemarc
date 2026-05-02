-- ============================================================
-- PRELOVE SHOP — Profiles Table Migration
-- Run this entire script in Supabase → SQL Editor
-- ============================================================

-- 1. Create the profiles table if it does not exist
create table if not exists public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  full_name   text        not null default 'User',
  phone       text        not null default '',
  address     text        not null default '',
  avatar      text        not null default '',
  role        text        not null default 'user',
  created_at  timestamptz not null default now()
);

-- 2. Add any missing columns (safe to run even if they already exist)
alter table public.profiles add column if not exists full_name  text        not null default 'User';
alter table public.profiles add column if not exists phone      text        not null default '';
alter table public.profiles add column if not exists address    text        not null default '';
alter table public.profiles add column if not exists avatar     text        not null default '';
alter table public.profiles add column if not exists role       text        not null default 'user';
alter table public.profiles add column if not exists created_at timestamptz not null default now();

-- 3. Drop columns that are no longer used
alter table public.profiles drop column if exists username;
alter table public.profiles drop column if exists email;

-- 4. Normalise existing rows
update public.profiles set
  full_name = coalesce(nullif(trim(full_name), ''), 'User'),
  phone     = coalesce(phone, ''),
  address   = coalesce(address, ''),
  avatar    = coalesce(avatar, ''),
  role      = case
                when id in (
                  select id from auth.users where email = 'admin@gmail.com'
                ) then 'admin'
                when role is null or role = '' then 'user'
                else role
              end;

-- 5. Backfill: insert any auth.users rows missing from public.profiles
insert into public.profiles (id, full_name, phone, address, avatar, role)
select
  au.id,
  coalesce(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1), 'User'),
  coalesce(au.raw_user_meta_data->>'phone', ''),
  '',
  '',
  case when au.email = 'admin@gmail.com' then 'admin' else 'user' end
from auth.users au
where not exists (
  select 1 from public.profiles p where p.id = au.id
);

-- 6. Ensure admin@gmail.com always has role = 'admin'
update public.profiles
set role = 'admin'
where id in (
  select id from auth.users where email = 'admin@gmail.com'
);

-- 7. Disable RLS for development
alter table public.profiles disable row level security;

-- 8. Reload PostgREST schema cache
notify pgrst, 'reload schema';

-- 9. Verify
select p.id, au.email, p.full_name, p.role, p.created_at
from public.profiles p
join auth.users au on au.id = p.id
order by p.created_at;
