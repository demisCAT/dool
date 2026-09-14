import { redirect } from "next/navigation";
import { createServerClientInstance } from "@/lib/supabase/server";
import { getStoreData } from "@/lib/supabase/queries";
import { AdminPanel } from "@/components/admin/admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const hasEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!hasEnv) {
    return (
      <div className="paper-grain flex flex-1 items-center justify-center px-5 py-16">
        <div className="max-w-md rounded-lg bg-paper p-8 text-center shadow-lg shadow-ink/10">
          <h1 className="font-display text-2xl text-pine">
            Falta configurar Supabase
          </h1>
          <p className="mt-3 text-ink/65">
            Copia .env.example a .env.local, crea tu proyecto en supabase.com,
            ejecuta supabase/schema.sql y completa las variables.
          </p>
          <a
            href="/admin/login"
            className="mt-5 inline-flex h-11 items-center rounded-full bg-pine px-6 font-bold text-chalk transition-colors hover:bg-pine-deep"
          >
            Reintentar
          </a>
        </div>
      </div>
    );
  }

  const supabase = await createServerClientInstance();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { categories } = await getStoreData();

  const { data: allProducts } = await supabase
    .from("products")
    .select("id, category_id, name, description, price, image_url, active, with_side, position")
    .order("position");

  const { data: allSides } = await supabase
    .from("sides")
    .select("id, name, description, active, position")
    .order("position");

  await supabase.rpc("cleanup_expired_orders");

  const { data: allOrders } = await supabase
    .from("orders")
    .select("id, name, phone, delivery_date, note, items, total, status, created_at")
    .order("created_at", { ascending: false });

  const { data: settingsRows } = await supabase
    .from("settings")
    .select("key, value");

  const settingsMap = Object.fromEntries(
    (settingsRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value])
  );

  const settings = {
    pendingDays: Number(settingsMap["order_retention_pending_days"] ?? 5),
    receivedDays: Number(settingsMap["order_retention_received_days"] ?? 30),
  };

  return (
    <AdminPanel
      categories={categories}
      products={allProducts ?? []}
      sides={allSides ?? []}
      orders={allOrders ?? []}
      settings={settings}
      adminEmail={user.email ?? ""}
    />
  );
}
