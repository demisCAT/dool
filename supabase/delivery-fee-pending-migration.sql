-- Ejecutar una vez en Supabase SQL Editor para actualizar una base existente.
-- Marca los pedidos de despacho cuyo número de dirección no se indicó: la
-- distancia se registra, pero la tarifa queda por confirmar por WhatsApp.
alter table public.orders
  add column if not exists delivery_fee_pending boolean not null default false;
