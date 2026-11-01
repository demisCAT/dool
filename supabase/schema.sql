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

create table if not exists public.sides (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  delivery_date date not null,
  fulfillment_mode text not null default 'pickup' check (fulfillment_mode in ('pickup', 'delivery')),
  address text not null default '',
  delivery_fee integer not null default 0 check (delivery_fee >= 0),
  delivery_fee_pending boolean not null default false,
  delivery_distance_m integer check (delivery_distance_m >= 0),
  note text not null default '',
  items jsonb not null,
  total integer not null check (total >= 0),
  status text not null default 'pendiente' check (status in ('pendiente','recibido')),
  created_at timestamptz not null default now()
);

create index if not exists orders_status_created_idx on public.orders (status, created_at);

-- Rate limiting compartido (serverless). Solo service_role puede leer/escribir.
create table if not exists public.rate_limits (
  key text primary key check (length(key) <= 200),
  window_started_at timestamptz not null default now(),
  count integer not null default 0 check (count >= 0),
  expires_at timestamptz not null
);

create index if not exists rate_limits_expires_idx on public.rate_limits (expires_at);

create table if not exists public.settings (
  key text primary key,
  value text not null
);

insert into public.settings (key, value) values
  ('order_retention_pending_days', '5'),
  ('order_retention_received_days', '30'),
  ('no_side_discount', '0'),
  ('delivery_fee', '0'),
  ('delivery_max_distance_m', '10000'),
  ('order_cutoff_hour', '16'),
  ('order_max_days', '5')
on conflict (key) do nothing;

-- ============ RLS ============

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.sides enable row level security;
alter table public.orders enable row level security;
alter table public.settings enable row level security;
alter table public.rate_limits enable row level security;

-- Lectura pública (tienda)
create policy "categorias_lectura_publica" on public.categories
  for select using (true);

create policy "productos_lectura_publica" on public.products
  for select using (true);

create policy "sides_lectura_publica" on public.sides
  for select using (true);

create policy "settings_lectura_publica" on public.settings
  for select using (true);

-- Pedidos: sin INSERT público. El servidor valida ítems, precios, distancia
-- y tarifa en submitOrder y luego inserta con la service_role.
-- Leer/editar/borrar: solo admin autenticado.
create policy "orders_lectura_admin" on public.orders
  for select to authenticated using (true);

create policy "orders_actualizacion_admin" on public.orders
  for update to authenticated using (true);

create policy "orders_borrado_admin" on public.orders
  for delete to authenticated using (true);

-- Escritura solo autenticados (admin)
create policy "categorias_admin_escritura" on public.categories
  for all to authenticated using (true) with check (true);

create policy "productos_admin_escritura" on public.products
  for all to authenticated using (true) with check (true);

create policy "sides_admin_escritura" on public.sides
  for all to authenticated using (true) with check (true);

create policy "settings_admin_escritura" on public.settings
  for all to authenticated using (true) with check (true);

-- ============ RATE LIMITING ============
-- Ventana fija por clave. Solo se ejecuta desde el servidor con service_role.
create or replace function public.check_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_window_started_at timestamptz;
begin
  if p_key is null
    or length(p_key) = 0
    or length(p_key) > 200
    or p_max < 1
    or p_window_seconds < 1
  then
    raise exception 'invalid rate limit arguments';
  end if;

  delete from public.rate_limits where expires_at < now();

  insert into public.rate_limits as rl (key, window_started_at, count, expires_at)
  values (p_key, now(), 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update
  set
    count = case
      when rl.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then 1
      else rl.count + 1
    end,
    window_started_at = case
      when rl.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then now()
      else rl.window_started_at
    end,
    expires_at = case
      when rl.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then now() + make_interval(secs => p_window_seconds)
      else rl.expires_at
    end
  returning count, window_started_at into v_count, v_window_started_at;

  return query
  select
    v_count <= p_max,
    greatest(p_max - v_count, 0),
    v_window_started_at + make_interval(secs => p_window_seconds);
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- ============ LIMPIEZA DE PEDIDOS VENCIDOS ============
-- Se ejecuta con la RPC (security definer) desde el cron de Vercel y al cargar /admin.
-- Las reglas de retención se leen de la tabla settings (editables en el admin).

create or replace function public.cleanup_expired_orders()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.orders
  where (status = 'pendiente' and created_at < now() - make_interval(days => (
      select value::int from public.settings where key = 'order_retention_pending_days'
    )))
    or (status = 'recibido' and created_at < now() - make_interval(days => (
      select value::int from public.settings where key = 'order_retention_received_days'
    )));
end;
$$;

revoke all on function public.cleanup_expired_orders() from public;
grant execute on function public.cleanup_expired_orders() to anon, authenticated;

-- ============ STORAGE ============

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'products',
  'products',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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

-- ============ ACOMPAÑAMIENTOS INICIALES (ejemplo, edítalos en el admin) ============

insert into public.sides (name, description, position) values
  ('Papas fritas', '', 0),
  ('Ensalada fresca', 'Lechuga, tomate y cebolla', 1),
  ('Arroz', '', 2)
on conflict do nothing;
