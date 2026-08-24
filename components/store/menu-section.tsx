"use client";

import { useState } from "react";
import type { Category, Product } from "@/lib/types";
import { useCart } from "./cart-provider";
import { formatPrice } from "@/lib/format";

function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    add(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg bg-paper shadow-md shadow-ink/8 transition-transform duration-300 hover:-translate-y-1.5">
      <div className="relative aspect-[4/3] overflow-hidden bg-cream">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-display text-4xl text-pine/25">
              Divina Natales
            </span>
          </div>
        )}
        <span aria-hidden className="tape" />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-display text-xl leading-snug text-pine">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-sm text-ink/65">{product.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="font-display text-2xl text-butter-deep">
            {formatPrice(product.price)}
          </span>
          <button
            type="button"
            onClick={handleAdd}
            className={`inline-flex h-10 items-center rounded-full px-5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-butter-deep ${
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
}: {
  categories: Category[];
  products: Product[];
}) {
  const [activeId, setActiveId] = useState<string | null>(
    categories[0]?.id ?? null
  );

  const ordered = [...categories].sort((a, b) => a.position - b.position);
  const visible = products.filter((p) => p.category_id === activeId);

  if (categories.length === 0) {
    return null;
  }

  return (
    <section id="menu" className="paper-grain scroll-mt-16 py-16 sm:py-20">
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
          <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
