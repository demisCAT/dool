# Divina Natales

Tienda de comida casera en Puerto Natales. El cliente elige platos, selecciona retiro en local o despacho a domicilio, completa sus datos y envía el pedido por WhatsApp. El pedido se guarda también en Supabase y se gestiona desde `/admin`. Precios en CLP; interfaz en español.

## Funcionalidades

### Tienda (`/`)

- Catálogo de productos **activos** agrupados por categoría; la pizarra del inicio muestra hasta **8 platos principales activos** (categoría con slug `platos-principales`). Si no hay, muestra un aviso, no productos ficticios.
- Tarjetas compactas con foto a la izquierda en móvil y tablet; en escritorio, tarjetas verticales. Las fotografías del menú se sirven mediante `next/image`.
- Carrito persistente en `localStorage`, con variantes por acompañamiento y cantidades.
- Para platos marcados «con acompañamiento», selector de una opción activa o «Sin acompañamiento». Esta última aplica un **descuento fijo global por unidad**, configurable en admin; el precio nunca baja de $0.
- Formulario con nombre, teléfono, fecha, modalidad obligatoria (**Retiro en local** o **Despacho a domicilio**) y nota opcional. El despacho exige dirección y añade una **tarifa fija por pedido**, no por producto. Se muestran subtotal, tarifa y total.
- Antes de abrir WhatsApp, el pedido se guarda en Supabase. El mensaje incluye modalidad, dirección cuando corresponde, desglose, total y fecha en formato `dd-MM-yyyy`. Tras abrir WhatsApp, el cliente confirma manualmente si lo envió.
- Dirección del local (Carlos Condell 1546, Puerto Natales, Chile) con enlace a Google Maps en «Cómo pedir» y en el pie de página. El número telefónico se revela solo al hacer clic para reducir la captación por bots.

### Administración (`/admin`)

- Acceso con Supabase Auth; sin variables de Supabase se muestra una pantalla de configuración.
- Productos: alta, edición, borrado, disponibilidad, fotografías (Storage público) y selección de categoría/acompañamiento. Al filtrar por categoría se muestran en orden de tienda y se pueden reordenar con flechas; en «Todas» se listan alfabéticamente.
- Categorías y acompañamientos: gestión y orden manual mediante flechas. Los acompañamientos tienen disponibilidad independiente.
- «Acompañamientos»: ajuste global **Descuento sin acompañamiento** en CLP (0 lo desactiva).
- «Pedidos»: listado con estado, modalidad, dirección si es despacho, tarifa aplicada y total. Filtro por fecha, «Marcar recibido» y «Borrar».
- Después del listado: **Vencimiento de pedidos** (días para pendientes y recibidos) y, a continuación, **Tarifa de despacho** en CLP (0 permite despacho gratis).
- Limpieza de pedidos vencidos al abrir el admin y mediante cron diario de Vercel.

## Stack

- Next.js 16.3 (App Router, React 19, Server Actions), Tailwind CSS 4.
- Supabase: PostgreSQL con RLS, Auth y Storage de imágenes.
- WhatsApp mediante enlaces `wa.me`; no se usa la API de WhatsApp Business.

## Configuración

### 1. Base de datos

**Proyecto nuevo:** ejecuta [`supabase/schema.sql`](supabase/schema.sql) en Supabase → SQL Editor. Crea tablas, políticas RLS, función de limpieza, bucket público `products` y categorías/acompañamientos de ejemplo. Personaliza los datos desde el admin.

**Proyecto con tablas ya creadas:** no vuelvas a ejecutar todo el schema (contiene políticas `create policy`). Para habilitar retiro/despacho, ejecuta [`supabase/delivery-migration.sql`](supabase/delivery-migration.sql) en SQL Editor. Agrega modalidad, dirección y tarifa a `orders`, y la clave `delivery_fee` a `settings`; los pedidos antiguos quedan como retiro sin tarifa. El `schema.sql` refleja el estado final de la base. El descuento `no_side_discount` puede crearse/actualizarse al guardarlo por primera vez en el admin.

### 2. Variables de entorno

Copia `.env.example` a `.env.local` y completa:

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública anon de Supabase; la seguridad depende de RLS |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número del negocio, solo dígitos y con código de país (Chile: `56912345678`) |
| `CRON_SECRET` | Secreto **solo del servidor** para proteger `/api/cron/cleanup-orders`; configurar en Vercel si se usa el cron |

No uses la clave `service_role` en el cliente ni en variables `NEXT_PUBLIC_*`.

### 3. Administrador y tarifas

1. Crea el usuario en Supabase → Authentication → Users (confirma el correo); desactiva los registros públicos por email si no los necesitas.
2. Entra a `/admin` con ese usuario.
3. Configura «Descuento sin acompañamiento» en **Acompañamientos** y «Tarifa de despacho» en **Pedidos**; ambos usan `0` por defecto.
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

`lib/pricing.ts` centraliza el descuento por «Sin acompañamiento», el subtotal de productos y el total con despacho. El descuento aplica solo a productos `with_side` seleccionados sin acompañamiento; la tarifa de despacho se suma **una vez** solo al elegir domicilio. Ambas cantidades se leen de `settings` y el servidor recalcula el total antes de guardar el pedido; la interfaz y el mensaje de WhatsApp muestran el desglose.

La tabla `orders` conserva modalidad (`fulfillment_mode`: `pickup`/`delivery`), dirección (`address`), tarifa cobrada (`delivery_fee`), artículos y total. Los artículos nuevos guardan un `unit_price` calculado para mantener el precio histórico en el admin; los pedidos antiguos siguen siendo legibles. El carrito continúa en `localStorage` hasta que el cliente confirma el envío por WhatsApp.

## Estructura principal

```text
app/page.tsx                 Tienda (server component, force-dynamic)
app/admin/                  Panel, login y Server Actions
app/api/cron/               Limpieza automática de pedidos
components/store/           Menú, pizarra, carrito y pedido
components/admin/           Panel de productos, pedidos y ajustes
lib/pricing.ts              Cálculo de precios y tarifa
lib/whatsapp.ts             Mensaje y URL de wa.me
lib/location.ts             Dirección pública y enlace a Maps
lib/supabase/               Clientes y consultas públicas
supabase/schema.sql         Esquema completo para proyectos nuevos
supabase/delivery-migration.sql  Actualización para bases existentes
```

Los iconos de marca están en `app/favicon.ico`, `app/icon.png` y `app/apple-icon.png`. El emblema de la tienda está en `public/logo-emblem.png`; el footer permanece tipográfico.
