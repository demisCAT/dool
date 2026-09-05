export function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(price);
}

export const WEEK_DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

export function formatDays(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  return sorted.map((d) => WEEK_DAYS[d]).join(" · ");
}
