export const ADDRESS = "Carlos Condell 1546, Puerto Natales, Chile";

// Enlace de búsqueda oficial de Google Maps (sin API key).
// encodeURIComponent escapa espacios y caracteres especiales.
export const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  ADDRESS
)}`;
