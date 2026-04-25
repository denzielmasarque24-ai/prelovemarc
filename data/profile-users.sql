create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text default 'User',
  email text,
  address text,
  username text,
  phone text,
  avatar text,
  role text default 'user',
  created_at timestamptz not null default now()
);

alter table public.users add column if not exists full_name text default 'User';
alter table public.users add column if not exists email text;
alter table public.users add column if not exists address text;
alter table public.users add column if not exists username text;
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists avatar text;
alter table public.users add column if not exists role text default 'user';
alter table public.users add column if not exists created_at timestamptz not null default now();

update public.users
set
  full_name = coalesce(nullif(full_name, ''), 'User'),
  email = coalesce(email, ''),
  address = coalesce(address, ''),
  username = coalesce(username, ''),
  phone = coalesce(phone, ''),
  avatar = coalesce(avatar, ''),
  role = coalesce(nullif(role, ''), 'user');

notify pgrst, 'reload schema';

-- Testing mode: disable RLS while confirming Edit Profile saves correctly.
alter table public.users disable row level security;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'users'
  and column_name in ('id', 'full_name', 'email', 'address', 'username', 'phone', 'avatar', 'role', 'created_at')
order by column_name;

/*
Optional production RLS setup.
Enable this after testing if you want users to read, create, and update only
their own public.users profile row.

alter table public.users enable row level security;

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
on public.users
for select
using (auth.uid() = id);

drop policy if exists "Users can create own profile" on public.users;
create policy "Users can create own profile"
on public.users
for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
on public.users
for update
using (auth.uid() = id)
with check (auth.uid() = id);
*/
