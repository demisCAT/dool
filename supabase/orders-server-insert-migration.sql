-- Ejecutar una vez en Supabase SQL Editor para actualizar una base existente.
-- Cierra el INSERT anónimo directo a public.orders: los pedidos solo se
-- insertan desde el servidor con SUPABASE_SERVICE_ROLE_KEY, después de
-- validar ítems, precios, distancia y tarifa en submitOrder.
drop policy if exists "orders_insercion_publica" on public.orders;
