"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClientInstance } from "@/lib/supabase/server";
import type { CartItem, OrderForm } from "@/lib/types";

export async function signIn(
  _prev: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa correo y contraseña." };
  }

  const supabase = await createServerClientInstance();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Credenciales incorrectas. Intenta de nuevo." };
  }

  redirect("/admin");
}

export async function signOut() {
  const supabase = await createServerClientInstance();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

async function requireUser() {
  const supabase = await createServerClientInstance();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");
  return supabase;
}

function productImagePath(imageUrl: string): string | null {
  try {
    const url = new URL(imageUrl);
    const match = url.pathname.match(/\/storage\/v1\/object\/(?:sign\/)?public\/products\/(.+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export async function saveProduct(
  _prev: { error: string | null; ok?: boolean },
  formData: FormData
): Promise<{ error: string | null; ok?: boolean }> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const categoryId = String(formData.get("category_id") ?? "");
  const imageUrl = String(formData.get("image_url") ?? "").trim();
  const active = formData.get("active") === "on";
  const withSide = formData.get("with_side") === "on";
  const position = Number(formData.get("position") ?? 0);

  if (!name || !categoryId || !Number.isFinite(price) || price < 0) {
    return { error: "Completa nombre, categoría y un precio válido." };
  }

  try {
    const supabase = await requireUser();
    const payload = {
      name,
      description,
      price,
      category_id: categoryId,
      image_url: imageUrl || null,
      active,
      with_side: withSide,
      position,
    };

    const { error } = id
      ? await supabase.from("products").update(payload).eq("id", id)
      : await supabase.from("products").insert(payload);

    if (error) throw error;
  } catch (e) {
    return {
      error:
        e instanceof Error && e.message === "No autorizado"
          ? "Sesión vencida. Vuelve a iniciar sesión."
          : "No se pudo guardar el producto.",
    };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { error: null, ok: true };
}

export async function deleteProduct(id: string) {
  try {
    const supabase = await requireUser();
    const { data: product } = await supabase
      .from("products")
      .select("image_url")
      .eq("id", id)
      .single();

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;

    if (product?.image_url) {
      const path = productImagePath(product.image_url);
      if (path) {
        await supabase.storage.from("products").remove([path]);
      }
    }
  } catch {
    // silencioso: revalidate deja ver el estado real
  }
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function toggleProductActive(id: string, active: boolean) {
  try {
    const supabase = await requireUser();
    const { error } = await supabase
      .from("products")
      .update({ active })
      .eq("id", id);
    if (error) throw error;
  } catch {
    // silencioso: revalidate deja ver el estado real
  }
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function saveCategory(
  _prev: { error: string | null; ok?: boolean },
  formData: FormData
): Promise<{ error: string | null; ok?: boolean }> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Escribe un nombre para la categoría." };

  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  try {
    const supabase = await requireUser();
    const { error } = await supabase
      .from("categories")
      .insert({ name, slug });
    if (error) throw error;
  } catch (e) {
    return {
      error:
        e instanceof Error && e.message === "No autorizado"
          ? "Sesión vencida. Vuelve a iniciar sesión."
          : "No se pudo crear la categoría. ¿Ya existe?",
    };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { error: null, ok: true };
}

export async function deleteCategory(id: string) {
  try {
    const supabase = await requireUser();
    const { data: usedBy, error: countError } = await supabase
      .from("products")
      .select("id")
      .eq("category_id", id)
      .limit(1);
    if (countError) throw countError;
    if (usedBy && usedBy.length > 0) {
      revalidatePath("/");
      revalidatePath("/admin");
      return;
    }
    await supabase.from("categories").delete().eq("id", id);
  } catch {
    // silencioso
  }
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function saveSide(
  _prev: { error: string | null; ok?: boolean },
  formData: FormData
): Promise<{ error: string | null; ok?: boolean }> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const active = formData.get("active") === "on";
  const position = Number(formData.get("position") ?? 0);

  if (!name) {
    return { error: "Escribe un nombre para el acompañamiento." };
  }

  try {
    const supabase = await requireUser();
    const payload = { name, description, active, position };

    const { error } = id
      ? await supabase.from("sides").update(payload).eq("id", id)
      : await supabase.from("sides").insert(payload);

    if (error) throw error;
  } catch (e) {
    return {
      error:
        e instanceof Error && e.message === "No autorizado"
          ? "Sesión vencida. Vuelve a iniciar sesión."
          : "No se pudo guardar el acompañamiento.",
    };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { error: null, ok: true };
}

export async function deleteSide(id: string) {
  try {
    const supabase = await requireUser();
    const { error } = await supabase.from("sides").delete().eq("id", id);
    if (error) throw error;
  } catch {
    // silencioso
  }
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function toggleSideActive(id: string, active: boolean) {
  try {
    const supabase = await requireUser();
    const { error } = await supabase
      .from("sides")
      .update({ active })
      .eq("id", id);
    if (error) throw error;
  } catch {
    // silencioso
  }
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function submitOrder(
  items: CartItem[],
  form: OrderForm
): Promise<{ error: string | null }> {
  const name = form.name.trim();
  const phone = form.phone.trim();
  const deliveryDate = form.deliveryDate.trim();
  const note = form.note.trim();

  if (name.length < 2 || phone.replace(/\D/g, "").length < 8 || !deliveryDate) {
    return { error: "Completa nombre, teléfono y fecha de entrega." };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "Tu pedido está vacío." };
  }

  const total = items.reduce(
    (sum, i) => sum + Number(i.product.price) * Number(i.qty),
    0
  );

  const supabase = await createServerClientInstance();
  const { error } = await supabase.from("orders").insert({
    name,
    phone,
    delivery_date: deliveryDate,
    note,
    items,
    total,
    status: "pendiente",
  });

  if (error) {
    console.error("Error guardando pedido:", error.message);
    return { error: "No se pudo guardar el pedido. Intenta de nuevo." };
  }
  return { error: null };
}

export async function markOrderReceived(id: string) {
  try {
    const supabase = await requireUser();
    const { error } = await supabase
      .from("orders")
      .update({ status: "recibido" })
      .eq("id", id);
    if (error) throw error;
  } catch {
    // silencioso
  }
  revalidatePath("/admin");
}

export async function deleteOrder(id: string) {
  try {
    const supabase = await requireUser();
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) throw error;
  } catch {
    // silencioso
  }
  revalidatePath("/admin");
}

export async function saveSettings(
  _prev: { error: string | null; ok?: boolean },
  formData: FormData
): Promise<{ error: string | null; ok?: boolean }> {
  const pendingDays = Number(formData.get("pending_days") ?? 0);
  const receivedDays = Number(formData.get("received_days") ?? 0);

  if (
    !Number.isInteger(pendingDays) ||
    pendingDays < 1 ||
    !Number.isInteger(receivedDays) ||
    receivedDays < 1
  ) {
    return { error: "Los días deben ser números enteros mayores que 0." };
  }

  try {
    const supabase = await requireUser();
    const { error } = await supabase.from("settings").upsert([
      { key: "order_retention_pending_days", value: String(pendingDays) },
      { key: "order_retention_received_days", value: String(receivedDays) },
    ]);
    if (error) throw error;
  } catch (e) {
    return {
      error:
        e instanceof Error && e.message === "No autorizado"
          ? "Sesión vencida. Vuelve a iniciar sesión."
          : "No se pudieron guardar los ajustes.",
    };
  }

  revalidatePath("/admin");
  return { error: null, ok: true };
}
