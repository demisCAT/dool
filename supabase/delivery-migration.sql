-- Ejecutar una vez en Supabase SQL Editor para actualizar una base existente.
-- Los pedidos antiguos quedan como retiro en local con tarifa $0.
alter table public.orders
  add column if not exists fulfillment_mode text not null default 'pickup',
  add column if not exists address text not null default '',
  add column if not exists delivery_fee integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_fulfillment_mode_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders add constraint orders_fulfillment_mode_check
      check (fulfillment_mode in ('pickup', 'delivery'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_delivery_fee_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders add constraint orders_delivery_fee_check
      check (delivery_fee >= 0);
  end if;
end $$;

insert into public.settings (key, value)
values ('delivery_fee', '0')
on conflict (key) do nothing;
