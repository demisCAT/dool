# Divina Natales

Tienda de comida casera en Puerto Natales. El cliente elige platos, selecciona retiro en local o despacho a domicilio, completa sus datos y envía el pedido por WhatsApp. El pedido se guarda también en Supabase y se gestiona desde `/admin`. Precios en CLP; interfaz en español.

## Funcionalidades

### Tienda (`/`)

- Catálogo de productos **activos** agrupados por categoría; la pizarra del inicio muestra hasta **8 platos principales activos** (categoría con slug `platos-principales`). Si no hay, muestra un aviso, no productos ficticios.
- Tarjetas compactas con foto a la izquierda en móvil y tablet; en escritorio, tarjetas verticales. Las fotografías del menú se sirven mediante `next/image`.
- Carrito persistente en `localStorage`, con variantes por acompañamiento y cantidades.
- Para platos marcados «con acompañamiento», selector de una opción activa o «Sin acompañamiento». Esta última aplica un **descuento fijo global por unidad**, configurable en admin; el precio nunca baja de $0.
- Formulario con nombre, teléfono, fecha y modalidad obligatoria. Para despacho se selecciona una dirección sugerida por Google Maps; se calcula la distancia recta desde el pin fijo del local (`lib/location.ts`): hasta 2 km inclusive usa Tarifa 1; más de 2 km, Tarifa 2. El despacho se limita a un radio máximo configurable (10 km por defecto); más lejos solo se ofrece retiro en local. Se muestran dirección, distancia, tarifa y total.
- El número de calle se prellena con el `street_number` de Google y se puede corregir o escribir si falta; si Google devuelve `S/N` u otro valor no numérico, se trata como sin número. Si no hay número, **no se calcula la tarifa de despacho**: queda «por confirmar», el total muestra solo los productos y la nota queda disponible (opcional) para describir la dirección real. La dirección y la tarifa se confirman por WhatsApp. El número escrito habilita el cálculo aunque Google no lo traiga.
- El servidor vuelve a consultar el Place ID, recalcula distancia/tarifa, rechaza direcciones fuera del radio máximo y repite la validación del número antes de guardar. No se acepta texto libre sin selección de una sugerencia válida de Chile.
- Antes de abrir WhatsApp, el pedido se guarda en Supabase. El mensaje incluye modalidad, dirección cuando corresponde, desglose, total y fecha en formato `dd-MM-yyyy`. Tras abrir WhatsApp, el cliente confirma manualmente si lo envió.
- Dirección del local (Carlos Condell 1546, Puerto Natales, Chile) con enlace a Google Maps en «Cómo pedir» y en el pie de página. El número telefónico se revela solo al hacer clic para reducir la captación por bots.

### Administración (`/admin`)

- Acceso con Supabase Auth; sin variables de Supabase se muestra una pantalla de configuración.
- Productos: alta, edición, borrado, disponibilidad, fotografías (Storage público) y selección de categoría/acompañamiento. Al filtrar por categoría se muestran en orden de tienda, se pueden reordenar con flechas y aparece la columna **Disp.** con el toggle; en «Todas» se listan alfabéticamente. La fotografía se muestra en todos los filtros.
- Categorías y acompañamientos: gestión y orden manual mediante flechas. Los acompañamientos tienen disponibilidad independiente.
- «Acompañamientos»: ajuste global **Descuento sin acompañamiento** en CLP (0 lo desactiva).
- «Pedidos»: listado con estado, modalidad, dirección, distancia recta, tarifa aplicada y total. Los pedidos sin número muestran «Tarifa por confirmar» y un aviso para confirmar número, referencias y tarifa por WhatsApp. Filtro por fecha, «Marcar recibido» y «Borrar».
- Después del listado: **Vencimiento de pedidos** y luego **Tarifas de despacho**: Tarifa 1 (≤2 km) y Tarifa 2 (>2 km) en CLP, más la **distancia máxima de despacho** en km enteros (1 a 100).
- Limpieza de pedidos vencidos al abrir el admin y mediante cron diario de Vercel.

