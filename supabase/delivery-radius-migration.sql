-- Ejecutar una vez en Supabase SQL Editor para actualizar una base existente.
-- Agrega el radio máximo de despacho (en metros). El valor por defecto es 10 km;
-- se puede cambiar en Admin > Pedidos > Tarifas de despacho (km enteros).
-- Si la clave no existe, la app asume 10 km sin necesidad de esta migración.
insert into public.settings (key, value)
values ('delivery_max_distance_m', '10000')
on conflict (key) do nothing;
