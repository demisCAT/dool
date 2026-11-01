# Base de datos (Supabase)

## Proyecto nuevo

Ejecuta [`schema.sql`](schema.sql) en Supabase → SQL Editor. Crea tablas, políticas RLS, función de limpieza, bucket público `products` y categorías/acompañamientos de ejemplo. Personaliza los datos desde el admin.

Todo cambio de tablas, policies o buckets debe reflejarse en `schema.sql`.

## Proyecto con tablas ya creadas

**No vuelvas a ejecutar todo `schema.sql`**: contiene políticas `create policy` y fallaría o las recrearía. Aplica solo las migraciones que falten, en este orden:

| # | Migración | Cuándo / qué hace |
| --- | --- | --- |
| 1 | [`delivery-migration.sql`](delivery-migration.sql) | Si aún no existe retiro/despacho. Agrega los campos de despacho. |
| 2 | [`delivery-distance-migration.sql`](delivery-distance-migration.sql) | Antes de desplegar el cálculo por distancia. Agrega `delivery_distance_m`; deja NULL en pedidos históricos. |
| 3 | [`delivery-radius-migration.sql`](delivery-radius-migration.sql) | Radio máximo de despacho. Sin esa fila la app asume 10 km. |
| 4 | [`delivery-fee-pending-migration.sql`](delivery-fee-pending-migration.sql) | Antes de desplegar. Agrega `delivery_fee_pending` (tarifa por confirmar por falta de número). |
| 5 | [`orders-server-insert-migration.sql`](orders-server-insert-migration.sql) | Cierra el insert anónimo directo a `orders`. **Ver advertencia abajo.** |
| 6 | [`storage-bucket-limits-migration.sql`](storage-bucket-limits-migration.sql) | Limita MIME y tamaño (5 MB) del bucket `products`. |
| 7 | [`rate-limit-migration.sql`](rate-limit-migration.sql) | Crea la tabla `rate_limits` y la RPC `check_rate_limit`. |
| 8 | [`order-date-settings-migration.sql`](order-date-settings-migration.sql) | Valores iniciales de la ventana de entrega. Si faltan, la app usa 16:00 y 5 días. |

`delivery_fee_over_2km` (Tarifa 2) no tiene migración: se crea al guardar ambas tarifas desde admin.

### Advertencia: migración 5

Antes de ejecutar `orders-server-insert-migration.sql`:

1. Configura `SUPABASE_SERVICE_ROLE_KEY` en el entorno de despliegue.
2. Despliega el código nuevo.
3. Recién entonces ejecuta la migración.

Si se ejecuta antes del despliegue, la versión anterior dejará de guardar pedidos, porque ya no hay insert anónimo.

## Verificación

Para revisar las políticas vigentes, ver la consulta SQL en [`../SECURITY.md`](../SECURITY.md#verificación-sql).
