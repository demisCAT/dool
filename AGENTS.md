<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Divina Natales

Tienda de comida casera para llevar (Chile, precios CLP). Cliente elige platos, completa datos y el pedido se envía por `wa.me`. Panel admin en `/admin` con Supabase Auth. Textos de UI en español, sin emojis.

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
- RLS: lectura pública; escritura solo `authenticated` (admin). Todo cambio de tablas/policies/buckets debe reflejarse en `supabase/schema.sql`.
- CRUD por Server Actions en `app/admin/actions.ts`; flujo de foto: upload desde navegador → URL pública → acción con `image_url`.
- Sin env de Supabase la app debe seguir funcionando: `/` muestra banner, `/admin` muestra pantalla de configuración (guards con `hasEnv`).

## Seguridad

- Solo usar claves públicas en el cliente. Jamás agregar la `service_role` key a `.env*` ni a variables `NEXT_PUBLIC_*`; la anon key es pública por diseño — la frontera real de seguridad es RLS.
- Toda acción de escritura en `app/admin/actions.ts` debe pasar por `requireUser()` (verificación de sesión). No agregar acciones de escritura sin ese check, aunque RLS ya protege.
- Mantener genérico el mensaje de error del login ("Credenciales incorrectas") para no revelar si el correo existe.
- Subida de fotos: validar MIME `image/*` y tamaño (5 MB) antes de subir; el path se genera con `crypto.randomUUID()` (nunca usar input del usuario en el path); el bucket `products` es público por diseño — no guardar ahí nada privado.
- `window.open` del enlace wa.me debe conservar `noopener,noreferrer` (anti-tabnabbing).
- React escapa el output por defecto; no usar `dangerouslySetInnerHTML` con datos de productos/pedidos.
- Verificar dependencias con `npm audit` al actualizar paquetes.

## Diseño

- Tailwind 4; tokens en `@theme` de `app/globals.css` (pino, ámbar, kraft, chalk; fuentes Gloock/Karla/Caveat). Reutilizar tokens, no inventar colores.
- Moneda siempre CLP vía `formatPrice` de `lib/format.ts`.
- WhatsApp: mensaje armado en `lib/whatsapp.ts`; número solo dígitos en `NEXT_PUBLIC_WHATSAPP_NUMBER`.

## Entorno

`.env.local` (gitignored) con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_WHATSAPP_NUMBER`. Ver `.env.example`.

## Estructura

- `app/` — tienda (`/`) y admin (`/admin`, `/admin/login`); `page.tsx` de la tienda es server component (`force-dynamic`)
- `components/store/` — UI tienda (carrito con localStorage en `cart-provider.tsx`); `components/admin/` — panel
- `lib/` — clientes Supabase, `types.ts`, `format.ts`, `whatsapp.ts`
