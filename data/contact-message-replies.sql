-- ============================================================
-- PRELOVE SHOP - Contact Message Replies
-- Run this in Supabase SQL Editor.
-- Safe to run more than once.
-- ============================================================

create extension if not exists "pgcrypto";

alter table public.contact_messages
  add column if not exists is_read boolean not null default false,
  add column if not exists status text not null default 'new',
  add column if not exists admin_reply text,
  add column if not exists replied_at timestamptz,
  add column if not exists replied_by uuid references auth.users(id) on delete set null;

create table if not exists public.contact_message_replies (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.contact_messages(id) on delete cascade,
  admin_reply text not null,
  replied_at timestamptz not null default now(),
  replied_by uuid references auth.users(id) on delete set null
);

create index if not exists contact_message_replies_message_id_idx
on public.contact_message_replies(message_id);

create index if not exists contact_messages_status_idx
on public.contact_messages(status);

alter table public.contact_message_replies enable row level security;

drop policy if exists "Admins can manage contact message replies" on public.contact_message_replies;
create policy "Admins can manage contact message replies"
on public.contact_message_replies
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

notify pgrst, 'reload schema';
