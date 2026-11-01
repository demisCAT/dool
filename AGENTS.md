<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Divina Natales

Tienda de comida casera para retiro o despacho a domicilio (Puerto Natales, Chile; precios CLP). El cliente elige platos y modalidad, completa datos y el pedido se guarda en Supabase antes de abrir `wa.me`. Panel admin en `/admin` con Supabase Auth. Textos de UI en español, sin emojis.

## Comandos

- `npm run dev` — desarrollo (Turbopack por defecto)
- `npm run build` — build de producción (corre TypeScript)
- `npm run lint` — ESLint directo (`next lint` ya no existe en Next 16)
- Verificar cambios: `npm run lint` y `npm run build` (no hay tests)

## Stack y quirks verificados (Next.js 16.4.3)

- `cookies()`, `params` y `searchParams` son async: `await cookies()`.
- `revalidateTag` exige segundo argumento (`'max'`); para read-your-writes usar `updateTag`.
- `serverActions.bodySizeLimit` está bajo `experimental` en `next.config.ts` (1 MB; las fotos van directo a Supabase Storage).
- Cabeceras de seguridad en `next.config.ts`: `poweredByHeader: false`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` y CSP base (`frame-ancestors`, `object-src`, `base-uri`).
- `middleware` se renombró a `proxy`.
- Imágenes remotas de Supabase pasan por `next/image` config: `remotePatterns` con `**.supabase.co` en `next.config.ts`.
- ESLint con reglas estrictas de React: no llamar `setState` síncrono en efectos (usar patrón de ajuste durante render); usar `<Link>` de `next/link`, no `<a>`.

## Supabase

- Clientes: `lib/supabase/server.ts` (lee cookies), `lib/supabase/client.ts` (browser, para subir fotos), consultas públicas en `lib/supabase/queries.ts`.
- RLS: lectura pública de catálogo/ajustes; escritura administrativa solo `authenticated`. `orders` no admite insert público: el servidor valida y usa service_role; lectura/edición/borrado solo admin. Todo cambio de tablas/policies/buckets debe reflejarse en `supabase/schema.sql`.
- CRUD por Server Actions en `app/admin/actions.ts`; flujo de foto: upload desde navegador → URL pública → acción con `image_url`.
- Esquema completo para proyectos nuevos: `supabase/schema.sql`. En bases existentes, aplicar `supabase/delivery-migration.sql` si faltan los campos de despacho, luego `supabase/delivery-distance-migration.sql` para registrar distancias, `supabase/delivery-radius-migration.sql` para el radio máximo, `supabase/delivery-fee-pending-migration.sql` para las tarifas pendientes y `supabase/orders-server-insert-migration.sql` para cerrar el insert anónimo de pedidos, antes de desplegar (no volver a ejecutar todo `schema.sql`: recrea políticas).
- `orders` guarda `fulfillment_mode` (`pickup`/`delivery`), `address`, `delivery_distance_m`, `delivery_fee` aplicado, `delivery_fee_pending` (tarifa por confirmar por falta de número), `items` JSON y `total`. No tiene insert público: `submitOrder` reconstruye ítems/precios desde `products`/`sides` e inserta con `lib/supabase/service.ts` (service_role server-only). `settings` guarda Tarifa 1 (`delivery_fee`), Tarifa 2 (`delivery_fee_over_2km`, ausente/null hasta configurarse), radio máximo de despacho (`delivery_max_distance_m`, en metros; default 10.000 si falta), descuento y retenciones. Migraciones existentes: `supabase/delivery-distance-migration.sql`, `supabase/delivery-radius-migration.sql`, `supabase/delivery-fee-pending-migration.sql` y `supabase/orders-server-insert-migration.sql`.
- Sin env de Supabase la app debe seguir funcionando: `/` muestra banner, `/admin` muestra pantalla de configuración (guards con `hasEnv`).

## Seguridad

- Solo usar claves públicas en el cliente. La `service_role` solo puede existir como variable server-only (`SUPABASE_SERVICE_ROLE_KEY`) y usarse en `lib/supabase/service.ts` para insertar pedidos; nunca en componentes cliente ni en `NEXT_PUBLIC_*`. La anon key es pública; RLS sigue siendo la frontera para el resto de operaciones.
- Sesión: cookies de Supabase con `secure` en producción, `sameSite: "lax"` y `maxAge` de 7 días (`lib/supabase/cookie-options.ts`); `proxy.ts` refresca la sesión en `/admin`. `httpOnly` sigue en false porque el upload de fotos usa el cliente de navegador; moverlo a servidor es P1.3b.
- Toda acción de escritura **administrativa** en `app/admin/actions.ts` debe pasar por `requireUser()` (verificación de sesión), aunque RLS ya proteja. Excepción explícita: `submitOrder` es público para permitir pedidos anónimos; valida modalidad/dirección, reconstruye ítems y precios desde `products`/`sides`, recalcula descuentos/tarifa desde `settings` e inserta con `lib/supabase/service.ts` (service_role server-only). No hay insert público en `orders`.
- Google Places: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` es visible en el navegador; restringir por referrer y APIs. `GOOGLE_MAPS_SERVER_API_KEY` es privada, solo Places API (New), nunca Git ni `NEXT_PUBLIC_`. Limitar cuotas/alertas en Google Cloud. No confiar en las coordenadas ni tarifa del cliente; `submitOrder` resuelve el Place ID en el servidor.
- Mantener genérico el mensaje de error del login ("Credenciales incorrectas") para no revelar si el correo existe.
- Subida de fotos: validar MIME raster permitido (`image/jpeg`, `image/png`, `image/webp`, `image/avif`) y tamaño (5 MB) antes de subir; derivar la extensión desde el MIME type y generar el path con `crypto.randomUUID()` (nunca usar input del usuario en el path). `saveProduct` valida que `image_url` pertenezca al bucket `products` del proyecto; el bucket `products` es público por diseño y restringe tamaño/MIME en servidor (`supabase/storage-bucket-limits-migration.sql`).
- `window.open` del enlace wa.me debe conservar `noopener,noreferrer` (anti-tabnabbing).
- Número de teléfono protegido contra bots: nunca renderizar dígitos en HTML estático; usar `components/store/phone-contact.tsx` (revela el número en el navegador al hacer clic).
- React escapa el output por defecto; no usar `dangerouslySetInnerHTML` con datos de productos/pedidos.
- Verificar dependencias con `npm audit` al actualizar paquetes.

