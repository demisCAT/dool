export const BUSINESS_TIME_ZONE = "America/Punta_Arenas";
export const ORDER_CUTOFF_HOUR_DEFAULT = 16;
export const ORDER_MAX_DAYS_DEFAULT = 5;
export const ORDER_CUTOFF_HOUR_MIN = 0;
export const ORDER_CUTOFF_HOUR_MAX = 23;
export const ORDER_MAX_DAYS_MIN = 1;
export const ORDER_MAX_DAYS_MAX = 30;

interface TimeZoneParts {
  year: string;
  month: string;
  day: string;
  hour: number;
}

function partsInTimeZone(date: Date, timeZone: string): TimeZoneParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: Number(value("hour")) % 24,
  };
}

/** Fecha YYYY-MM-DD en la zona horaria del negocio. */
export function dateKeyInTimeZone(date: Date): string {
  const { year, month, day } = partsInTimeZone(date, BUSINESS_TIME_ZONE);
  return `${year}-${month}-${day}`;
}

/** Hora local (0–23) en la zona horaria del negocio. */
export function hourInTimeZone(date: Date): number {
  return partsInTimeZone(date, BUSINESS_TIME_ZONE).hour;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

/**
 * Ventana de fechas de entrega:
 * - máximo hoy + 5 días;
 * - después de las 16:00 locales no se acepta el mismo día.
 */
export function deliveryDateWindow(
  now = new Date(),
  options?: { cutoffHour?: number; maxDays?: number }
): {
  minDate: string;
  maxDate: string;
  cutoffApplied: boolean;
} {
  const cutoffHour = options?.cutoffHour ?? ORDER_CUTOFF_HOUR_DEFAULT;
  const maxDays = options?.maxDays ?? ORDER_MAX_DAYS_DEFAULT;
  const today = dateKeyInTimeZone(now);
  const cutoffApplied = hourInTimeZone(now) >= cutoffHour;

  return {
    minDate: cutoffApplied ? addDaysToDateKey(today, 1) : today,
    maxDate: addDaysToDateKey(today, maxDays),
    cutoffApplied,
  };
}
