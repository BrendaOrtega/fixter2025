import { Link } from "react-router";

/**
 * CTA del nuevo curso en la home, debajo del hero.
 * El teaser en shorts cierra con "Regístrate en fixtergeek.com": quien llega
 * de ahí necesita encontrar la lista de espera sin buscarla.
 */
export const AnimacionesAiBand = () => (
  <section className="px-4 py-6 sm:px-8">
    <Link
      to="/animaciones-ai"
      className="group mx-auto flex max-w-5xl flex-col gap-4 rounded-3xl border border-[#7c3aed]/50 bg-[#14121c] p-6 transition-colors hover:border-[#fbbf24]/70 sm:flex-row sm:items-center sm:justify-between sm:p-8"
    >
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#fbbf24]">
          Nuevo curso · Octubre 2026
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[#f5f3ff] sm:text-3xl">
          Animaciones con AI
        </h2>
        <p className="mt-2 max-w-xl text-sm text-[#f5f3ff]/70 sm:text-base">
          Construyes componentes 3D, presentaciones animadas y
          micro-interacciones con Motion y AI.
        </p>
      </div>
      <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#fbbf24] px-6 py-3 text-sm font-bold text-[#0b0b0f] transition-transform group-hover:scale-105">
        Únete a la lista de espera →
      </span>
    </Link>
  </section>
);