## Diseño

- Tailwind 4; tokens en `@theme` de `app/globals.css` (pino, ámbar, kraft, chalk; fuentes Gloock/Karla/Caveat). Reutilizar tokens, no inventar colores.
- Moneda siempre CLP vía `formatPrice` de `lib/format.ts`.
- Descuento «Sin acompañamiento»: monto fijo por unidad de producto `with_side` con `side === null`, tope $0. Despacho: distancia Haversine recta desde `DELIVERY_ORIGIN` en `lib/location.ts`; ≤2.000 m Tarifa 1, >2.000 m Tarifa 2. Radio máximo configurable en Admin > Pedidos (km enteros, 1–100); default 10 km. Fuera de radio se bloquea en cliente y `submitOrder` rechaza el pedido; solo retiro en local. Número de calle: se prellena con `street_number` de Google, se valida con `isValidDeliveryNumber` de `lib/location.ts` (`S/N` y valores no numéricos se tratan como sin número) y, si no hay número, no se calcula tarifa (`delivery_fee_pending`), la nota es opcional y la dirección/tarifa se confirman por WhatsApp; el servidor repite la validación. Usar `lib/pricing.ts` para totales/radio y `lib/whatsapp.ts` para mensajes; fecha WhatsApp `dd-MM-yyyy`.
- Pizarra: hasta 8 productos **activos** de la categoría `platos-principales`, por posición; sin productos, muestra mensaje. Fotos del catálogo con `next/image`; carrito con `localStorage`.
- Admin: flechas para ordenar categorías/acompañamientos/productos (productos por categoría seleccionada); «Descuento sin acompañamiento» en Acompañamientos y «Tarifas de despacho» (Tarifa 1, Tarifa 2 y distancia máxima) **después** de «Vencimiento de pedidos» en Pedidos. En Productos, la vista por categoría usa las columnas Orden · Disp. · Foto · Producto · Precio · Acomp. · Acciones; la foto se muestra en todos los filtros. Los pedidos con `delivery_fee_pending` muestran «Tarifa por confirmar» y aviso de confirmar número, referencias y tarifa.
- WhatsApp: mensaje armado en `lib/whatsapp.ts`; número solo dígitos en `NEXT_PUBLIC_WHATSAPP_NUMBER`.

## Entorno

`.env.local` (gitignored) con claves Supabase/WhatsApp, `SUPABASE_SERVICE_ROLE_KEY` (privada, solo servidor), `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (restringida a referrer), `GOOGLE_MAPS_SERVER_API_KEY` (privada) y `CRON_SECRET` para el cron. El pin público del local está en `lib/location.ts`. No pedir ni revelar claves en chat. Ver `.env.example` y `README.md`.

## Estructura

- `app/` — tienda (`/`) y admin (`/admin`, `/admin/login`); `page.tsx` de la tienda es server component (`force-dynamic`)
- `proxy.ts` — refresco de sesión de Supabase para `/admin` (Next 16)
- `components/store/` — UI tienda (carrito con localStorage en `cart-provider.tsx`); `components/admin/` — panel
- `lib/` — clientes Supabase (`server.ts`, `client.ts`, `service.ts` server-only), `types.ts`, `format.ts`, `pricing.ts`, `whatsapp.ts`, `location.ts`
