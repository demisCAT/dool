import { formatPrice, formatWhatsAppDate } from "./format";
import { effectiveUnitPrice, itemsTotal, orderTotal, type Pricing } from "./pricing";
import type { CartItem, OrderForm } from "./types";

export function buildOrderMessage(
  items: CartItem[],
  form: OrderForm,
  pricing: Pricing
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

  const rows = [
    "¡Hola Divina Natales! Quiero hacer un pedido:",
    "",
    ...lines,
    "",
    `Subtotal: ${formatPrice(total)}`,
    ...(isDelivery ? [`Despacho a domicilio: ${formatPrice(pricing.deliveryFee)}`] : []),
    `Total: ${formatPrice(orderTotal(items, pricing, form.fulfillmentMode))}`,
    "",
    `Nombre: ${form.name}`,
    `Teléfono: ${form.phone}`,
    `Modalidad: ${isDelivery ? "Despacho a domicilio" : "Retiro en local"}`,
    ...(isDelivery ? [`Dirección de entrega: ${form.address.trim()}`] : []),
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
