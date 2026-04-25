create extension if not exists "pgcrypto";

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  phone text not null,
  address text not null,
  barangay text,
  city text,
  province text,
  zip_code text,
  notes text,
  payment_method text not null check (payment_method in ('gcash', 'paymaya', 'cod')),
  delivery_option text not null check (delivery_option in ('pickup', 'delivery')),
  total integer not null check (total >= 0),
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_name text not null,
  price integer not null check (price >= 0),
  quantity integer not null check (quantity > 0)
);

alter table public.orders add column if not exists barangay text;
alter table public.orders add column if not exists city text;
alter table public.orders add column if not exists province text;
alter table public.orders add column if not exists zip_code text;
alter table public.orders add column if not exists delivery_option text;
alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists notes text;

notify pgrst, 'reload schema';

alter table public.orders disable row level security;
alter table public.order_items disable row level security;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'orders'
  and column_name in (
    'address',
    'barangay',
    'city',
    'province',
    'zip_code',
    'delivery_option',
    'payment_method',
    'notes'
  )
order by column_name;

insert into public.orders (
  customer_name,
  phone,
  address,
  barangay,
  city,
  province,
  zip_code,
  payment_method,
  delivery_option,
  notes,
  total,
  status
)
values (
  'Checkout Test',
  '09123456789',
  '123 Test Street',
  'Test Barangay',
  'Test City',
  'Test Province',
  '1000',
  'gcash',
  'delivery',
  'Manual Supabase insert test',
  5000,
  'pending'
);

/*
Optional production RLS setup.
Keep RLS disabled while testing checkout inserts. Re-enable these policies later
when checkout works and you are ready to lock the tables down.

drop policy if exists "Customers can create orders" on public.orders;
create policy "Customers can create orders"
on public.orders
for insert
with check (user_id is null or auth.uid() = user_id);

drop policy if exists "Customers can create order items" on public.order_items;
create policy "Customers can create order items"
on public.order_items
for insert
with check (true);

drop policy if exists "Customers can read own orders" on public.orders;
create policy "Customers can read own orders"
on public.orders
for select
using (user_id = auth.uid());

drop policy if exists "Customers can read own order items" on public.order_items;
create policy "Customers can read own order items"
on public.order_items
for select
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);
*/
