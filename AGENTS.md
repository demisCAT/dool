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

## Stack y quirks verificados (Next.js 16.3)

- `cookies()`, `params` y `searchParams` son async: `await cookies()`.
- `revalidateTag` exige segundo argumento (`'max'`); para read-your-writes usar `updateTag`.
- `serverActions.bodySizeLimit` está bajo `experimental` en `next.config.ts` (subida de fotos, 10mb).
- `middleware` se renombró a `proxy`.
- Imágenes remotas de Supabase pasan por `next/image` config: `remotePatterns` con `**.supabase.co` en `next.config.ts`.
- ESLint con reglas estrictas de React: no llamar `setState` síncrono en efectos (usar patrón de ajuste durante render); usar `<Link>` de `next/link`, no `<a>`.

## Supabase

- Clientes: `lib/supabase/server.ts` (lee cookies), `lib/supabase/client.ts` (browser, para subir fotos), consultas públicas en `lib/supabase/queries.ts`.
- RLS: lectura pública de catálogo/ajustes; escritura administrativa solo `authenticated`. `orders` admite inserción anónima, pero lectura/edición/borrado solo admin. Todo cambio de tablas/policies/buckets debe reflejarse en `supabase/schema.sql`.
- CRUD por Server Actions en `app/admin/actions.ts`; flujo de foto: upload desde navegador → URL pública → acción con `image_url`.
- Esquema completo para proyectos nuevos: `supabase/schema.sql`. En bases existentes, aplicar `supabase/delivery-migration.sql` si faltan los campos de despacho y luego `supabase/delivery-distance-migration.sql` para registrar distancias, antes de desplegar (no volver a ejecutar todo `schema.sql`: recrea políticas).
- `orders` guarda `fulfillment_mode` (`pickup`/`delivery`), `address`, `delivery_distance_m`, `delivery_fee` aplicado, `items` JSON y `total`. `settings` guarda Tarifa 1 (`delivery_fee`), Tarifa 2 (`delivery_fee_over_2km`, ausente/null hasta configurarse), descuento y retenciones. Migración de distancia existente: `supabase/delivery-distance-migration.sql`.
- Sin env de Supabase la app debe seguir funcionando: `/` muestra banner, `/admin` muestra pantalla de configuración (guards con `hasEnv`).

## Seguridad

- Solo usar claves públicas en el cliente. Jamás agregar la `service_role` key a `.env*` ni a variables `NEXT_PUBLIC_*`; la anon key es pública por diseño — la frontera real de seguridad es RLS.
- Toda acción de escritura **administrativa** en `app/admin/actions.ts` debe pasar por `requireUser()` (verificación de sesión), aunque RLS ya proteja. Excepción explícita: `submitOrder` es público para permitir pedidos anónimos; valida modalidad/dirección y recalcula descuentos/tarifa desde `settings` en servidor antes de insertar (RLS permite `insert` público en `orders`).
- Google Places: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` es visible en el navegador; restringir por referrer y APIs. `GOOGLE_MAPS_SERVER_API_KEY` es privada, solo Places API (New), nunca Git ni `NEXT_PUBLIC_`. Limitar cuotas/alertas en Google Cloud. No confiar en las coordenadas ni tarifa del cliente; `submitOrder` resuelve el Place ID en el servidor.
- Mantener genérico el mensaje de error del login ("Credenciales incorrectas") para no revelar si el correo existe.
- Subida de fotos: validar MIME `image/*` y tamaño (5 MB) antes de subir; el path se genera con `crypto.randomUUID()` (nunca usar input del usuario en el path); el bucket `products` es público por diseño — no guardar ahí nada privado.
- `window.open` del enlace wa.me debe conservar `noopener,noreferrer` (anti-tabnabbing).
- Número de teléfono protegido contra bots: nunca renderizar dígitos en HTML estático; usar `components/store/phone-contact.tsx` (revela el número en el navegador al hacer clic).
- React escapa el output por defecto; no usar `dangerouslySetInnerHTML` con datos de productos/pedidos.
- Verificar dependencias con `npm audit` al actualizar paquetes.

## Diseño

- Tailwind 4; tokens en `@theme` de `app/globals.css` (pino, ámbar, kraft, chalk; fuentes Gloock/Karla/Caveat). Reutilizar tokens, no inventar colores.
- Moneda siempre CLP vía `formatPrice` de `lib/format.ts`.
- Descuento «Sin acompañamiento»: monto fijo por unidad de producto `with_side` con `side === null`, tope $0. Despacho: distancia Haversine recta desde `DELIVERY_ORIGIN` en `lib/location.ts`; ≤2.000 m Tarifa 1, >2.000 m Tarifa 2. Usar `lib/pricing.ts` para totales y `lib/whatsapp.ts` para mensajes; fecha WhatsApp `dd-MM-yyyy`.
- Pizarra: hasta 8 productos **activos** de la categoría `platos-principales`, por posición; sin productos, muestra mensaje. Fotos del catálogo con `next/image`; carrito con `localStorage`.
- Admin: flechas para ordenar categorías/acompañamientos/productos (productos por categoría seleccionada); «Descuento sin acompañamiento» en Acompañamientos y «Tarifa de despacho» **después** de «Vencimiento de pedidos» en Pedidos.
- WhatsApp: mensaje armado en `lib/whatsapp.ts`; número solo dígitos en `NEXT_PUBLIC_WHATSAPP_NUMBER`.

## Entorno

`.env.local` (gitignored) con claves Supabase/WhatsApp, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (restringida a referrer), `GOOGLE_MAPS_SERVER_API_KEY` (privada) y `CRON_SECRET` para el cron. El pin público del local está en `lib/location.ts`. No pedir ni revelar claves en chat. Ver `.env.example` y `README.md`.

## Estructura

- `app/` — tienda (`/`) y admin (`/admin`, `/admin/login`); `page.tsx` de la tienda es server component (`force-dynamic`)
- `components/store/` — UI tienda (carrito con localStorage en `cart-provider.tsx`); `components/admin/` — panel
- `lib/` — clientes Supabase, `types.ts`, `format.ts`, `pricing.ts`, `whatsapp.ts`, `location.ts`
