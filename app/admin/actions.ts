"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClientInstance } from "@/lib/supabase/server";
import { createServiceClientInstance } from "@/lib/supabase/service";
import { DELIVERY_ORIGIN, isValidDeliveryNumber } from "@/lib/location";
import {
  effectiveUnitPrice,
  orderTotal,
  parsePricing,
  NO_SIDE_DISCOUNT_KEY,
  DELIVERY_FEE_KEY,
  DELIVERY_FEE_OVER_2KM_KEY,
  DELIVERY_MAX_DISTANCE_KEY,
  DELIVERY_MAX_DISTANCE_MIN_KM,
  DELIVERY_MAX_DISTANCE_MAX_KM,
  deliveryFeeForDistance,
  isWithinDeliveryRadius,
  type Pricing,
} from "@/lib/pricing";
import {
  formatDistance,
  straightLineDistanceMeters,
  type Coordinates,
} from "@/lib/distance";
import { formatWhatsAppDate } from "@/lib/format";
import { deliveryDateWindow } from "@/lib/order-date";
import type { CartItem, OrderForm, Product, Side } from "@/lib/types";

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return null;
    const expectedOrigin = new URL(supabaseUrl).origin;
    const url = new URL(imageUrl);
    if (url.origin !== expectedOrigin) return null;
    const match = url.pathname.match(
      /^\/storage\/v1\/object\/(?:sign\/)?public\/products\/([A-Za-z0-9._-]+)$/
    );
    return match && !match[1].includes("..") ? match[1] : null;
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
  if (imageUrl && !productImagePath(imageUrl)) {
    return { error: "La URL de la fotografía no es válida." };
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

/**
 * Reconstruye los ítems del pedido desde la base de datos. El navegador solo
 * aporta IDs y cantidades; precios, nombres y disponibilidad se leen de
 * `products`/`sides` para que un cliente no pueda alterar el total.
 */
async function resolveOrderItems(
  supabase: Awaited<ReturnType<typeof createServerClientInstance>>,
  rawItems: unknown
): Promise<{ items: CartItem[] } | { error: string }> {
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 50) {
    return { error: "Tu pedido está vacío o tiene demasiados productos." };
  }

  const parsed: { productId: string; sideId: string | null; qty: number }[] = [];
  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") {
      return { error: "Hay un producto inválido en tu pedido." };
    }
    const item = raw as { product?: unknown; side?: unknown; qty?: unknown };
    const product = item.product as { id?: unknown } | null;
    const productId =
      product && typeof product.id === "string" ? product.id.trim() : "";
    const qty = item.qty;
    if (
      !productId ||
      productId.length > 64 ||
      !Number.isSafeInteger(qty) ||
      (qty as number) < 1 ||
      (qty as number) > 99
    ) {
      return { error: "Hay un producto o una cantidad inválida en tu pedido." };
    }

    let sideId: string | null = null;
    if (item.side !== null && item.side !== undefined) {
      const side = item.side as { id?: unknown };
      if (
        typeof side.id !== "string" ||
        !side.id.trim() ||
        side.id.length > 64
      ) {
        return { error: "Hay un acompañamiento inválido en tu pedido." };
      }
      sideId = side.id.trim();
    }

    parsed.push({ productId, sideId, qty: qty as number });
  }

  const productIds = [...new Set(parsed.map((item) => item.productId))];
  const sideIds = [
    ...new Set(
      parsed
        .map((item) => item.sideId)
        .filter((id): id is string => id !== null)
    ),
  ];

  const [productsResult, sidesResult] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, category_id, name, description, price, image_url, active, with_side, position"
      )
      .in("id", productIds)
      .eq("active", true),
    sideIds.length > 0
      ? supabase
          .from("sides")
          .select("id, name, description, active, position")
          .in("id", sideIds)
          .eq("active", true)
      : Promise.resolve({ data: [] as Side[], error: null }),
  ]);

  if (productsResult.error || sidesResult.error) {
    return { error: "No se pudo validar el pedido. Intenta de nuevo." };
  }

  const productsById = new Map(
    ((productsResult.data ?? []) as Product[]).map((product) => [
      product.id,
      product,
    ])
  );
  const sidesById = new Map(
    ((sidesResult.data ?? []) as Side[]).map((side) => [side.id, side])
  );

  const items: CartItem[] = [];
  for (const entry of parsed) {
    const product = productsById.get(entry.productId);
    if (!product) {
      return {
        error:
          "Uno de los productos ya no está disponible. Actualiza tu carrito e intenta de nuevo.",
      };
    }

    let side: Side | null = null;
    if (entry.sideId) {
      if (!product.with_side) {
        return {
          error:
            "Uno de los productos ya no admite acompañamiento. Actualiza tu carrito e intenta de nuevo.",
        };
      }
      side = sidesById.get(entry.sideId) ?? null;
      if (!side) {
        return {
          error:
            "Uno de los acompañamientos ya no está disponible. Actualiza tu carrito e intenta de nuevo.",
        };
      }
    }

    items.push({ product, side, qty: entry.qty });
  }

  return { items };
}

