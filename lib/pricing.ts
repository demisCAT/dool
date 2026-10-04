import type { CartItem, Product, Side } from "./types";

// Descuento aplicado cuando un plato que normalmente lleva acompañamiento
// se pide "sin acompañamiento". Es un monto fijo en CLP, configurable en el admin.
export interface Pricing {
  noSideDiscount: number;
  deliveryFee: number;
}

export const NO_SIDE_DISCOUNT_KEY = "no_side_discount";
export const DELIVERY_FEE_KEY = "delivery_fee";

function nonNegativeInteger(value: string | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

export function parsePricing(map: Record<string, string>): Pricing {
  return {
    noSideDiscount: nonNegativeInteger(map[NO_SIDE_DISCOUNT_KEY]),
    deliveryFee: nonNegativeInteger(map[DELIVERY_FEE_KEY]),
  };
}

/** True cuando el descuento aplica a este producto con este acompañamiento. */
export function hasNoSideDiscount(
  product: Product,
  side: Side | null | undefined
): boolean {
  return product.with_side && !side;
}

/** Precio unitario efectivo, nunca negativo. */
export function effectiveUnitPrice(
  product: Product,
  side: Side | null | undefined,
  pricing: Pricing
): number {
  if (!hasNoSideDiscount(product, side)) return product.price;
  return Math.max(0, product.price - pricing.noSideDiscount);
}

/** Monto descontado por unidad (0 si no aplica). */
export function unitDiscount(
  product: Product,
  side: Side | null | undefined,
  pricing: Pricing
): number {
  return product.price - effectiveUnitPrice(product, side, pricing);
}

export function itemsTotal(items: CartItem[], pricing: Pricing): number {
  return items.reduce(
    (sum, i) => sum + effectiveUnitPrice(i.product, i.side, pricing) * i.qty,
    0
  );
}

/** La tarifa se cobra una sola vez por pedido, no por producto. */
export function orderTotal(
  items: CartItem[],
  pricing: Pricing,
  fulfillmentMode: "pickup" | "delivery" | ""
): number {
  return itemsTotal(items, pricing) +
    (fulfillmentMode === "delivery" ? pricing.deliveryFee : 0);
}