## Stack

- Next.js 16.4.3 (App Router, React 19, Server Actions), Tailwind CSS 4.
- Supabase: PostgreSQL con RLS, Auth y Storage de imágenes.
- WhatsApp mediante enlaces `wa.me`; no se usa la API de WhatsApp Business.

## Configuración

### 1. Base de datos

**Proyecto nuevo:** ejecuta [`supabase/schema.sql`](supabase/schema.sql) en Supabase → SQL Editor. Crea tablas, políticas RLS, función de limpieza, bucket público `products` y categorías/acompañamientos de ejemplo. Personaliza los datos desde el admin.

**Proyecto con tablas ya creadas:** no vuelvas a ejecutar todo el schema (contiene políticas `create policy`). Si aún no tiene retiro/despacho, ejecuta primero [`supabase/delivery-migration.sql`](supabase/delivery-migration.sql). Ejecuta también [`supabase/delivery-distance-migration.sql`](supabase/delivery-distance-migration.sql) antes del despliegue del cálculo por distancia; agrega `delivery_distance_m` y deja NULL en pedidos históricos. Para el radio máximo, ejecuta [`supabase/delivery-radius-migration.sql`](supabase/delivery-radius-migration.sql); sin esa fila la app asume 10 km. Para las tarifas pendientes por falta de número, ejecuta [`supabase/delivery-fee-pending-migration.sql`](supabase/delivery-fee-pending-migration.sql) antes de desplegar. Para cerrar el insert anónimo directo a pedidos, primero configura `SUPABASE_SERVICE_ROLE_KEY`, despliega el código nuevo y luego ejecuta [`supabase/orders-server-insert-migration.sql`](supabase/orders-server-insert-migration.sql); si ejecutas la migración antes del despliegue, la versión anterior dejará de guardar pedidos. `delivery_fee_over_2km` se crea al guardar ambas tarifas desde admin.

### 2. Variables de entorno

Copia `.env.example` a `.env.local` y completa:

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública anon de Supabase; la seguridad depende de RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave **solo del servidor** para insertar pedidos validados; nunca `NEXT_PUBLIC_` ni código cliente |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número del negocio, solo dígitos y con código de país (Chile: `56912345678`) |
| `CRON_SECRET` | Secreto **solo del servidor** para proteger `/api/cron/cleanup-orders`; configurar en Vercel si se usa el cron |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Clave para autocomplete en el navegador; restringir por HTTP referrer y APIs |
| `GOOGLE_MAPS_SERVER_API_KEY` | Clave distinta y privada para validar Place IDs en el servidor; restringir a Places API (New) |

