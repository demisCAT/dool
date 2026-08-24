import { formatPrice } from "./format";
import type { CartItem, OrderForm } from "./types";

export function buildOrderMessage(
  items: CartItem[],
  form: OrderForm
): string {
  const lines = items.map(
    ({ product, qty }) => `• ${product.name} ×${qty} — ${formatPrice(product.price * qty)}`
  );

  const total = items.reduce((sum, { product, qty }) => sum + product.price * qty, 0);

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
