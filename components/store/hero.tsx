import { Chalkboard } from "./chalkboard";
import type { Product } from "@/lib/types";

export function Hero({ products }: { products: Product[] }) {
  return (
    <section className="paper-grain border-b border-ink/10">
      <div className="mx-auto grid max-w-6xl gap-14 px-5 py-16 sm:py-20 lg:grid-cols-2 lg:items-center lg:py-24">
        <div className="text-center lg:text-left">
          <p className="font-hand text-3xl text-butter-deep">
            cocina casera · Natales
          </p>
          <h1 className="font-display mt-3 text-5xl leading-[1.05] text-pine sm:text-6xl lg:text-7xl">
            Comida casera,
            <br />
            <span className="chalk-underline text-butter-deep">
              lista cuando llegas
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-md text-lg text-ink/75 lg:mx-0">
            Elige tus platos, mándanos el pedido por WhatsApp y pasa a
            retirarlo. Hecho en casa, todos los días.
          </p>

          <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
            <a
              href="#menu"
              className="inline-flex h-13 items-center rounded-full bg-pine px-8 text-base font-semibold text-chalk shadow-lg shadow-pine/20 transition-colors hover:bg-pine-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-butter-deep"
            >
              Ver el menú
            </a>
            <a
              href="#como-pedir"
              className="inline-flex h-13 items-center rounded-full border-2 border-pine/25 px-8 text-base font-semibold text-pine transition-colors hover:border-pine hover:bg-pine hover:text-chalk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-butter-deep"
            >
              Cómo pedir
            </a>
          </div>
        </div>

        <div className="px-4 sm:px-8">
          <Chalkboard products={products} />
        </div>
      </div>
    </section>
  );
}
