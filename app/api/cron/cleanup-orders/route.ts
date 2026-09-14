import { createServerClientInstance } from "@/lib/supabase/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!expected || authHeader !== `Bearer ${expected}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = await createServerClientInstance();
  const { error } = await supabase.rpc("cleanup_expired_orders");

  if (error) {
    console.error("Error limpiando pedidos vencidos:", error.message);
    return new Response(error.message, { status: 500 });
  }

  return new Response("ok", { status: 200 });
}