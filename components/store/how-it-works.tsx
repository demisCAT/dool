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
    title: "Retira y disfruta",
    text: "Pasa a buscar tu comida calentita y lista para servir.",
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
      </div>
    </section>
  );
}
