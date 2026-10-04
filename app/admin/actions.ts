"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClientInstance } from "@/lib/supabase/server";
import { DELIVERY_ORIGIN } from "@/lib/location";
import {
  effectiveUnitPrice,
  orderTotal,
  parsePricing,
  NO_SIDE_DISCOUNT_KEY,
  DELIVERY_FEE_KEY,
  DELIVERY_FEE_OVER_2KM_KEY,
  deliveryFeeForDistance,
  type Pricing,
} from "@/lib/pricing";
import { straightLineDistanceMeters, type Coordinates } from "@/lib/distance";
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
    };

    if (id) {
      const { data: current } = await supabase
        .from("products")
        .select("category_id")
        .eq("id", id)
        .maybeSingle();

      // Si cambia de categoria, pasa al final de la nueva.
      const movedCategory =
        current && (current.category_id as string | null) !== categoryId;

      if (movedCategory) {
        const { data: maxRow } = await supabase
          .from("products")
          .select("position")
          .eq("category_id", categoryId)
          .order("position", { ascending: false })
          .limit(1)
          .maybeSingle();
        const position = ((maxRow?.position as number | undefined) ?? -1) + 1;
        const { error } = await supabase
          .from("products")
          .update({ ...payload, position })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
      }
    } else {
      const { data: maxRow } = await supabase
        .from("products")
        .select("position")
        .eq("category_id", categoryId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      const position = ((maxRow?.position as number | undefined) ?? -1) + 1;
      const { error } = await supabase
        .from("products")
        .insert({ ...payload, position });
      if (error) throw error;
    }
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

export async function toggleProductActive(
  id: string,
  active: boolean
): Promise<{ error: string | null }> {
  try {
    const supabase = await requireUser();
    const { error } = await supabase
      .from("products")
      .update({ active })
      .eq("id", id);
    if (error) throw error;
  } catch (e) {
    return {
      error:
        e instanceof Error && e.message === "No autorizado"
          ? "Sesión vencida. Vuelve a iniciar sesión."
          : "No se pudo actualizar la disponibilidad.",
    };
  }
  revalidatePath("/");
  revalidatePath("/admin");
  return { error: null };
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

    const { data: maxRow } = await supabase
      .from("categories")
      .select("position")
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const position = ((maxRow?.position as number | undefined) ?? -1) + 1;

    const { error } = await supabase
      .from("categories")
      .insert({ name, slug, position });
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

  if (!name) {
    return { error: "Escribe un nombre para el acompañamiento." };
  }

  try {
    const supabase = await requireUser();

    // Al crear, la posicion se asigna al final de la lista.
    // Al editar, se conserva la actual.
    let position = 0;
    if (!id) {
      const { data: maxRow } = await supabase
        .from("sides")
        .select("position")
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      position = ((maxRow?.position as number | undefined) ?? -1) + 1;
    }

    const { error } = id
      ? await supabase
          .from("sides")
          .update({ name, description, active })
          .eq("id", id)
      : await supabase
          .from("sides")
          .insert({ name, description, active, position });

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

export async function toggleSideActive(
  id: string,
  active: boolean
): Promise<{ error: string | null }> {
  try {
    const supabase = await requireUser();
    const { error } = await supabase
      .from("sides")
      .update({ active })
      .eq("id", id);
    if (error) throw error;
  } catch (e) {
    return {
      error:
        e instanceof Error && e.message === "No autorizado"
          ? "Sesión vencida. Vuelve a iniciar sesión."
          : "No se pudo actualizar el acompañamiento.",
    };
  }
  revalidatePath("/");
  revalidatePath("/admin");
  return { error: null };
}

type MoveDirection = "up" | "down";

// Renumera 0..n-1 solo las filas cuyo valor cambia.
async function persistOrder(
  supabase: Awaited<ReturnType<typeof requireUser>>,
  table: "sides" | "categories" | "products",
  orderedIds: string[]
): Promise<void> {
  const updates: PromiseLike<unknown>[] = [];
  orderedIds.forEach((id, index) => {
    updates.push(
      supabase.from(table).update({ position: index }).eq("id", id)
    );
  });
  await Promise.all(updates);
}

// Lee hermanos ordenados, mueve el id en la direccion pedida y persiste.
async function reorder(
  supabase: Awaited<ReturnType<typeof requireUser>>,
  table: "sides" | "categories" | "products",
  id: string,
  direction: MoveDirection,
  filter?: { column: string; value: string }
): Promise<boolean> {
  let query = supabase.from(table).select("id, position").order("position");
  if (filter) query = query.eq(filter.column, filter.value);
  const { data, error } = await query;
  if (error) throw error;

  const rows = (data as { id: string }[]) ?? [];
  const index = rows.findIndex((r) => r.id === id);
  if (index === -1) return false;

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= rows.length) return false;

  const ids = rows.map((r) => r.id);
  [ids[index], ids[target]] = [ids[target], ids[index]];
  await persistOrder(supabase, table, ids);
  return true;
}

export async function moveSide(
  id: string,
  direction: MoveDirection
): Promise<{ error: string | null }> {
  try {
    const supabase = await requireUser();
    await reorder(supabase, "sides", id, direction);
  } catch (e) {
    return {
      error:
        e instanceof Error && e.message === "No autorizado"
          ? "Sesión vencida. Vuelve a iniciar sesión."
          : "No se pudo reordenar el acompañamiento.",
    };
  }
  revalidatePath("/");
  revalidatePath("/admin");
  return { error: null };
}

export async function moveCategory(
  id: string,
  direction: MoveDirection
): Promise<{ error: string | null }> {
  try {
    const supabase = await requireUser();
    await reorder(supabase, "categories", id, direction);
  } catch (e) {
    return {
      error:
        e instanceof Error && e.message === "No autorizado"
          ? "Sesión vencida. Vuelve a iniciar sesión."
          : "No se pudo reordenar la categoría.",
    };
  }
  revalidatePath("/");
  revalidatePath("/admin");
  return { error: null };
}

export async function moveProduct(
  id: string,
  categoryId: string,
  direction: MoveDirection
): Promise<{ error: string | null }> {
  try {
    const supabase = await requireUser();
    await reorder(supabase, "products", id, direction, {
      column: "category_id",
      value: categoryId,
    });
  } catch (e) {
    return {
      error:
        e instanceof Error && e.message === "No autorizado"
          ? "Sesión vencida. Vuelve a iniciar sesión."
          : "No se pudo reordenar el producto.",
    };
  }
  revalidatePath("/");
  revalidatePath("/admin");
  return { error: null };
}

export async function submitOrder(
  items: CartItem[],
  form: OrderForm
): Promise<{
  error: string | null;
  pricing?: Pricing;
  deliveryQuote?: { address: string; distanceMeters: number; fee: number };
}> {
  const name = form.name.trim();
  const phone = form.phone.trim();
  const deliveryDate = form.deliveryDate.trim();
  const note = form.note.trim();
  const mode = form.fulfillmentMode;
  const placeId = mode === "delivery" ? String(form.deliveryPlaceId ?? "").trim() : "";
  let address = "";
  let deliveryDistanceMeters: number | null = null;

  if (
    name.length < 2 ||
    phone.replace(/\D/g, "").length < 8 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate) ||
    Number.isNaN(Date.parse(`${deliveryDate}T00:00:00Z`)) ||
    new Date(`${deliveryDate}T00:00:00Z`).toISOString().slice(0, 10) !== deliveryDate
  ) {
    return { error: "Completa nombre, teléfono y fecha de entrega." };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "Tu pedido está vacío." };
  }
  if (mode !== "pickup" && mode !== "delivery") {
    return { error: "Elige retiro en local o despacho a domicilio." };
  }
  if (mode === "delivery" && (!placeId || placeId.length > 512)) {
    return { error: "Busca y selecciona una dirección de las sugerencias de Google Maps." };
  }

  const supabase = await createServerClientInstance();

  // El descuento por "sin acompañamiento" se recalcula en el servidor:
  // nunca confiar en el total que llega desde el cliente.
  const { data: settingsRows, error: settingsError } = await supabase
    .from("settings")
    .select("key, value");
  if (settingsError) {
    return { error: "No se pudo calcular el total del pedido. Intenta de nuevo." };
  }
  const pricing = parsePricing(
    Object.fromEntries(
      (settingsRows ?? []).map((r: { key: string; value: string }) => [
        r.key,
        r.value,
      ])
    )
  );

  let deliveryQuote: { address: string; distanceMeters: number; fee: number } | undefined;
  if (mode === "delivery") {
    const serverMapsKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
    if (!serverMapsKey) {
      return { error: "El despacho por distancia no está configurado. Elige retiro en local." };
    }

    const destination = await resolveDeliveryPlace(placeId, serverMapsKey);
    if (!destination) {
      return {
        error:
          "No pudimos validar esa dirección. Si tu dirección exacta no aparece, selecciona el punto más cercano que sí aparezca y describe tu dirección real en la nota.",
      };
    }

    address = destination.address;
    deliveryDistanceMeters = straightLineDistanceMeters(DELIVERY_ORIGIN, destination.coordinates);
    const fee = deliveryFeeForDistance(deliveryDistanceMeters, pricing);
    if (fee === null) {
      return { error: "Falta configurar en el panel la Tarifa 2 para distancias mayores a 2 km." };
    }
    deliveryQuote = { address, distanceMeters: deliveryDistanceMeters, fee };
  }

  const deliveryFee = deliveryQuote?.fee ?? 0;
  const total = orderTotal(items, pricing, mode, deliveryDistanceMeters);

  const { error } = await supabase.from("orders").insert({
    name,
    phone,
    delivery_date: deliveryDate,
    fulfillment_mode: mode,
    address,
    delivery_fee: deliveryFee,
    delivery_distance_m: deliveryDistanceMeters,
    note,
    items: items.map((item) => ({
      ...item,
      unit_price: effectiveUnitPrice(item.product, item.side, pricing),
    })),
    total,
    status: "pendiente",
  });

  if (error) {
    console.error("Error guardando pedido:", error.message);
    return { error: "No se pudo guardar el pedido. Intenta de nuevo." };
  }
  return { error: null, pricing, deliveryQuote };
}

