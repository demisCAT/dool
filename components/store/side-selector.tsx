"use client";

import { useEffect, useState } from "react";
import type { Product, Side } from "@/lib/types";
import { formatPrice } from "@/lib/format";

export function SideSelector({
  product,
  sides,
  onAdd,
  onClose,
}: {
  product: Product;
  sides: Side[];
  onAdd: (product: Product, side: Side | null) => void;
  onClose: () => void;
}) {
  const [selectedKey, setSelectedKey] = useState<string>("");

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-5"
      role="dialog"
      aria-modal="true"
      aria-label={`Elegir acompañamiento para ${product.name}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-paper p-6 shadow-2xl shadow-ink/30"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-hand text-2xl text-butter-deep">elige un acompañamiento</p>
        <h3 className="font-display mt-1 text-2xl leading-snug text-pine">
          {product.name}
        </h3>
        <p className="mt-1 font-display text-lg text-butter-deep">
          {formatPrice(product.price)}
        </p>

        <div role="radiogroup" aria-label="Acompañamientos" className="mt-5 flex flex-col gap-2">
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
                Solo el plato, sin acompañamiento.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={confirm}
            disabled={!selectedKey}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-pine px-6 font-bold text-chalk transition-colors hover:bg-pine-deep disabled:cursor-not-allowed disabled:bg-ink/20 disabled:text-ink/40"
          >
            Agregar al pedido
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center rounded-full border-2 border-ink/15 px-6 font-bold text-ink/70 transition-colors hover:border-pine hover:text-pine"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}