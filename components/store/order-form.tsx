"use client";

import { useCallback, useState } from "react";
import { useCart } from "./cart-provider";
import { buildOrderMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { formatPrice } from "@/lib/format";
import {
  deliveryFeeForDistance,
  DELIVERY_TARIFF_THRESHOLD_METERS,
  effectiveUnitPrice,
  orderTotal,
  unitDiscount,
} from "@/lib/pricing";
import { straightLineDistanceMeters, type Coordinates } from "@/lib/distance";
import {
  DeliveryAddressAutocomplete,
  type SelectedDeliveryPlace,
} from "./delivery-address-autocomplete";
import { PhoneContact } from "./phone-contact";
import { submitOrder } from "@/app/admin/actions";
import type { OrderForm } from "@/lib/types";

function today(): string {
  return new Date().toISOString().split("T")[0];
}

const INITIAL_FORM: OrderForm = {
  name: "",
  phone: "",
  deliveryDate: today(),
  fulfillmentMode: "",
  address: "",
  deliveryPlaceId: "",
  note: "",
  needsNearestAddress: false,
};

export function OrderForm({
  deliveryOrigin,
  mapsBrowserKey,
  deliveryConfigured,
}: {
  deliveryOrigin: Coordinates | null;
  mapsBrowserKey: string;
  deliveryConfigured: boolean;
}) {
  const { items, total, setQty, remove, clear, pricing } = useCart();
  const [form, setForm] = useState<OrderForm>(INITIAL_FORM);
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [sent, setSent] = useState(false);

  const hasItems = items.length > 0;
  const totalSaved = items.reduce(
    (sum, i) => sum + unitDiscount(i.product, i.side, pricing) * i.qty,
    0
  );
  const phoneOk = form.phone.replace(/\D/g, "").length >= 8;
  const nameOk = form.name.trim().length >= 2;
  const modeOk = form.fulfillmentMode === "pickup" || form.fulfillmentMode === "delivery";
  const deliveryDistanceMeters =
    form.fulfillmentMode === "delivery" && deliveryOrigin && destination
      ? straightLineDistanceMeters(deliveryOrigin, destination)
      : null;
  const deliveryFee =
    deliveryDistanceMeters === null
      ? null
      : deliveryFeeForDistance(deliveryDistanceMeters, pricing);
  const addressOk =
    form.fulfillmentMode !== "delivery" ||
    (deliveryConfigured &&
      Boolean(form.deliveryPlaceId) &&
      form.address.length >= 5 &&
      deliveryDistanceMeters !== null &&
      deliveryFee !== null);
  // Si el usuario eligió el punto más cercano, la nota es obligatoria
  // para describir su dirección real.
  const nearestNotesNeeded =
    form.fulfillmentMode === "delivery" && form.needsNearestAddress;
  const noteOk = !nearestNotesNeeded || form.note.trim().length >= 10;
  const formOk =
    nameOk && phoneOk && form.deliveryDate.length > 0 && modeOk && addressOk && noteOk;
  const finalTotal = orderTotal(
    items,
    pricing,
    form.fulfillmentMode,
    deliveryDistanceMeters
  );

  const handleDeliveryPlaceSelect = useCallback(
    (place: SelectedDeliveryPlace | null) => {
      setForm((current) => ({
        ...current,
        address: place?.address ?? "",
        deliveryPlaceId: place?.placeId ?? "",
      }));
      setDestination(place?.coordinates ?? null);
      setSubmitError(null);
    },
    []
  );

  const handleNearestToggle = (checked: boolean) => {
    // Al cambiar la modalidad de dirección, se limpia la selección previa.
    setForm((current) => ({
      ...current,
      needsNearestAddress: checked,
      address: "",
      deliveryPlaceId: "",
    }));
    setDestination(null);
    setSubmitError(null);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasItems || !formOk || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    const res = await submitOrder(items, form);
    setSubmitting(false);

    if (res.error) {
      setSubmitError(res.error);
      return;
    }

    // Usar la tarifa confirmada por el servidor si cambió mientras la página estaba abierta.
    const confirmedForm = {
      ...form,
      address: res.deliveryQuote?.address ?? form.address,
    };
    const url = buildWhatsAppUrl(
      buildOrderMessage(
        items,
        confirmedForm,
        res.pricing ?? pricing,
        res.deliveryQuote?.distanceMeters ?? null
      )
    );
    setWhatsappUrl(url);
    window.open(url, "_blank", "noopener,noreferrer");
    setConfirmOpen(true);
  }

  function confirmSent() {
    clear();
    setForm(INITIAL_FORM);
    setDestination(null);
    setConfirmOpen(false);
    setSent(true);
  }

  function reopenWhatsApp() {
    if (whatsappUrl) {
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <section id="pedido" className="scroll-mt-16 border-t border-ink/10 bg-paper py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5">
        <p className="font-hand text-center text-3xl text-butter-deep">
          último paso
        </p>
        <h2 className="font-display mt-2 text-center text-4xl text-pine sm:text-5xl">
          Tu pedido
        </h2>

        {sent && (
          <div className="mx-auto mt-8 flex max-w-xl items-start justify-between gap-4 rounded-lg border-2 border-pine/30 bg-pine/10 p-4">
            <div>
              <p className="font-bold text-pine">Pedido enviado. ¡Gracias!</p>
              <p className="text-sm text-ink/65">
                Te contactaremos para confirmar la entrega.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="font-hand text-xl text-ink/40 transition-colors hover:text-pine"
              aria-label="Cerrar aviso de pedido enviado"
            >
              cerrar
            </button>
          </div>
        )}

        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          {/* Resumen del pedido */}
          <div>
            {!hasItems ? (
              <div className="flex h-full min-h-48 flex-col items-center justify-center rounded-lg border-2 border-dashed border-ink/15 bg-cream p-8 text-center">
                <p className="font-hand text-3xl text-ink/50">
                  Tu bolsa está vacía
                </p>
                <a
                  href="#menu"
                  className="mt-4 inline-flex h-11 items-center rounded-full bg-pine px-6 text-sm font-bold text-chalk transition-colors hover:bg-pine-deep"
                >
                  Elegir del menú
                </a>
              </div>
            ) : (
              <ul className="divide-y divide-ink/10 rounded-lg bg-cream shadow-md shadow-ink/6">
                {items.map(({ product, qty, side }) => {
                  const unit = effectiveUnitPrice(product, side, pricing);
                  const saved = unitDiscount(product, side, pricing);
                  return (
                  <li key={`${product.id}:${side?.id ?? "none"}`} className="flex items-center gap-4 p-4">
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt=""
                        className="h-14 w-14 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-md bg-pine/10">
                        <span className="font-display text-xs text-pine/40">
                          DN
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-pine">
                        {product.name}
                      </p>
                      {product.with_side && (
                        <p className="text-sm text-ink/60">
                          {side ? `Acompañamiento: ${side.name}` : "Sin acompañamiento"}
                        </p>
                      )}
                      <p className="text-sm text-ink/60">
                        {saved > 0 && (
                          <span className="mr-2 text-ink/40 line-through">
                            {formatPrice(product.price)}
                          </span>
                        )}
                        {formatPrice(unit)}
                        {saved > 0 && (
                          <span className="ml-2 font-bold text-butter-deep">
                            ahorras {formatPrice(saved)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQty(product.id, side, qty - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/20 font-bold text-ink/70 transition-colors hover:bg-pine hover:text-chalk"
                        aria-label={`Quitar una unidad de ${product.name}`}
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-semibold">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(product.id, side, qty + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/20 font-bold text-ink/70 transition-colors hover:bg-pine hover:text-chalk"
                        aria-label={`Agregar una unidad de ${product.name}`}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(product.id, side)}
                      className="font-hand text-xl text-ink/40 transition-colors hover:text-red-700"
                      aria-label={`Quitar ${product.name} del pedido`}
                    >
                      quitar
                    </button>
                  </li>
                  );
                })}
                <li className="flex items-center justify-between gap-3 p-4">
                  <span className="font-semibold text-pine">Subtotal</span>
                  <span className="text-right font-display text-lg text-butter-deep">
                    {totalSaved > 0 && (
                      <span className="mr-2 text-sm text-ink/40 line-through">
                        {formatPrice(total + totalSaved)}
                      </span>
                    )}
                    {formatPrice(total)}
                  </span>
                </li>
                {form.fulfillmentMode === "delivery" && (
                  <li className="flex flex-col gap-1 px-4 pb-4 text-sm">
                    {deliveryFee !== null && deliveryDistanceMeters !== null && (
                      <p className="text-ink/60">
                        Tarifa{" "}
                        {deliveryDistanceMeters > DELIVERY_TARIFF_THRESHOLD_METERS ? "2" : "1"}
                        {nearestNotesNeeded && (
                          <span className="ml-1 text-butter-deep">· hacia el punto más cercano</span>
                        )}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-pine">Despacho a domicilio</span>
                      <span>
                        {deliveryFee === null
                          ? deliveryDistanceMeters === null
                            ? "Selecciona una dirección"
                            : "Tarifa 2 pendiente de configurar"
                          : formatPrice(deliveryFee)}
                      </span>
                    </div>
                  </li>
                )}
                <li className="flex items-center justify-between gap-3 border-t border-ink/10 p-4">
                  <span className="font-display text-xl text-pine">Total</span>
                  <span className="font-display text-2xl text-butter-deep">
                    {form.fulfillmentMode === "delivery" &&
                    deliveryDistanceMeters !== null &&
                    deliveryFee === null
                      ? "Configura Tarifa 2"
                      : formatPrice(finalTotal)}
                  </span>
                </li>
              </ul>
            )}
          </div>

          {/* Datos de contacto */}
          <form onSubmit={submit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-sm font-bold text-pine">
                Nombre
              </label>
              <input
                id="name"
                type="text"
                required
                minLength={2}
                autoComplete="name"
                placeholder="Tu nombre"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-12 rounded-lg border-2 border-ink/15 bg-cream px-4 text-ink placeholder:text-ink/35 focus:border-butter-deep focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="phone" className="text-sm font-bold text-pine">
                Teléfono
              </label>
              <input
                id="phone"
                type="tel"
                required
                autoComplete="tel"
                placeholder="+56 9 1234 5678"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="h-12 rounded-lg border-2 border-ink/15 bg-cream px-4 text-ink placeholder:text-ink/35 focus:border-butter-deep focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="deliveryDate"
                className="text-sm font-bold text-pine"
              >
                Fecha de retiro o entrega
              </label>
              <input
                id="deliveryDate"
                type="date"
                required
                min={today()}
                value={form.deliveryDate}
                onChange={(e) =>
                  setForm({ ...form, deliveryDate: e.target.value })
                }
                className="h-12 rounded-lg border-2 border-ink/15 bg-cream px-4 text-ink focus:border-butter-deep focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="fulfillment-mode" className="text-sm font-bold text-pine">
                ¿Cómo recibirás tu pedido?
              </label>
              <select
                id="fulfillment-mode"
                required
                value={form.fulfillmentMode}
                onChange={(e) => {
                  const fulfillmentMode = e.target.value as typeof form.fulfillmentMode;
                  setForm({
                    ...form,
                    fulfillmentMode,
                    address: "",
                    deliveryPlaceId: "",
                  });
                  setDestination(null);
                }}
                className="h-12 rounded-lg border-2 border-ink/15 bg-cream px-4 text-ink focus:border-butter-deep focus:outline-none"
              >
                <option value="" disabled>Selecciona una opción</option>
                <option value="pickup">Retiro en local · sin costo</option>
                <option value="delivery" disabled={!deliveryConfigured}>
                  Despacho a domicilio · tarifa según distancia
                </option>
              </select>
              {!deliveryConfigured && (
                <p className="text-sm text-ink/55">
                  El despacho está temporalmente no disponible. Se requiere configurar Google Maps y la ubicación exacta del local.
                </p>
              )}
            </div>

            {form.fulfillmentMode === "delivery" && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold text-pine">
                  Busca y selecciona la dirección de entrega
                </span>
                {deliveryOrigin && mapsBrowserKey && (
                  <>
                    <DeliveryAddressAutocomplete
                      apiKey={mapsBrowserKey}
                      locationBias={deliveryOrigin}
                      onSelect={handleDeliveryPlaceSelect}
                    />
                    <label className="flex items-start gap-3 rounded-lg border-2 border-ink/15 bg-cream px-4 py-3">
                      <input
                        type="checkbox"
                        checked={form.needsNearestAddress}
                        onChange={(e) => handleNearestToggle(e.target.checked)}
                        className="mt-0.5 h-5 w-5 shrink-0 accent-pine"
                      />
                      <span className="text-sm text-ink/75">
                        No encuentro mi dirección exacta: seleccionaré el punto más
                        cercano y la describiré en la nota.
                      </span>
                    </label>
                  </>
                )}
                {form.needsNearestAddress && (
                  <p className="rounded-md bg-butter-deep/10 px-3 py-2 text-sm text-ink/75">
                    Selecciona de las sugerencias la dirección o el punto más cercano
                    a tu casa y describe tu dirección real en la nota (obligatoria):
                    nombre de la calle, número, block o departamento y referencias.
                    La distancia y la tarifa se calculan hacia ese punto: si tu casa
                    queda más lejos, el valor final del despacho podría ser mayor.
                  </p>
                )}
                <p className="text-xs text-ink/55">
                  Selecciona una sugerencia para validar la ubicación y calcular la distancia en línea recta desde el local.
                  {form.needsNearestAddress &&
                    " Si tu dirección exacta no aparece, usa el punto más cercano que sí aparezca."}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label htmlFor="note" className="text-sm font-bold text-pine">
                Nota{" "}
                {nearestNotesNeeded ? (
                  <span className="font-normal text-red-700">
                    (obligatoria: describe tu dirección real)
                  </span>
                ) : (
                  <span className="font-normal text-ink/50">(opcional)</span>
                )}
              </label>
              <textarea
                id="note"
                rows={3}
                placeholder={
                  form.needsNearestAddress
                    ? "Ej: Villa Esperanza, Pasaje Los Aromos 123, block 2, depto 301, cerca de la plaza"
                    : "Ej: sin cebolla, por favor"
                }
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="rounded-lg border-2 border-ink/15 bg-cream px-4 py-3 text-ink placeholder:text-ink/35 focus:border-butter-deep focus:outline-none"
              />
              {nearestNotesNeeded && !noteOk && (
                <p role="alert" className="text-sm font-semibold text-red-700">
                  Describe tu dirección real (calle, número, block o departamento y
                  referencias) para que podamos ubicarte.
                </p>
              )}
            </div>

            {submitError && (
              <p role="alert" className="rounded-md bg-red-100 px-3 py-2 text-sm font-semibold text-red-800">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={!hasItems || !formOk || submitting}
              className="mt-2 inline-flex h-14 items-center justify-center gap-3 rounded-full bg-pine px-8 text-base font-bold text-chalk shadow-lg shadow-pine/20 transition-colors hover:bg-pine-deep disabled:cursor-not-allowed disabled:bg-ink/20 disabled:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-butter-deep"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-6 w-6 text-[#25d366]"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
              {submitting ? "Enviando…" : "Enviar pedido por WhatsApp"}
            </button>
            <p className="text-center text-sm text-ink/55">
              Se abrirá WhatsApp con tu pedido listo para enviar.
            </p>
            <p className="flex flex-wrap items-center justify-center gap-x-2 text-center text-sm text-ink/55">
              ¿No tienes WhatsApp? Llámanos y pide por teléfono:
              <PhoneContact />
            </p>
          </form>
        </div>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-5"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar envío del pedido"
        >
          <div className="w-full max-w-md rounded-lg bg-paper p-6 shadow-2xl shadow-ink/30">
            <p className="font-hand text-2xl text-butter-deep">un último paso</p>
            <h3 className="font-display mt-1 text-2xl text-pine">
              ¿Enviaste tu pedido por WhatsApp?
            </h3>
            <p className="mt-2 text-sm text-ink/65">
              Si no se abrió WhatsApp, usa el botón para volver a abrirlo. Tu
              pedido quedó guardado, no lo perderás.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={confirmSent}
                className="inline-flex h-12 items-center justify-center rounded-full bg-pine font-bold text-chalk transition-colors hover:bg-pine-deep"
              >
                Sí, ya lo envié
              </button>
              <button
                type="button"
                onClick={reopenWhatsApp}
                className="inline-flex h-12 items-center justify-center rounded-full border-2 border-ink/15 font-bold text-ink/70 transition-colors hover:border-pine hover:text-pine"
              >
                Reabrir WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="text-sm font-semibold text-ink/45 transition-colors hover:text-pine"
              >
                Todavía no lo envío
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
