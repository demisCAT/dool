# Divina Natales

Tienda web de comida casera para llevar. Los clientes eligen sus platos, completan sus datos de contacto y el pedido se envía armado a WhatsApp. Incluye panel de administración para gestionar productos, categorías y fotografías.

## Funcionalidades

**Tienda**

- Catálogo de productos agrupados por categorías, con fotografías y precios en CLP
- Carrito de compras persistente (localStorage)
- Formulario de contacto: nombre, teléfono, fecha de entrega y nota
- Envío del pedido a WhatsApp con mensaje pre-armado (nombre, items, total y datos)

**Administración (`/admin`)**

- Login con correo y contraseña (Supabase Auth)
- Alta, edición y borrado de productos
- Subida de fotografías con vista previa
- Productos ocultos/visibles y orden de aparición
- Gestión de categorías

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Server Actions, Tailwind CSS 4)
- [Supabase](https://supabase.com): PostgreSQL, Auth y Storage de imágenes
- WhatsApp: enlace `wa.me` (sin API, sin costo)

## Configuración

### 1. Crear el proyecto en Supabase

1. Crea una cuenta y un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor → New query**, pega y ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql). Crea las tablas, las políticas de seguridad y el bucket de fotos.

### 2. Variables de entorno

Copia el archivo de ejemplo y completa los valores:

```bash
cp .env.example .env.local
```

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto (Settings → API → Project URL) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (Settings → API → anon public) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número del negocio solo con dígitos, con código de país. Ej. Chile: `56912345678` |

### 3. Crear la cuenta de administrador

1. En Supabase: **Authentication → Users → Add user** y crea tu usuario con correo y contraseña.
2. Recomendado: en **Authentication → Providers → Email**, desactiva "Enable email signups" para que nadie más pueda registrarse.
3. Entra a `/admin` y usa esas credenciales.

## Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). El panel de administración está en `/admin`.

## Producción

```bash
npm run build
npm run start
```

También puedes desplegar en [Vercel](https://vercel.com): importa el repositorio y configura las mismas variables de entorno en el panel del proyecto.

## Estructura

```
app/
  page.tsx               # Tienda (server component)
  admin/                 # Panel de administración (login + CRUD)
  globals.css            # Tokens de diseño (pino, ámbar, kraft) y animaciones
components/
  store/                 # Header, hero, pizarra, menú, carrito, pedido, footer
  admin/                 # Panel con formularios y subida de fotos
lib/
  supabase/              # Clientes (servidor/navegador) y consultas
  types.ts               # Tipos compartidos
  whatsapp.ts            # Armado del mensaje y enlace wa.me
supabase/schema.sql      # Tablas, RLS y bucket de imágenes
```
