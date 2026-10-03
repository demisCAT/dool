import type { CartItem, Product, Side } from "./types";

// Descuento aplicado cuando un plato que normalmente lleva acompañamiento
// se pide "sin acompañamiento". Es un monto fijo en CLP, configurable en el admin.
export interface Pricing {
  noSideDiscount: number;
}

export const NO_SIDE_DISCOUNT_KEY = "no_side_discount";

export function parsePricing(map: Record<string, string>): Pricing {
  const raw = Number(map[NO_SIDE_DISCOUNT_KEY] ?? 0);
  return {
    noSideDiscount: Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0,
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
