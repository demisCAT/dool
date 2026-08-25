import { PhoneContact } from "./phone-contact";

export function Footer() {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";

  return (
    <footer className="bg-pine-deep py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 text-center">
        <p className="font-display text-3xl text-chalk">Divina Natales</p>
        <p className="font-hand text-2xl text-butter">
          hecho en casa, todos los días
        </p>
        {phone && (
          <p className="flex flex-wrap items-center justify-center gap-x-2 text-sm text-chalk/60">
            Pedidos por teléfono:
            <PhoneContact tone="dark" />
          </p>
        )}
        <a
          href="/admin/login"
          className="mt-2 text-xs text-chalk/35 transition-colors hover:text-chalk/70"
        >
          Acceso administrador
        </a>
      </div>
    </footer>
  );
}
