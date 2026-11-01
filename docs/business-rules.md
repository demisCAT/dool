# Reglas de negocio — Divina Natales

Reglas de pedido, precios, despacho y fechas tal como están implementadas. El código de referencia está en `lib/pricing.ts`, `lib/distance.ts`, `lib/location.ts`, `lib/order-date.ts`, `lib/whatsapp.ts` y `app/admin/actions.ts` (`submitOrder`).

## Catálogo y carrito

- Se muestran solo productos **activos**, agrupados por categoría. La pizarra del inicio muestra hasta **8 platos principales activos** (categoría con slug `platos-principales`), por posición. Si no hay, muestra un aviso, no productos ficticios.
- Las fotografías del menú se sirven mediante `next/image`.
- El carrito persiste en `localStorage`, con variantes por acompañamiento y cantidades. Se conserva hasta que el cliente confirma el envío.
- Para platos marcados «con acompañamiento», el cliente elige una opción activa o «Sin acompañamiento». Esta última aplica un **descuento fijo global por unidad**, configurable en admin; el precio nunca baja de $0.

## Formulario de pedido

Campos obligatorios: nombre, teléfono, fecha y modalidad (retiro en local o despacho a domicilio). Para despacho se selecciona además una dirección sugerida por Google Maps.

### Fecha de entrega

- Hora de corte (`order_cutoff_hour`, 0–23, default 16) y días máximos (`order_max_days`, 1–30, default 5), configurables en Admin > Pedidos.
- La fecha admite desde hoy (o mañana si ya pasó la hora de corte) hasta los días máximos.
- Se evalúa en `America/Punta_Arenas`, en cliente y servidor.
- El formulario incluye un honeypot `website` que debe quedar vacío; `submitOrder` lo rechaza antes de llamar a Google o Supabase.

### Despacho

- La distancia es la recta (Haversine) desde el pin fijo del local (`DELIVERY_ORIGIN` en `lib/location.ts`).
- Hasta 2.000 m inclusive se aplica **Tarifa 1**; cualquier distancia superior usa **Tarifa 2**.
- Radio máximo configurable en km enteros (1–100, default 10 km; se guarda como `delivery_max_distance_m`). Fuera de radio se bloquea el envío en el cliente y `submitOrder` rechaza el pedido; solo se ofrece retiro en local.
- Tarifa 2 (`delivery_fee_over_2km`) queda sin configurar hasta guardarla en admin. Mientras falte, no se aceptan despachos de más de 2 km.
- Las sugerencias de dirección están restringidas a Chile y sesgadas alrededor del local. No se usa un polígono comunal. El radio se valida al seleccionar la dirección y se repite en el servidor.
- No se acepta texto libre sin selección de una sugerencia válida.

### Número de calle

- Se prellena con el `street_number` de Google y se puede corregir o escribir si falta.
- `isValidDeliveryNumber` (`lib/location.ts`) trata `S/N` y valores no numéricos como sin número. El servidor repite la validación.
- Si no hay número **no se calcula la tarifa**: el pedido se guarda con `delivery_fee = 0` y `delivery_fee_pending = true`. El total muestra solo los productos, la nota pasa a ser opcional (para describir la dirección real) y dirección y tarifa se confirman por WhatsApp.
- Un número escrito por el cliente habilita el cálculo aunque Google no lo traiga.

## Guardado del pedido

1. El navegador muestra una estimación de distancia/tarifa y bloquea el envío fuera de radio.
2. `submitOrder` valida el honeypot, la fecha y la modalidad.
3. Vuelve a consultar el Place ID con Places API (New) en el servidor, recalcula distancia y tarifa, y rechaza direcciones fuera de radio.
4. **Reconstruye ítems y precios desde `products`/`sides`**, recalcula descuento, tarifa y total; no confía en datos del cliente.
5. Inserta en `orders` con `lib/supabase/service.ts` (service_role, solo servidor). No hay insert anónimo directo.
6. El cliente abre WhatsApp (`wa.me`) y confirma manualmente si lo envió.

`orders` conserva modalidad (`fulfillment_mode`), dirección canónica, `delivery_distance_m`, `delivery_fee` aplicada, `delivery_fee_pending`, `items` (JSON) y `total`.

## Mensaje de WhatsApp

Armado en `lib/whatsapp.ts`. Incluye modalidad, dirección cuando corresponde, desglose, distancia recta y tarifa, total y fecha en formato `dd-MM-yyyy`. El número del negocio se toma de `NEXT_PUBLIC_WHATSAPP_NUMBER` y no se renderiza en HTML estático: `components/store/phone-contact.tsx` lo revela solo al hacer clic.

## Dirección del local

Carlos Condell 1546, Puerto Natales, Chile, con enlace a Google Maps en «Cómo pedir» y en el pie de página.

## Limpieza de pedidos

Los pedidos vencidos se eliminan al abrir el admin y mediante un cron diario de Vercel (`/api/cron/cleanup-orders`, protegido con `CRON_SECRET`).

## Costos de Google

Places se factura por SKU y tiene cupos gratuitos mensuales. Esta implementación solicita detalles en el navegador para previsualizar y los vuelve a validar en el servidor al enviar. No se llama a Routes API. Configura cuotas y alertas de presupuesto en Google Cloud. Ver [precios oficiales](https://developers.google.com/maps/billing-and-pricing/pricing) y [precios de sesión de Places](https://developers.google.com/maps/documentation/places/web-service/session-pricing).
