import { Link } from "react-router";

/**
 * CTA del taller Software Factory en la home. Sólo mide interés: lleva a la
 * lista de espera de una pantalla (`/software-factory`).
 */
export const SoftwareFactoryBand = () => (
  <section className="px-4 py-6 sm:px-8">
    <Link
      to="/software-factory"
      className="group mx-auto flex max-w-5xl flex-col gap-4 rounded-3xl border-2 border-[#0E1317] bg-[#85DDCB] p-6 text-[#0E1317] shadow-[8px_8px_0_#37AB93] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between sm:p-8"
    >
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em]">
          Próximamente · Taller en vivo
        </p>
        <h2 className="mt-2 text-2xl font-black sm:text-3xl">
          Software Factory
        </h2>
        <p className="mt-2 max-w-xl text-sm sm:text-base">
          Monta tu fábrica de software: agentes de código que toman tickets,
          abren PRs y despliegan mientras tú revisas.
        </p>
      </div>
      <span className="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-[#0E1317] bg-[#0E1317] px-6 py-3 text-sm font-bold text-[#8DCF6E] transition-transform group-hover:scale-105">
        Quiero enterarme →
      </span>
    </Link>
  </section>
);
