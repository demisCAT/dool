# Guía del panel de administración

El panel está en `/admin`. El acceso usa Supabase Auth; sin variables de Supabase se muestra una pantalla de configuración.

## Primer uso

1. Crea el usuario en Supabase → Authentication → Users (confirma el correo) y desactiva los registros públicos por email si no los necesitas.
2. Entra a `/admin` con ese usuario.
3. Configura «Descuento sin acompañamiento» en **Acompañamientos** y, en **Pedidos**, ambas tarifas y la distancia máxima de despacho. Tarifa 2 queda sin configurar hasta guardarla; no se aceptan despachos de más de 2 km mientras falte.
4. Agrega y activa productos; marca «con acompañamiento» solo donde corresponda.

Todos los usuarios de admin tienen los mismos permisos.

## Secciones

### Productos

- Alta, edición, borrado, disponibilidad y fotografías (Storage público); selección de categoría y acompañamiento.
- Al filtrar por categoría, los productos aparecen en el orden de la tienda y se reordenan con flechas. Columnas: Orden · Disp. · Foto · Producto · Precio · Acomp. · Acciones.
- En «Todas» se listan alfabéticamente. La fotografía se muestra en todos los filtros.
- Fotos: JPG, PNG, WebP o AVIF, máximo 5 MB.

### Categorías

Gestión y orden manual mediante flechas. Borrar una categoría elimina también sus productos.

### Acompañamientos

- Gestión y orden manual mediante flechas; cada acompañamiento tiene disponibilidad independiente.
- Ajuste global **Descuento sin acompañamiento** en CLP (0 lo desactiva).

### Pedidos

- Listado con estado, modalidad, dirección, distancia recta, tarifa aplicada y total. Filtro por fecha, «Marcar recibido» y «Borrar».
- Los pedidos sin número de calle muestran «Tarifa por confirmar» y un aviso para confirmar número, referencias y tarifa por WhatsApp.
- Después del listado hay tres bloques de ajustes:
  - **Vencimiento de pedidos**.
  - **Tarifas de despacho**: Tarifa 1 (≤2 km), Tarifa 2 (>2 km) y distancia máxima en km enteros.
  - **Fechas de entrega**: hora de corte (0–23) y días máximos (1–30).
- Los pedidos vencidos se limpian al abrir el admin y con el cron diario de Vercel.

Las reglas detrás de estos ajustes están en [business-rules.md](business-rules.md).
