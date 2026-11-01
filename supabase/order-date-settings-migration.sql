-- Ejecutar una vez en Supabase SQL Editor para bases existentes.
-- Valores por defecto de la ventana de entrega; se editan en Admin > Pedidos.
insert into public.settings (key, value)
values
  ('order_cutoff_hour', '16'),
  ('order_max_days', '5')
on conflict (key) do nothing;
