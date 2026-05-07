-- ============================================================
-- PRELOVE SHOP - Fix My Profile Address Fields
-- Run this in the Supabase SQL Editor.
-- ============================================================

alter table public.profiles add column if not exists address text not null default '';
alter table public.profiles add column if not exists barangay text not null default '';
alter table public.profiles add column if not exists city text not null default '';
alter table public.profiles add column if not exists province text not null default '';
alter table public.profiles add column if not exists zip_code text not null default '';

update public.profiles
set
  address = coalesce(address, ''),
  barangay = coalesce(barangay, ''),
  city = coalesce(city, ''),
  province = coalesce(province, ''),
  zip_code = coalesce(zip_code, '');

notify pgrst, 'reload schema';

select
  column_name,
  data_type,
  column_default,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in ('address', 'barangay', 'city', 'province', 'zip_code')
order by ordinal_position;
