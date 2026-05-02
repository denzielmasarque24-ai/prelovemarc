-- ============================================================
-- PRELOVE SHOP - Console Error Schema + RLS Fixes
-- Run this in Supabase SQL Editor.
-- Safe to run more than once.
-- ============================================================

create extension if not exists "pgcrypto";

-- Required columns used by the frontend dashboard and admin pages.
alter table public.orders add column if not exists id uuid default gen_random_uuid();
alter table public.orders add column if not exists total integer not null default 0 check (total >= 0);
alter table public.orders add column if not exists status text not null default 'pending';
alter table public.orders add column if not exists created_at timestamptz not null default now();

update public.orders set id = gen_random_uuid() where id is null;
alter table public.orders alter column id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and contype = 'p'
  ) then
    alter table public.orders add constraint orders_pkey primary key (id);
  end if;
end $$;

alter table public.contact_messages add column if not exists id uuid default gen_random_uuid();
alter table public.contact_messages add column if not exists is_read boolean not null default false;
alter table public.contact_messages add column if not exists created_at timestamptz not null default now();

update public.contact_messages set id = gen_random_uuid() where id is null;
alter table public.contact_messages alter column id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.contact_messages'::regclass
      and contype = 'p'
  ) then
    alter table public.contact_messages add constraint contact_messages_pkey primary key (id);
  end if;
end $$;

-- Admin role table requested for RLS checks.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user'
);

alter table public.users add column if not exists role text not null default 'user';

-- Keep existing app profiles usable while adding the requested users table.
insert into public.users (id, role)
select p.id, coalesce(nullif(p.role, ''), 'user')
from public.profiles p
where p.id is not null
on conflict (id) do update set role = excluded.role;

-- Secure contact messages by default: anyone can send, only admins can read.
alter table public.contact_messages enable row level security;

grant insert on public.contact_messages to anon, authenticated;
grant select, update on public.contact_messages to authenticated;
revoke select on public.contact_messages from anon;

drop policy if exists "Allow public contact message inserts" on public.contact_messages;
create policy "Allow public contact message inserts"
on public.contact_messages
for insert
to anon, authenticated
with check (true);

drop policy if exists "Allow admins to read contact messages" on public.contact_messages;
create policy "Allow admins to read contact messages"
on public.contact_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
  )
);

drop policy if exists "Allow admins to mark contact messages read" on public.contact_messages;
create policy "Allow admins to mark contact messages read"
on public.contact_messages
for update
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
  )
);

notify pgrst, 'reload schema';
