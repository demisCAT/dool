import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { createServiceClientInstance } from "@/lib/supabase/service";

const ORDER_SHORT_MAX = 5;
const ORDER_SHORT_WINDOW_SECONDS = 10 * 60;
const ORDER_HOURLY_MAX = 20;
const ORDER_HOURLY_WINDOW_SECONDS = 60 * 60;
const LOGIN_MAX = 10;
const LOGIN_WINDOW_SECONDS = 15 * 60;

interface RateLimitResult {
  allowed: boolean;
}

async function clientIp(): Promise<string> {
  const requestHeaders = await headers();
  // Vercel setea x-real-ip; en otros entornos se usa el primer
  // valor de x-forwarded-for. Evitar confiar en headers del cliente.
  const realIp = requestHeaders.get("x-real-ip")?.trim();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return realIp || forwarded || "unknown";
}

function hashKey(value: string): string | null {
  const secret =
    process.env.RATE_LIMIT_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  return createHmac("sha256", secret).update(value).digest("hex");
}

async function check(
  key: string,
  max: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const service = createServiceClientInstance();
  if (!service) return { allowed: true };

  const { data, error } = await service.rpc("check_rate_limit", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    // Fail-open: no bloquear ventas ni login si el limitador falla.
    console.error("Error en rate limit:", error.message);
    return { allowed: true };
  }

  const row = Array.isArray(data)
    ? (data[0] as { allowed?: boolean } | undefined)
    : undefined;
  return { allowed: row?.allowed !== false };
}

export async function checkOrderRateLimit(): Promise<RateLimitResult> {
  if (process.env.NODE_ENV !== "production") return { allowed: true };

  const ip = await clientIp();
  if (ip === "unknown") return { allowed: true };

  const hash = hashKey(`order:${ip}`);
  if (!hash) return { allowed: true };

  const short = await check(
    `${hash}:10m`,
    ORDER_SHORT_MAX,
    ORDER_SHORT_WINDOW_SECONDS
  );
  if (!short.allowed) return short;

  return check(`${hash}:1h`, ORDER_HOURLY_MAX, ORDER_HOURLY_WINDOW_SECONDS);
}

export async function checkLoginRateLimit(
  email: string
): Promise<RateLimitResult> {
  if (process.env.NODE_ENV !== "production") return { allowed: true };

  const ip = await clientIp();
  if (ip === "unknown") return { allowed: true };

  const hash = hashKey(`login:${ip}:${email.trim().toLowerCase()}`);
  if (!hash) return { allowed: true };

  return check(`${hash}:15m`, LOGIN_MAX, LOGIN_WINDOW_SECONDS);
}
