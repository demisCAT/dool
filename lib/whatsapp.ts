import { formatPrice, formatWhatsAppDate } from "./format";
import {
  deliveryFeeForDistance,
  effectiveUnitPrice,
  itemsTotal,
  orderTotal,
  type Pricing,
} from "./pricing";
import type { CartItem, OrderForm } from "./types";

/**
 * Acorta una dirección de Google Maps para el mensaje de WhatsApp:
 * elimina la comuna, la región y el país que vienen al final
 * ("Natales, Magallanes y la Antártica Chilena, Chile"), con o sin
 * código postal ("6160000 Natales") y cualquier variante de la región.
 */
function shortenDeliveryAddress(address: string): string {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  // Descarta desde el final los segmentos de comuna, región o país.
  while (parts.length > 1) {
    const last = parts[parts.length - 1].toLowerCase();
    const isLocalityPart =
      last.includes("natales") ||
      last.includes("magallanes") ||
      last.includes("antártica") ||
      last.includes("antartica") ||
      /^(chile|cl)$/.test(last);
    if (!isLocalityPart) break;
    parts.pop();
  }
  return parts.join(", ");
}

export function buildOrderMessage(
  items: CartItem[],
  form: OrderForm,
  pricing: Pricing,
  deliveryDistanceMeters: number | null = null
): string {
  const lines = items.map(({ product, qty, side }) => {
    const sideText = product.with_side
      ? side
        ? ` (con ${side.name})`
        : " (sin acompañamiento)"
      : "";
    const unit = effectiveUnitPrice(product, side, pricing);
    return `• ${product.name}${sideText} ×${qty} — ${formatPrice(unit * qty)}`;
  });

  const total = itemsTotal(items, pricing);
  const isDelivery = form.fulfillmentMode === "delivery";
  const deliveryFee =
    isDelivery && deliveryDistanceMeters !== null
      ? deliveryFeeForDistance(deliveryDistanceMeters, pricing)
      : 0;

  const rows = [
    "¡Hola Divina Natales! Quiero hacer un pedido:",
    "",
    ...lines,
    "",
    `Subtotal: ${formatPrice(total)}`,
    ...(isDelivery && deliveryDistanceMeters !== null
      ? [`Despacho a domicilio: ${formatPrice(deliveryFee ?? 0)}`]
      : []),
    `Total: ${formatPrice(
      orderTotal(items, pricing, form.fulfillmentMode, deliveryDistanceMeters)
    )}`,
    "",
    `Nombre: ${form.name}`,
    `Teléfono: ${form.phone}`,
    `Modalidad: ${isDelivery ? "Despacho a domicilio" : "Retiro en local"}`,
    ...(isDelivery
      ? [
          `Dirección de entrega: ${shortenDeliveryAddress(form.address)}${
            form.needsNearestAddress ? " (punto más cercano)" : ""
          }`,
        ]
      : []),
    `Fecha de ${isDelivery ? "entrega" : "retiro"}: ${formatWhatsAppDate(form.deliveryDate)}`,
  ];

  if (form.note.trim()) {
    rows.push(`Nota: ${form.note.trim()}`);
  }

  return rows.join("\n");
}

export function buildWhatsAppUrl(message: string): string {
  const phone = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