La clave `service_role` solo se usa en `lib/supabase/service.ts`, en el servidor, para insertar pedidos ya validados. Nunca debe importarse desde un componente cliente ni llevar el prefijo `NEXT_PUBLIC_`.
No pegues las API keys en el chat ni las guardes en Git. Configura las claves en `.env.local` y Vercel; si falta alguna clave de Google, la opción de despacho queda deshabilitada. Si falta `SUPABASE_SERVICE_ROLE_KEY`, no se podrán guardar pedidos. El pin de origen está en `lib/location.ts` y no es secreto.
La clave del navegador debe restringirse por dominio y autorizar Maps JavaScript API + Places API (New). Crea una segunda clave privada para servidor, restringida a Places API (New). Configura cuotas y alertas de presupuesto en Google Cloud. Places se factura por SKU y tiene cupos gratuitos mensuales por SKU; esta implementación solicita detalles en el navegador para previsualizar y los vuelve a validar en el servidor al enviar. No se llama a Routes API. Consulta [precios oficiales](https://developers.google.com/maps/billing-and-pricing/pricing) y [precios de sesión de Places](https://developers.google.com/maps/documentation/places/web-service/session-pricing).

### 3. Administrador y tarifas

1. Crea el usuario en Supabase → Authentication → Users (confirma el correo); desactiva los registros públicos por email si no los necesitas.
2. Entra a `/admin` con ese usuario.
3. Configura «Descuento sin acompañamiento» en **Acompañamientos** y, en **Pedidos**, ambas tarifas y la distancia máxima de despacho. Tarifa 2 queda sin configurar hasta guardarla; no se aceptarán despachos de más de 2 km mientras falte.
4. Agrega y activa productos; marca «con acompañamiento» solo donde corresponda.

## Desarrollo y despliegue

```bash
npm install
npm run dev
```

Abre la URL indicada por Next.js (habitualmente `http://localhost:3000`). Para verificar cambios y servir el build:

```bash
npm run lint
npm run build
npm run start
```

No hay suite de tests automatizada. El despliegue en Vercel requiere las variables anteriores; `vercel.json` programa `/api/cron/cleanup-orders` a las 04:00 UTC. Al modificar dependencias, revisa `npm audit`.

## Precios y pedidos

`lib/pricing.ts` centraliza el descuento por «Sin acompañamiento», el subtotal, las tarifas y el radio máximo de despacho. `lib/distance.ts` calcula Haversine desde `DELIVERY_ORIGIN` en `lib/location.ts`; exactamente 2.000 m usa Tarifa 1 y cualquier distancia superior usa Tarifa 2. La distancia máxima se guarda en `settings` como `delivery_max_distance_m` y se configura en km enteros desde Admin > Pedidos; si falta, se asume 10.000 m. `lib/location.ts` define el formato válido del número de calle. El navegador muestra una estimación y bloquea el envío fuera de radio; `submitOrder` valida el Place ID con Places API en el servidor, **reconstruye los ítems y precios desde `products`/`sides`**, recalcula tarifa/total, rechaza la dirección fuera de radio y, si no hay número, guarda el pedido con `delivery_fee = 0` y `delivery_fee_pending = true` para confirmar dirección y despacho por WhatsApp (la nota es opcional). El insert se hace con `lib/supabase/service.ts` (service_role solo en servidor); no hay insert anónimo directo. Cada pedido conserva `delivery_distance_m` y `delivery_fee` aplicados.

**Cobertura geográfica:** las sugerencias están restringidas a Chile y sesgadas alrededor del local; la validación del radio máximo se aplica al seleccionar una dirección y se repite en el servidor. No se usa un polígono comunal.

La tabla `orders` conserva modalidad, dirección canónica, distancia en metros, tarifa cobrada, artículos y total. WhatsApp incluye distancia recta y tarifa. El carrito continúa en `localStorage` hasta que el cliente confirma el envío.

## Estructura principal

```text
app/page.tsx                 Tienda (server component, force-dynamic)
app/admin/                  Panel, login y Server Actions
app/api/cron/               Limpieza automática de pedidos
components/store/           Menú, pizarra, carrito y pedido
components/admin/           Panel de productos, pedidos y ajustes
lib/pricing.ts              Cálculo de precios, tarifa y radio de despacho
lib/whatsapp.ts             Mensaje y URL de wa.me
lib/location.ts             Dirección pública, pin y validación de número
lib/supabase/               Clientes, consultas públicas y service_role server-only
supabase/schema.sql         Esquema completo para proyectos nuevos
supabase/delivery-migration.sql  Actualización para bases existentes
supabase/delivery-distance-migration.sql  Agrega distancia a pedidos existentes
supabase/delivery-radius-migration.sql    Agrega el radio máximo (10 km)
supabase/delivery-fee-pending-migration.sql  Agrega tarifas pendientes por falta de número
supabase/orders-server-insert-migration.sql  Cierra el insert anónimo de pedidos
```

Los iconos de marca están en `app/favicon.ico`, `app/icon.png` y `app/apple-icon.png`. El emblema de la tienda está en `public/logo-emblem.png`; el footer permanece tipográfico.
