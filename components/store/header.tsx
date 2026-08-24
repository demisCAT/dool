"use client";

import { useCart } from "./cart-provider";

export function Header() {
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <a href="#inicio" className="flex items-baseline gap-2">
          <span className="font-display text-2xl text-pine">Divina Natales</span>
          <span className="font-hand hidden text-lg text-butter-deep sm:inline">
            para llevar
          </span>
        </a>

        <nav className="flex items-center gap-6">
          <a
            href="#menu"
            className="hidden text-sm font-semibold text-ink/70 transition-colors hover:text-pine sm:block"
          >
            Menú
          </a>
          <a
            href="#como-pedir"
            className="hidden text-sm font-semibold text-ink/70 transition-colors hover:text-pine sm:block"
          >
            Cómo pedir
          </a>
          <a
            href="#pedido"
            className="relative inline-flex h-11 items-center gap-2 rounded-full bg-butter px-5 text-sm font-bold text-ink shadow-md shadow-butter/30 transition-colors hover:bg-butter-deep hover:text-cream"
            aria-label={`Ver pedido, ${count} productos`}
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
              />
            </svg>
            {count > 0 && (
              <span
                key={count}
                className="badge-pop absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-pine px-1.5 text-xs font-bold text-chalk"
              >
                {count}
              </span>
            )}
          </a>
        </nav>
      </div>
    </header>
  );
}
