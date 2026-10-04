"use client";

import { useEffect, useState } from "react";
import type { Product, Side } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import type { Pricing } from "@/lib/pricing";

export function SideSelector({
  product,
  sides,
  pricing,
  onAdd,
  onClose,
}: {
  product: Product;
  sides: Side[];
  pricing: Pricing;
  onAdd: (product: Product, side: Side | null) => void;
  onClose: () => void;
}) {
  const [selectedKey, setSelectedKey] = useState<string>("");

  const discount = Math.min(pricing.noSideDiscount, product.price);
  const discountedPrice = Math.max(0, product.price - discount);
  const showsDiscount = product.with_side && discount > 0;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function confirm() {
    if (!selectedKey) return;
    const side = selectedKey === "none" ? null : (sides.find((s) => s.id === selectedKey) ?? null);
    onAdd(product, side);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/60 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="side-selector-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[calc(100dvh-1.5rem)] min-h-0 w-full max-w-md flex-col overflow-hidden rounded-lg bg-paper shadow-2xl shadow-ink/30 sm:max-h-[calc(100dvh-2.5rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-4 pb-3 pt-4 sm:px-6 sm:pt-6">
          <p className="font-hand text-xl text-butter-deep sm:text-2xl">
            elige un acompañamiento
          </p>
          <h3
            id="side-selector-title"
            className="font-display mt-1 text-xl leading-snug text-pine sm:text-2xl"
          >
            {product.name}
          </h3>
          <p className="mt-1 font-display text-base text-butter-deep sm:text-lg">
            {selectedKey === "none" && showsDiscount ? (
              <>
                <span className="mr-2 text-ink/40 line-through">
                  {formatPrice(product.price)}
                </span>
                {formatPrice(discountedPrice)}
              </>
            ) : (
              formatPrice(product.price)
            )}
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label="Acompañamientos"
          className="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain px-4 py-2 sm:px-6"
        >
          {sides.map((side) => (
            <label
              key={side.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors ${
                selectedKey === side.id
                  ? "border-pine bg-pine/10"
                  : "border-ink/15 bg-cream hover:border-butter-deep"
              }`}
            >
              <input
                type="radio"
                name="side"
                value={side.id}
                checked={selectedKey === side.id}
                onChange={() => setSelectedKey(side.id)}
                className="mt-1 h-4 w-4 accent-[#1e3b32]"
              />
              <span className="min-w-0">
                <span className="block font-bold text-pine">{side.name}</span>
                {side.description && (
                  <span className="block text-sm text-ink/60">{side.description}</span>
                )}
              </span>
            </label>
          ))}

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors ${
              selectedKey === "none"
                ? "border-pine bg-pine/10"
                : "border-ink/15 bg-cream hover:border-butter-deep"
            }`}
          >
            <input
              type="radio"
              name="side"
              value="none"
              checked={selectedKey === "none"}
              onChange={() => setSelectedKey("none")}
              className="mt-1 h-4 w-4 accent-[#1e3b32]"
            />
            <span className="min-w-0">
              <span className="block font-bold text-pine">Sin acompañamiento</span>
              <span className="block text-sm text-ink/60">
                {showsDiscount
                  ? `Solo el plato · ${formatPrice(discountedPrice)}`
                  : "Solo el plato, sin acompañamiento."}
              </span>
              {showsDiscount && (
                <span className="mt-1 inline-flex items-center rounded-full bg-butter/25 px-2.5 py-0.5 text-xs font-bold text-butter-deep">
                  ahorras {formatPrice(discount)}
                </span>
              )}
            </span>
          </label>
        </div>

        <div className="flex shrink-0 gap-2 border-t border-ink/10 px-4 pb-4 pt-3 sm:gap-3 sm:px-6 sm:pb-6">
          <button
            type="button"
            onClick={confirm}
            disabled={!selectedKey}
            className="inline-flex h-11 min-w-0 flex-1 items-center justify-center rounded-full bg-pine px-3 text-sm font-bold text-chalk transition-colors hover:bg-pine-deep disabled:cursor-not-allowed disabled:bg-ink/20 disabled:text-ink/40 sm:px-6 sm:text-base"
          >
            Agregar al pedido
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center rounded-full border-2 border-ink/15 px-3 text-sm font-bold text-ink/70 transition-colors hover:border-pine hover:text-pine sm:px-6 sm:text-base"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
