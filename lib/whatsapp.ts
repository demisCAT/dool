import { formatPrice } from "./format";
import { effectiveUnitPrice, itemsTotal, type Pricing } from "./pricing";
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

  const rows = [
    "¡Hola Divina Natales! Quiero hacer un pedido:",
    "",
    ...lines,
    "",
    `Total: ${formatPrice(total)}`,
    "",
    `Nombre: ${form.name}`,
    `Teléfono: ${form.phone}`,
    `Fecha de entrega: ${form.deliveryDate}`,
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
