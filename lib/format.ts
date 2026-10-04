export function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(price);
}

/** Convierte una fecha ISO (yyyy-MM-dd) a dd-MM-yyyy sin cambiar de zona horaria. */
export function formatWhatsAppDate(value: string): string {
  return value.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$3-$2-$1");
}

export function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
  return local.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function toDateKey(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return toDateKey(new Date().toISOString());
}
