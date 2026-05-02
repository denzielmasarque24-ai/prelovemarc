-- ============================================================
-- PRELOVE SHOP - Exact 10 active Supabase shop products
-- Run this in Supabase SQL Editor.
-- Keeps existing rows, updates matching names, and marks other products inactive.
-- ============================================================

alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists image text;
alter table public.products add column if not exists category text not null default 'tops';
alter table public.products add column if not exists status text not null default 'active';
alter table public.products add column if not exists description text default '';

with desired_products (name, price, image_url, category, description, sort_order) as (
  values
    ('Soft Blush Shorts', 1299, '/images/short1.png', 'bottoms', 'Soft boutique shorts with a flattering fit and an easy feminine feel.', 1),
    ('Twist Front Tube Top', 999, '/images/twist-front-tube-top.png', 'tops', 'Twist Front Tube Top', 2),
    ('Blue Top', 1499, '/images/blue-top.png', 'tops', 'A polished blue top made for feminine everyday outfits.', 3),
    ('Self-tie Top', 1699, '/images/self-tie-top.png', 'tops', 'A feminine self-tie top with a soft boutique silhouette.', 4),
    ('One Shoulder Rib-Knot Top', 2199, '/images/one-shoulder-rib-knot-top.png', 'tops', 'A one shoulder rib-knot top with a sleek feminine fit.', 5),
    ('One Drawstring Ruched Top', 2399, '/images/one-drawstring-ruched-top.png', 'tops', 'A ruched drawstring top with a soft feminine silhouette.', 6),
    ('Lace Top', 1199, '/images/lace-top.png', 'tops', 'A delicate lace top with a soft boutique finish.', 7),
    ('Fendi Highwaist Shorts', 1399, '/images/fendi-highwaist-shorts.png', 'bottoms', 'Highwaist shorts with a polished boutique-inspired fit.', 8),
    ('Lightwash Highwaist Shorts', 1599, '/images/lightwash-highwaist-shorts.png', 'bottoms', 'Lightwash highwaist shorts with an easy everyday fit.', 9),
    ('Shoulder Hem Tank Top', 1299, '/images/shoulder-hem-tank-top.png', 'tops', 'A shoulder hem tank top with a clean boutique look.', 10)
)
update public.products p
set
  price = d.price,
  image_url = d.image_url,
  image = d.image_url,
  category = d.category,
  description = d.description,
  status = 'active'
from desired_products d
where lower(p.name) = lower(d.name);

with desired_products (name, price, image_url, category, description, sort_order) as (
  values
    ('Soft Blush Shorts', 1299, '/images/short1.png', 'bottoms', 'Soft boutique shorts with a flattering fit and an easy feminine feel.', 1),
    ('Twist Front Tube Top', 999, '/images/twist-front-tube-top.png', 'tops', 'Twist Front Tube Top', 2),
    ('Blue Top', 1499, '/images/blue-top.png', 'tops', 'A polished blue top made for feminine everyday outfits.', 3),
    ('Self-tie Top', 1699, '/images/self-tie-top.png', 'tops', 'A feminine self-tie top with a soft boutique silhouette.', 4),
    ('One Shoulder Rib-Knot Top', 2199, '/images/one-shoulder-rib-knot-top.png', 'tops', 'A one shoulder rib-knot top with a sleek feminine fit.', 5),
    ('One Drawstring Ruched Top', 2399, '/images/one-drawstring-ruched-top.png', 'tops', 'A ruched drawstring top with a soft feminine silhouette.', 6),
    ('Lace Top', 1199, '/images/lace-top.png', 'tops', 'A delicate lace top with a soft boutique finish.', 7),
    ('Fendi Highwaist Shorts', 1399, '/images/fendi-highwaist-shorts.png', 'bottoms', 'Highwaist shorts with a polished boutique-inspired fit.', 8),
    ('Lightwash Highwaist Shorts', 1599, '/images/lightwash-highwaist-shorts.png', 'bottoms', 'Lightwash highwaist shorts with an easy everyday fit.', 9),
    ('Shoulder Hem Tank Top', 1299, '/images/shoulder-hem-tank-top.png', 'tops', 'A shoulder hem tank top with a clean boutique look.', 10)
)
insert into public.products (name, price, image, image_url, category, description, status)
select d.name, d.price, d.image_url, d.image_url, d.category, d.description, 'active'
from desired_products d
where not exists (
  select 1
  from public.products p
  where lower(p.name) = lower(d.name)
);

update public.products p
set status = 'inactive'
where not exists (
  select 1
  from (
    values
      ('Soft Blush Shorts'),
      ('Twist Front Tube Top'),
      ('Blue Top'),
      ('Self-tie Top'),
      ('One Shoulder Rib-Knot Top'),
      ('One Drawstring Ruched Top'),
      ('Lace Top'),
      ('Fendi Highwaist Shorts'),
      ('Lightwash Highwaist Shorts'),
      ('Shoulder Hem Tank Top')
  ) as desired(name)
  where lower(p.name) = lower(desired.name)
);

notify pgrst, 'reload schema';
