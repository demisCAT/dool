-- Ejecutar una vez en Supabase SQL Editor para actualizar una base existente.
-- Conserva los pedidos anteriores: la distancia queda NULL si no se registró.
alter table public.orders
  add column if not exists delivery_distance_m integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_delivery_distance_m_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders add constraint orders_delivery_distance_m_check
      check (delivery_distance_m >= 0);
  end if;
end $$;

-- Tarifa 2 se crea al guardarla desde Admin > Pedidos; no se asigna un monto
-- por defecto para evitar cobrar una tarifa desconocida en distancias mayores.