export async function submitOrder(
  items: CartItem[],
  form: OrderForm
): Promise<{
  error: string | null;
  pricing?: Pricing;
  items?: CartItem[];
  deliveryQuote?: {
    address: string;
    distanceMeters: number;
    fee: number | null;
    pending: boolean;
  };
}> {
  if (!form || typeof form !== "object") {
    return { error: "Datos del pedido inválidos." };
  }
  // Honeypot: los bots suelen rellenar todos los campos del formulario.
  if (String(form.website ?? "").trim().length > 0) {
    return { error: "No se pudo procesar el pedido." };
  }

  const name = String(form.name ?? "").trim();
  const phone = String(form.phone ?? "").trim();
  const deliveryDate = String(form.deliveryDate ?? "").trim();
  const note = String(form.note ?? "").trim();
  const mode = form.fulfillmentMode;
  const placeId = mode === "delivery" ? String(form.deliveryPlaceId ?? "").trim() : "";
  const deliveryNumberUnknown =
    mode === "delivery" && Boolean(form.deliveryNumberUnknown);
  const deliveryNumber =
    mode === "delivery" && !deliveryNumberUnknown
      ? String(form.deliveryNumber ?? "").trim()
      : "";
  let address = "";
  let deliveryDistanceMeters: number | null = null;
  let deliveryFeePending = false;

  if (
    name.length < 2 ||
    phone.replace(/\D/g, "").length < 8 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate) ||
    Number.isNaN(Date.parse(`${deliveryDate}T00:00:00Z`)) ||
    new Date(`${deliveryDate}T00:00:00Z`).toISOString().slice(0, 10) !== deliveryDate
  ) {
    return { error: "Completa nombre, teléfono y fecha de entrega." };
  }
  const dateWindow = deliveryDateWindow();
  if (deliveryDate < dateWindow.minDate || deliveryDate > dateWindow.maxDate) {
    return {
      error: `Elige una fecha entre ${formatWhatsAppDate(dateWindow.minDate)} y ${formatWhatsAppDate(dateWindow.maxDate)}.${
        dateWindow.cutoffApplied
          ? " Después de las 16:00 no se aceptan pedidos para hoy."
          : ""
      }`,
    };
  }
  if (name.length > 100 || phone.length > 30 || note.length > 1000) {
    return {
      error: "Revisa los datos: nombre, teléfono o nota son demasiado largos.",
    };
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
  if (deliveryNumber && !isValidDeliveryNumber(deliveryNumber)) {
    return {
      error:
        "Ingresa solo el número de la dirección (ej. 1546 o 1546 B) o marca que no lo tienes.",
    };
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

  // Los precios y la disponibilidad se leen de la base de datos, no del
  // carrito del navegador.
  const resolvedItems = await resolveOrderItems(supabase, items);
  if ("error" in resolvedItems) {
    return { error: resolvedItems.error };
  }
  const orderItems = resolvedItems.items;

  let deliveryQuote:
    | {
        address: string;
        distanceMeters: number;
        fee: number | null;
        pending: boolean;
      }
    | undefined;
  if (mode === "delivery") {
    const serverMapsKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
    if (!serverMapsKey) {
      return { error: "El despacho por distancia no está configurado. Elige retiro en local." };
    }

    const destination = await resolveDeliveryPlace(placeId, serverMapsKey);
    if (!destination) {
      return {
        error:
          "No pudimos validar esa dirección. Revisa la sugerencia de Google Maps o describe tu dirección real en la nota.",
      };
    }

    address = destination.address;
    deliveryDistanceMeters = straightLineDistanceMeters(DELIVERY_ORIGIN, destination.coordinates);
    if (!isWithinDeliveryRadius(deliveryDistanceMeters, pricing)) {
      const maxKm = Math.round(pricing.deliveryMaxDistanceMeters / 1000);
      return {
        error: `La dirección está a ${formatDistance(deliveryDistanceMeters)} del local y el despacho llega hasta ${maxKm} km. Revisa la dirección o elige retiro en local.`,
      };
    }
    // El número escrito por el usuario habilita el cálculo; si no hay número,
    // la tarifa queda pendiente y la dirección se confirma por WhatsApp.
    // Google solo prellena el campo en el navegador.
    const effectiveNumber = deliveryNumber;
    const feePending = !effectiveNumber;
    if (effectiveNumber) {
      address = addDeliveryNumberToAddress(
        destination.address,
        destination.streetNumber,
        effectiveNumber
      );
    }
    const fee = feePending
      ? null
      : deliveryFeeForDistance(deliveryDistanceMeters, pricing);
    if (!feePending && fee === null) {
      return { error: "Falta configurar en el panel la Tarifa 2 para distancias mayores a 2 km." };
    }
    deliveryFeePending = feePending;
    deliveryQuote = {
      address,
      distanceMeters: deliveryDistanceMeters,
      fee,
      pending: feePending,
    };
  }

  const deliveryFee = deliveryQuote?.fee ?? 0;
  const total = orderTotal(
    orderItems,
    pricing,
    mode,
    deliveryFeePending ? null : deliveryDistanceMeters
  );

  // El insert no pasa por RLS: se usa la service_role únicamente en servidor
  // después de validar ítems, precios, distancia y tarifa.
  const service = createServiceClientInstance();
  if (!service) {
    console.error("Falta SUPABASE_SERVICE_ROLE_KEY para guardar pedidos.");
    return { error: "No se pudo guardar el pedido. Intenta de nuevo." };
  }

  const { error } = await service.from("orders").insert({
    name,
    phone,
    delivery_date: deliveryDate,
    fulfillment_mode: mode,
    address,
    delivery_fee: deliveryFee,
    delivery_fee_pending: deliveryFeePending,
    delivery_distance_m: deliveryDistanceMeters,
    note,
    items: orderItems.map((item) => ({
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
  return { error: null, pricing, items: orderItems, deliveryQuote };
}

/**
 * Agrega el número escrito por el usuario a la dirección de Google.
 * Si Google ya trae un número distinto, lo reemplaza al final de la calle
 * para no duplicarlo y mantener comuna/región al final del texto.
 */
function addDeliveryNumberToAddress(
  address: string,
  googleNumber: string | null,
  number: string
): string {
  const google = googleNumber?.trim() ?? "";
  if (!number || number === google) return address;

  const [street, ...rest] = address.split(",");
  if (rest.length === 0) return `${street.trim()} ${number}`;

  const index = google ? street.lastIndexOf(google) : -1;
  const streetWithNumber =
    index !== -1
      ? `${street.slice(0, index)}${number}${street.slice(index + google.length)}`
      : `${street.trim()} ${number}`;

  return [streetWithNumber.trim(), ...rest.map((part) => part.trim())].join(
    ", "
  );
}

async function resolveDeliveryPlace(
  placeId: string,
  apiKey: string
): Promise<{
  address: string;
  coordinates: Coordinates;
  streetNumber: string | null;
} | null> {
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

    const streetNumber =
      place.addressComponents
        ?.find((component) => component.types?.includes("street_number"))
        ?.shortText?.trim() || null;

    return {
      address: place.formattedAddress,
      coordinates: { latitude, longitude },
      streetNumber,
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
  const maxDistanceValue = String(formData.get("delivery_max_distance_km") ?? "");
  const fee = Number(firstValue);
  const feeOver2Km = Number(secondValue);
  const maxDistanceKm = Number(maxDistanceValue);
  if (
    !firstValue.trim() ||
    !secondValue.trim() ||
    !maxDistanceValue.trim() ||
    !Number.isSafeInteger(fee) ||
    fee < 0 ||
    !Number.isSafeInteger(feeOver2Km) ||
    feeOver2Km < 0 ||
    !Number.isSafeInteger(maxDistanceKm) ||
    maxDistanceKm < DELIVERY_MAX_DISTANCE_MIN_KM ||
    maxDistanceKm > DELIVERY_MAX_DISTANCE_MAX_KM
  ) {
    return {
      error: `Las tarifas deben ser montos enteros en pesos (0 o más) y la distancia máxima un entero entre ${DELIVERY_MAX_DISTANCE_MIN_KM} y ${DELIVERY_MAX_DISTANCE_MAX_KM} km.`,
    };
  }

  try {
    const supabase = await requireUser();
    const { error } = await supabase.from("settings").upsert([
      { key: DELIVERY_FEE_KEY, value: String(fee) },
      { key: DELIVERY_FEE_OVER_2KM_KEY, value: String(feeOver2Km) },
      { key: DELIVERY_MAX_DISTANCE_KEY, value: String(maxDistanceKm * 1000) },
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