async function resolveDeliveryPlace(
  placeId: string,
  apiKey: string
): Promise<{ address: string; coordinates: Coordinates } | null> {
  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=es&regionCode=CL`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "formattedAddress,location,addressComponents",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!response.ok) return null;

    const place = (await response.json()) as {
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
      addressComponents?: Array<{ types?: string[]; shortText?: string }>;
    };
    const country = place.addressComponents?.find((component) =>
      component.types?.includes("country")
    );
    const latitude = place.location?.latitude;
    const longitude = place.location?.longitude;
    if (
      country?.shortText !== "CL" ||
      !place.formattedAddress ||
      latitude === undefined ||
      longitude === undefined ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return null;
    }

    return {
      address: place.formattedAddress,
      coordinates: { latitude, longitude },
    };
  } catch {
    return null;
  }
}

export async function saveDeliveryFee(
  _prev: { error: string | null; ok?: boolean },
  formData: FormData
): Promise<{ error: string | null; ok?: boolean }> {
  const firstValue = String(formData.get("delivery_fee") ?? "");
  const secondValue = String(formData.get("delivery_fee_over_2km") ?? "");
  const fee = Number(firstValue);
  const feeOver2Km = Number(secondValue);
  if (
    !firstValue.trim() ||
    !secondValue.trim() ||
    !Number.isSafeInteger(fee) ||
    fee < 0 ||
    !Number.isSafeInteger(feeOver2Km) ||
    feeOver2Km < 0
  ) {
    return { error: "Ambas tarifas deben ser montos enteros en pesos (0 o más)." };
  }

  try {
    const supabase = await requireUser();
    const { error } = await supabase.from("settings").upsert([
      { key: DELIVERY_FEE_KEY, value: String(fee) },
      { key: DELIVERY_FEE_OVER_2KM_KEY, value: String(feeOver2Km) },
    ]);
    if (error) throw error;
  } catch (e) {
    return {
      error:
        e instanceof Error && e.message === "No autorizado"
          ? "Sesión vencida. Vuelve a iniciar sesión."
          : "No se pudieron guardar las tarifas de despacho.",
    };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { error: null, ok: true };
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

export async function saveNoSideDiscount(
  _prev: { error: string | null; ok?: boolean },
  formData: FormData
): Promise<{ error: string | null; ok?: boolean }> {
  const raw = Number(formData.get("no_side_discount") ?? 0);

  if (!Number.isInteger(raw) || raw < 0) {
    return { error: "El descuento debe ser un número entero en pesos (0 o más)." };
  }

  try {
    const supabase = await requireUser();
    const { error } = await supabase
      .from("settings")
      .upsert([{ key: NO_SIDE_DISCOUNT_KEY, value: String(raw) }]);
    if (error) throw error;
  } catch (e) {
    return {
      error:
        e instanceof Error && e.message === "No autorizado"
          ? "Sesión vencida. Vuelve a iniciar sesión."
          : "No se pudo guardar el descuento.",
    };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { error: null, ok: true };
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
