import type { CartItem, Product, Side } from "./types";
import {
  ORDER_CUTOFF_HOUR_DEFAULT,
  ORDER_CUTOFF_HOUR_MAX,
  ORDER_CUTOFF_HOUR_MIN,
  ORDER_MAX_DAYS_DEFAULT,
  ORDER_MAX_DAYS_MAX,
  ORDER_MAX_DAYS_MIN,
} from "./order-date";

// Descuento aplicado cuando un plato que normalmente lleva acompañamiento
// se pide "sin acompañamiento". Es un monto fijo en CLP, configurable en el admin.
export interface Pricing {
  noSideDiscount: number;
  /** Tarifa hasta 2 km, inclusive. */
  deliveryFee: number;
  /** Tarifa para distancias mayores a 2 km; null significa no configurada. */
  deliveryFeeOver2Km: number | null;
  /** Radio máximo de despacho en metros, medido en línea recta. */
  deliveryMaxDistanceMeters: number;
  /** Hora local (0–23) después de la cual no se acepta entrega el mismo día. */
  orderCutoffHour: number;
  /** Días máximos hacia adelante para la fecha de entrega. */
  orderMaxDays: number;
}

export const NO_SIDE_DISCOUNT_KEY = "no_side_discount";
export const DELIVERY_FEE_KEY = "delivery_fee";
export const DELIVERY_FEE_OVER_2KM_KEY = "delivery_fee_over_2km";
export const DELIVERY_MAX_DISTANCE_KEY = "delivery_max_distance_m";
export const ORDER_CUTOFF_HOUR_KEY = "order_cutoff_hour";
export const ORDER_MAX_DAYS_KEY = "order_max_days";
export const DELIVERY_TARIFF_THRESHOLD_METERS = 2000;
export const DELIVERY_MAX_DISTANCE_DEFAULT_METERS = 10_000;
export const DELIVERY_MAX_DISTANCE_MIN_KM = 1;
export const DELIVERY_MAX_DISTANCE_MAX_KM = 100;

function nonNegativeInteger(value: string | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function positiveIntegerOrDefault(
  value: string | undefined,
  fallback: number
): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function boundedIntegerOrDefault(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max
    ? parsed
    : fallback;
}

export function parsePricing(map: Record<string, string>): Pricing {
  const over2KmValue = map[DELIVERY_FEE_OVER_2KM_KEY];
  return {
    noSideDiscount: nonNegativeInteger(map[NO_SIDE_DISCOUNT_KEY]),
    deliveryFee: nonNegativeInteger(map[DELIVERY_FEE_KEY]),
    deliveryFeeOver2Km:
      over2KmValue === undefined ? null : nonNegativeInteger(over2KmValue),
    deliveryMaxDistanceMeters: positiveIntegerOrDefault(
      map[DELIVERY_MAX_DISTANCE_KEY],
      DELIVERY_MAX_DISTANCE_DEFAULT_METERS
    ),
    orderCutoffHour: boundedIntegerOrDefault(
      map[ORDER_CUTOFF_HOUR_KEY],
      ORDER_CUTOFF_HOUR_DEFAULT,
      ORDER_CUTOFF_HOUR_MIN,
      ORDER_CUTOFF_HOUR_MAX
    ),
    orderMaxDays: boundedIntegerOrDefault(
      map[ORDER_MAX_DAYS_KEY],
      ORDER_MAX_DAYS_DEFAULT,
      ORDER_MAX_DAYS_MIN,
      ORDER_MAX_DAYS_MAX
    ),
  };
}

/** True cuando la distancia está dentro del radio de despacho configurado. */
export function isWithinDeliveryRadius(
  distanceMeters: number,
  pricing: Pricing
): boolean {
  return distanceMeters <= pricing.deliveryMaxDistanceMeters;
}

export function deliveryFeeForDistance(
  distanceMeters: number,
  pricing: Pricing
): number | null {
  return distanceMeters > DELIVERY_TARIFF_THRESHOLD_METERS
    ? pricing.deliveryFeeOver2Km
    : pricing.deliveryFee;
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
  fulfillmentMode: "pickup" | "delivery" | "",
  deliveryDistanceMeters: number | null = null
): number {
  return itemsTotal(items, pricing) +
    (fulfillmentMode === "delivery" &&
    deliveryDistanceMeters !== null &&
    isWithinDeliveryRadius(deliveryDistanceMeters, pricing)
      ? (deliveryFeeForDistance(deliveryDistanceMeters, pricing) ?? 0)
      : 0);
}
