import type { Coordinates } from "@/lib/distance";

export const ADDRESS = "Carlos Condell 1546, Puerto Natales, Chile";
export const DELIVERY_ORIGIN: Coordinates = {
  latitude: -51.736551,
  longitude: -72.490947,
};

/**
 * Número de calle: 1 a 6 dígitos, con letra o guion opcional
 * (ej. 1546, 1546 B, 1546-B). Sin número se usa la nota del pedido.
 */
export const DELIVERY_NUMBER_PATTERN = /^\d{1,6}(?:[\s-]?[A-Za-z])?$/;

export function isValidDeliveryNumber(value: string): boolean {
  return DELIVERY_NUMBER_PATTERN.test(value.trim());
}

// Enlace de búsqueda oficial de Google Maps (sin API key).
// encodeURIComponent escapa espacios y caracteres especiales.
export const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  ADDRESS
)}`;
