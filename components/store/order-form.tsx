"use client";

import { useState } from "react";
import { useCart } from "./cart-provider";
import { buildOrderMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { formatPrice } from "@/lib/format";
import type { OrderForm } from "@/lib/types";

function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function OrderForm() {
  const { items, total, setQty, remove } = useCart();
  const [form, setForm] = useState<OrderForm>({
    name: "",
    phone: "",
    deliveryDate: today(),
    note: "",
  });

  const hasItems = items.length > 0;
  const phoneOk = form.phone.replace(/\D/g, "").length >= 8;
  const nameOk = form.name.trim().length >= 2;
  const formOk = nameOk && phoneOk && form.deliveryDate.length > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasItems || !formOk) return;
    const url = buildWhatsAppUrl(buildOrderMessage(items, form));
    window.open(url, "_blank", "noopener,noreferrer");
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
                {items.map(({ product, qty }) => (
                  <li key={product.id} className="flex items-center gap-4 p-4">
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
                      <p className="text-sm text-ink/60">
                        {formatPrice(product.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQty(product.id, qty - 1)}
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
                        onClick={() => setQty(product.id, qty + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/20 font-bold text-ink/70 transition-colors hover:bg-pine hover:text-chalk"
                        aria-label={`Agregar una unidad de ${product.name}`}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(product.id)}
                      className="font-hand text-xl text-ink/40 transition-colors hover:text-red-700"
                      aria-label={`Quitar ${product.name} del pedido`}
                    >
                      quitar
                    </button>
                  </li>
                ))}
                <li className="flex items-center justify-between p-4">
                  <span className="font-display text-xl text-pine">Total</span>
                  <span className="font-display text-2xl text-butter-deep">
                    {formatPrice(total)}
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
                Fecha de entrega
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
              <label htmlFor="note" className="text-sm font-bold text-pine">
                Nota <span className="font-normal text-ink/50">(opcional)</span>
              </label>
              <textarea
                id="note"
                rows={3}
                placeholder="Ej: sin cebolla, por favor"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="rounded-lg border-2 border-ink/15 bg-cream px-4 py-3 text-ink placeholder:text-ink/35 focus:border-butter-deep focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={!hasItems || !formOk}
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
              Enviar pedido por WhatsApp
            </button>
            <p className="text-center text-sm text-ink/55">
              Se abrirá WhatsApp con tu pedido listo para enviar.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
