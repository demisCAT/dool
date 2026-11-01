# Divina Natales

Tienda de comida casera en Puerto Natales. El cliente elige platos, selecciona retiro en local o despacho a domicilio, completa sus datos y envía el pedido por WhatsApp. El pedido se guarda también en Supabase y se gestiona desde `/admin`. Precios en CLP; interfaz en español.

## Funcionalidades

- **Tienda (`/`):** catálogo por categoría, pizarra con platos principales, carrito persistente, descuento «Sin acompañamiento», fecha de entrega con hora de corte y despacho calculado por distancia con direcciones de Google Maps.
- **Administración (`/admin`):** productos con fotos, categorías, acompañamientos, pedidos y ajustes de tarifas y fechas.

Detalle en [docs/business-rules.md](docs/business-rules.md) y [docs/admin-guide.md](docs/admin-guide.md).

## Stack

- Next.js 16.4.3 (App Router, React 19, Server Actions), Tailwind CSS 4.
- Supabase: PostgreSQL con RLS, Auth y Storage de imágenes.
- WhatsApp mediante enlaces `wa.me`; no se usa la API de WhatsApp Business.

## Configuración

### 1. Base de datos

- **Proyecto nuevo:** ejecuta [`supabase/schema.sql`](supabase/schema.sql) en Supabase → SQL Editor.
- **Proyecto existente:** no vuelvas a ejecutar el schema completo; aplica las migraciones pendientes siguiendo [supabase/README.md](supabase/README.md).

### 2. Variables de entorno

Copia `.env.example` a `.env.local` y completa:

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública anon de Supabase; la seguridad depende de RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave **solo del servidor** para insertar pedidos validados y ejecutar el rate limiting; nunca `NEXT_PUBLIC_` ni código cliente |
| `RATE_LIMIT_SECRET` | Opcional, solo servidor: secreto para hashear IP/email en rate limiting; si falta se usa `SUPABASE_SERVICE_ROLE_KEY` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número del negocio, solo dígitos y con código de país (Chile: `56912345678`) |
| `CRON_SECRET` | Secreto **solo del servidor** para proteger `/api/cron/cleanup-orders`; configurar en Vercel si se usa el cron |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Clave para autocomplete en el navegador; restringir por HTTP referrer y APIs (Maps JavaScript API + Places API (New)) |
| `GOOGLE_MAPS_SERVER_API_KEY` | Clave distinta y privada para validar Place IDs en el servidor; restringir a Places API (New) |

No guardes claves en Git. Configúralas en `.env.local` y en Vercel. Si falta alguna clave de Google, la opción de despacho queda deshabilitada; si falta `SUPABASE_SERVICE_ROLE_KEY`, no se podrán guardar pedidos. Configura cuotas y alertas de presupuesto en Google Cloud (ver [costos de Google](docs/business-rules.md#costos-de-google)).

### 3. Administrador

Crea el primer usuario en Supabase → Authentication → Users y sigue los pasos de [docs/admin-guide.md](docs/admin-guide.md#primer-uso).

## Desarrollo y despliegue

```bash
npm install
npm run dev
```

Abre la URL indicada por Next.js (habitualmente `http://localhost:3000`). Antes de enviar cambios:

```bash
npm run lint
npm run build
npm audit --omit=dev
```

No hay suite de tests automatizada. GitHub Actions ejecuta estas verificaciones y una búsqueda básica de secretos en cada push a `main` y pull request (`.github/workflows/security.yml`).

El despliegue en Vercel requiere las variables anteriores; `vercel.json` programa `/api/cron/cleanup-orders` a las 04:00 UTC.

## Estructura

```text
app/            Tienda (/), admin (/admin), Server Actions y cron
components/     UI de la tienda (store/) y del panel (admin/)
lib/            Precios, ubicación, fechas, WhatsApp, rate limiting y clientes Supabase
supabase/       Esquema, migraciones y su guía
docs/           Reglas de negocio y guía del admin
proxy.ts        Refresco de sesión de Supabase en /admin
```

## Documentación

- [docs/business-rules.md](docs/business-rules.md): precios, despacho, fechas y flujo del pedido.
- [docs/admin-guide.md](docs/admin-guide.md): uso del panel de administración.
- [supabase/README.md](supabase/README.md): base de datos y orden de migraciones.
- [SECURITY.md](SECURITY.md): estado de seguridad y auditoría.
- [AGENTS.md](AGENTS.md): convenciones para agentes de código.
