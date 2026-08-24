"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, { error: null });

  return (
    <main className="paper-grain flex flex-1 items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="rounded-lg bg-paper p-8 shadow-lg shadow-ink/10">
          <p className="font-hand text-center text-3xl text-butter-deep">
            cocina de Divina Natales
          </p>
          <h1 className="font-display mt-2 text-center text-3xl text-pine">
            Administración
          </h1>

          <form action={action} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-bold text-pine">
                Correo
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="h-12 rounded-lg border-2 border-ink/15 bg-cream px-4 focus:border-butter-deep focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-bold text-pine">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="h-12 rounded-lg border-2 border-ink/15 bg-cream px-4 focus:border-butter-deep focus:outline-none"
              />
            </div>

            {state.error && (
              <p
                role="alert"
                className="rounded-md bg-red-100 px-3 py-2 text-sm font-semibold text-red-800"
              >
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-2 inline-flex h-12 items-center justify-center rounded-full bg-pine px-6 font-bold text-chalk transition-colors hover:bg-pine-deep disabled:opacity-60"
            >
              {pending ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>

        <Link
          href="/"
          className="mt-6 block text-center text-sm font-semibold text-ink/50 transition-colors hover:text-pine"
        >
          ← Volver a la tienda
        </Link>
      </div>
    </main>
  );
}
