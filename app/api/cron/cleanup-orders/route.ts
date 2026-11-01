import { timingSafeEqual } from "node:crypto";
import { createServerClientInstance } from "@/lib/supabase/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function isValidBearerToken(
  authHeader: string | null,
  expectedSecret: string | undefined
): boolean {
  if (!authHeader || !expectedSecret) return false;

  const provided = Buffer.from(authHeader);
  const expected = Buffer.from(`Bearer ${expectedSecret}`);
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

export async function GET(request: Request) {
  if (
    !isValidBearerToken(
      request.headers.get("authorization"),
      process.env.CRON_SECRET
    )
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = await createServerClientInstance();
  const { error } = await supabase.rpc("cleanup_expired_orders");

  if (error) {
    console.error("Error limpiando pedidos vencidos:", error.message);
    return new Response("Internal Server Error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}