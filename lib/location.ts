import type { Coordinates } from "@/lib/distance";

export const ADDRESS = "Carlos Condell 1546, Puerto Natales, Chile";
export const DELIVERY_ORIGIN: Coordinates = {
  latitude: -51.736551,
  longitude: -72.490947,
};

// Enlace de búsqueda oficial de Google Maps (sin API key).
// encodeURIComponent escapa espacios y caracteres especiales.
export const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  ADDRESS
)}`;
