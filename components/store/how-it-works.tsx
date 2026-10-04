import { ADDRESS, MAPS_URL } from "@/lib/location";

const STEPS = [
  {
    n: "1",
    title: "Elige tus platos",
    text: "Revisa el menú del día y agrega todo lo que se te antoje.",
  },
  {
    n: "2",
    title: "Mándanos tu pedido",
    text: "Completa tus datos y envía el pedido por WhatsApp con un toque.",
  },
  {
    n: "3",
    title: "Recibe y disfruta",
    text: "Retira en el local o pide despacho a domicilio.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-pedir" className="bg-pine py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5">
        <p className="font-hand text-center text-3xl text-butter">así de simple</p>
        <h2 className="font-display mt-2 text-center text-4xl text-chalk sm:text-5xl">
          Cómo pedir
        </h2>

        <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step) => (
            <li key={step.n} className="text-center">
              <span className="font-display mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-butter/50 text-3xl text-butter">
                {step.n}
              </span>
              <h3 className="font-display mt-5 text-2xl text-chalk">
                {step.title}
              </h3>
              <p className="mt-2 text-chalk/70">{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex flex-col items-center gap-2 text-center">
          <p className="font-hand text-2xl text-butter">dónde encontrarnos</p>
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-full border-2 border-butter/50 px-6 text-sm font-bold text-chalk transition-colors hover:border-butter hover:bg-butter hover:text-pine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-butter"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5 shrink-0"
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
            {ADDRESS}
          </a>
          <p className="text-sm text-chalk/60">Ver en Google Maps</p>
        </div>
      </div>
    </section>
  );
}
