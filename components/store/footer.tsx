import { PhoneContact } from "./phone-contact";
import { ADDRESS, MAPS_URL } from "@/lib/location";

export function Footer() {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";

  return (
    <footer className="bg-pine-deep py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 text-center">
        <p className="font-display text-3xl text-chalk">Divina Natales</p>
        <p className="font-hand text-2xl text-butter">
          hecho en casa, todos los días
        </p>
        <p className="flex flex-wrap items-center justify-center gap-x-2 text-sm text-chalk/60">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4 shrink-0"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
            />
          </svg>
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dotted underline-offset-4 transition-colors hover:text-butter"
          >
            {ADDRESS}
          </a>
        </p>
        {phone && (
          <p className="flex flex-wrap items-center justify-center gap-x-2 text-sm text-chalk/60">
            Pedidos por teléfono:
            <PhoneContact tone="dark" />
          </p>
        )}
      </div>
    </footer>
  );
}
