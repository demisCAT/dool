"use client";

import { useState } from "react";

function formatPhone(digits: string): string {
  if (digits.startsWith("56") && digits.length === 11) {
    return `+56 9 ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  return `+${digits}`;
}

export function PhoneContact({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [revealed, setRevealed] = useState(false);

  const digits = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(
    /\D/g,
    ""
  );
  if (!digits) return null;

  if (!revealed) {
    return (
      <button
        type="button"
        onClick={() => setRevealed(true)}
        aria-label="Ver número de teléfono"
        className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
          tone === "dark"
            ? "border-chalk/40 text-chalk hover:bg-chalk hover:text-pine-deep focus-visible:outline-butter"
            : "border-pine/30 text-pine hover:bg-pine hover:text-chalk focus-visible:outline-butter-deep"
        }`}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-4 w-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
          />
        </svg>
        Ver teléfono
      </button>
    );
  }

  return (
    <a
      href={`tel:+${digits}`}
      aria-label={`Llamar al ${formatPhone(digits)}`}
      className={`inline-flex h-8 items-center rounded-full px-3 text-sm font-bold underline decoration-dotted underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
        tone === "dark"
          ? "text-chalk hover:text-butter focus-visible:outline-butter"
          : "text-pine hover:text-butter-deep focus-visible:outline-butter-deep"
      }`}
    >
      {formatPhone(digits)}
    </a>
  );
}
