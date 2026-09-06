-- Divina Natales — schema Supabase
-- Ejecutar completo en: Supabase Dashboard > SQL Editor > New query

-- ============ TABLAS ============

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete cascade,
  name text not null,
  description text not null default '',
  price integer not null check (price >= 0),
  image_url text,
  active boolean not null default true,
  with_side boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products(category_id);

-- ============ RLS ============

alter table public.categories enable row level security;
alter table public.products enable row level security;

-- Lectura pública (tienda)
create policy "categorias_lectura_publica" on public.categories
  for select using (true);

create policy "productos_lectura_publica" on public.products
  for select using (true);

-- Escritura solo autenticados (admin)
create policy "categorias_admin_escritura" on public.categories
  for all to authenticated using (true) with check (true);

create policy "productos_admin_escritura" on public.products
  for all to authenticated using (true) with check (true);

-- ============ STORAGE ============

insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

-- Lectura pública de fotos
create policy "fotos_lectura_publica" on storage.objects
  for select using (bucket_id = 'products');

-- Escritura solo autenticados
create policy "fotos_admin_subida" on storage.objects
  for insert to authenticated with check (bucket_id = 'products');

create policy "fotos_admin_actualizacion" on storage.objects
  for update to authenticated using (bucket_id = 'products');

create policy "fotos_admin_borrado" on storage.objects
  for delete to authenticated using (bucket_id = 'products');

-- ============ CATEGORÍAS INICIALES (ejemplo, edítalas en el admin) ============

insert into public.categories (name, slug, position) values
  ('Platos principales', 'platos-principales', 0),
  ('Guarniciones', 'guarniciones', 1),
  ('Postres', 'postres', 2)
on conflict (slug) do nothing;
