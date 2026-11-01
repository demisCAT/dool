/**
 * Opciones compartidas para las cookies de sesión de Supabase.
 *
 * `httpOnly` se mantiene en el valor por defecto de @supabase/ssr (false)
 * porque el panel usa el cliente de navegador para subir fotos a Storage.
 * Endurecerlo a true requiere mover esa subida a servidor (P1.3b).
 */
export const SUPABASE_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7, // 7 días
};
