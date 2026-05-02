-- ============================================================
-- PRELOVE SHOP — Orders Migration (run in Supabase SQL Editor)
-- ============================================================

create extension if not exists "pgcrypto";

-- 1. Create orders table with correct constraints
create table if not exists public.orders (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        references auth.users(id) on delete set null,
  customer_name   text        not null,
  phone           text        not null,
  address         text        not null default '',
  barangay        text,
  city            text,
  province        text,
  zip_code        text,
  notes           text,
  payment_method  text        not null default 'cod',
  delivery_option text        not null default 'pickup',
  total           integer     not null default 0 check (total >= 0),
  status          text        not null default 'pending',
  reference_number text,
  payment_proof   text,
  created_at      timestamptz not null default now()
);

-- 2. Add any missing columns safely
alter table public.orders add column if not exists barangay         text;
alter table public.orders add column if not exists city             text;
alter table public.orders add column if not exists province         text;
alter table public.orders add column if not exists zip_code         text;
alter table public.orders add column if not exists notes            text;
alter table public.orders add column if not exists reference_number text;
alter table public.orders add column if not exists payment_proof    text;
alter table public.orders add column if not exists delivery_option  text not null default 'pickup';
alter table public.orders add column if not exists payment_method   text not null default 'cod';

-- 3. Fix NULL delivery_option values from old rows
update public.orders
set delivery_option = 'pickup'
where delivery_option is null or delivery_option = '';

-- 4. Drop old restrictive CHECK constraints so bank_transfer and all options work
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders drop constraint if exists orders_delivery_option_check;

-- 5. Add updated CHECK constraints
alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('gcash', 'bank_transfer', 'cod', 'paymaya'));

alter table public.orders
  add constraint orders_delivery_option_check
  check (delivery_option in ('pickup', 'delivery'));

-- 6. Create order_items table
create table if not exists public.order_items (
  id           uuid    primary key default gen_random_uuid(),
  order_id     uuid    not null references public.orders(id) on delete cascade,
  product_name text    not null,
  price        integer not null check (price >= 0),
  quantity     integer not null check (quantity > 0)
);

-- 7. Disable RLS for development
alter table public.orders      disable row level security;
alter table public.order_items disable row level security;

-- 8. Reload schema cache
notify pgrst, 'reload schema';

-- 9. Verify columns
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'orders'
order by ordinal_position;
