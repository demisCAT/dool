import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";

const PLACEHOLDER = [
  "Plato del día",
  "Guarnición de la casa",
  "Postre casero",
];

export function Chalkboard({ products }: { products: Product[] }) {
  const rows = products.slice(0, 5);
  const list = rows.length > 0 ? rows : PLACEHOLDER;

  return (
    <div className="relative -rotate-1.5 transition-transform duration-500 hover:rotate-0">
      <div className="chalkboard chalkboard-frame relative rounded-sm px-7 py-8 sm:px-10 sm:py-10">
        {/* Título con tiza */}
        <p className="font-hand text-4xl text-chalk sm:text-5xl">
          Menú de hoy
        </p>
        <div className="mt-2 h-[3px] w-24 rounded-full bg-chalk/40" />

        <ul className="mt-7 space-y-4">
          {list.map((item, i) => {
            const isProduct = typeof item !== "string";
            const label = isProduct ? item.name : item;
            const price = isProduct ? formatPrice(item.price) : null;
            return (
              <li
                key={isProduct ? item.id : label}
                className="chalk-item flex items-baseline gap-3"
                style={{ animationDelay: `${300 + i * 220}ms` }}
              >
                <span className="font-hand text-2xl text-chalk sm:text-[1.7rem]">
                  {label}
                </span>
                <span
                  aria-hidden
                  className="flex-1 border-b-2 border-dotted border-chalk/35"
                />
                {price && (
                  <span className="font-hand text-2xl text-butter sm:text-[1.7rem]">
                    {price}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {/* Repisa de tiza */}
        <div className="mt-8 flex justify-center">
          <div className="h-1.5 w-3/4 rounded-full bg-chalk/25" />
        </div>
      </div>

      {/* Sombra bajo la pizarra */}
      <div
        aria-hidden
        className="absolute -bottom-3 left-6 right-10 h-4 rounded-[50%] bg-ink/15 blur-md"
      />
    </div>
  );
}
