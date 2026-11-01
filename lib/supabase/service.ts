import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con service_role para operaciones server-only que no pueden pasar
 * por RLS, como insertar un pedido ya validado en `submitOrder`.
 *
 * Nunca importar desde un componente cliente ni desde código que se ejecute
 * en el navegador. La clave vive solo en `SUPABASE_SERVICE_ROLE_KEY` y jamás
 * debe llevar el prefijo NEXT_PUBLIC_.
 */
export function createServiceClientInstance() {
  if (typeof window !== "undefined") {
    throw new Error("createServiceClientInstance solo puede usarse en el servidor");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
