"use client";

import { useState } from "react";
import Image from "next/image";
import type { Category, Product, Side } from "@/lib/types";
import { useCart } from "./cart-provider";
import { SideSelector } from "./side-selector";
import { formatPrice } from "@/lib/format";

function ProductCard({
  product,
  sides,
  onOpenSidePicker,
}: {
  product: Product;
  sides: Side[];
  onOpenSidePicker: (product: Product) => void;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    if (product.with_side && sides.length > 0) {
      onOpenSidePicker(product);
      return;
    }
    add(product, null);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  }

  return (
    <article className="group flex flex-row overflow-hidden rounded-lg bg-paper shadow-md shadow-ink/8 transition-transform duration-300 hover:-translate-y-1.5 lg:flex-col">
      <div className="relative aspect-square w-2/5 shrink-0 overflow-hidden bg-cream lg:aspect-[4/3] lg:w-full">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 112px, (max-width: 1024px) 40vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-display text-center text-lg text-pine/25 lg:text-4xl">
              Divina Natales
            </span>
          </div>
        )}
        <span aria-hidden className="tape hidden lg:block" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-4 sm:gap-2 sm:p-5">
        <h3 className="font-display text-lg leading-snug text-pine sm:text-xl">
          {product.name}
        </h3>
        {product.description && (
          <p className="line-clamp-2 text-sm text-ink/65 lg:line-clamp-none">
            {product.description}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 pt-2 sm:pt-3">
          <span className="font-display text-xl text-butter-deep sm:text-2xl">
            {formatPrice(product.price)}
          </span>
          <button
            type="button"
            onClick={handleAdd}
            className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-butter-deep sm:h-10 sm:px-5 ${
              added
                ? "bg-pine text-chalk"
                : "bg-butter text-ink hover:bg-butter-deep hover:text-cream"
            }`}
          >
            {added ? "Agregado" : "Agregar"}
          </button>
        </div>
      </div>
    </article>
  );
}

export function MenuSection({
  categories,
  products,
  sides,
}: {
  categories: Category[];
  products: Product[];
  sides: Side[];
}) {
  const { add } = useCart();
  const [activeId, setActiveId] = useState<string | null>(
    categories[0]?.id ?? null
  );
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);

  const ordered = [...categories].sort((a, b) => a.position - b.position);
  const visible = products.filter((p) => p.category_id === activeId);

  if (categories.length === 0) {
    return null;
  }

  return (
    <section id="menu" className="paper-grain scroll-mt-16 py-16 sm:py-20">
      {pickerProduct && (
        <SideSelector
          key={pickerProduct.id}
          product={pickerProduct}
          sides={sides}
          onAdd={(product, side) => {
            add(product, side);
            setPickerProduct(null);
          }}
          onClose={() => setPickerProduct(null)}
        />
      )}
      <div className="mx-auto max-w-6xl px-5">
        <p className="font-hand text-center text-3xl text-butter-deep">
          preparado hoy
        </p>
        <h2 className="font-display mt-2 text-center text-4xl text-pine sm:text-5xl">
          El menú
        </h2>

        <div
          role="tablist"
          aria-label="Categorías del menú"
          className="mt-10 flex flex-wrap justify-center gap-3"
        >
          {ordered.map((cat) => {
            const isActive = cat.id === activeId;
            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveId(cat.id)}
                className={`font-hand rounded-t-md rounded-b-none border-b-4 px-5 pb-2 pt-1.5 text-2xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-butter-deep ${
                  isActive
                    ? "border-butter bg-pine text-chalk"
                    : "border-ink/15 bg-paper text-ink/70 hover:bg-pine/10 hover:text-pine"
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {visible.length === 0 ? (
          <p className="mt-14 text-center text-ink/60">
            Estamos horneando esta sección. Vuelve pronto.
          </p>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-7">
            {visible.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                sides={sides}
                onOpenSidePicker={setPickerProduct}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
