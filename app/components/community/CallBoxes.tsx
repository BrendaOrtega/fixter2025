// Venta de «cajas de llamadas» (12-nov-2026): la sala de videollamadas del club, rentada por
// separado a quien sólo necesita las llamadas. Cada caja es un servidor propio con límites.
// Aún no hay cobro en línea: el correo entra a `/api/waitlist` con el tag `espera-caja-<plan>`
// y se da de alta a mano.
//
// ⚠️ Nada con `opacity: 0` inicial (misma regla que `home/club-sections.tsx`).
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";

/** Precios de lanzamiento (primer año). Los límites son los que hace cumplir la caja. */
export const callBoxes = [
  {
    id: "asesoria",
    name: "Caja Asesoría",
    priceMxn: 199,
    forWho: "Para asesorías y clases chicas",
    limits: ["10 personas conectadas", "1 sala a la vez", "Grabación de hasta 60 min", "Pantalla compartida y chat"],
  },
  {
    id: "taller",
    name: "Caja Taller",
    priceMxn: 449,
    forWho: "Para talleres y clases en grupo",
    limits: [
      "30 personas conectadas",
      "3 salas a la vez",
      "Grabación de hasta 2 horas",
      "Transmisión a YouTube y Facebook",
      "Tus colores y tu logo en la sala",
    ],
  },
  {
    id: "evento",
    name: "Caja Evento",
    priceMxn: 990,
    forWho: "Para webinars y lanzamientos",
    limits: [
      "100 personas en la sala",
      "Público abierto por YouTube",
      "5 salas a la vez",
      "2 grabaciones a la vez, de hasta 4 horas",
      "Tus colores y tu logo en la sala",
    ],
  },
] as const;

type BoxId = (typeof callBoxes)[number]["id"];

/** Correo + caja elegida → lista de espera con tag por plan. */
function BoxRequestForm({ box }: { box: (typeof callBoxes)[number] }) {
  const fetcher = useFetcher<{ success?: boolean; error?: string }>();
  // Marca de tiempo para el guard anti-bot (un humano tarda más de 1.5 s en escribir su correo).
  const [t, setT] = useState("");
  useEffect(() => setT(String(Date.now())), []);
  if (fetcher.data?.success) {
    return (
      <p className="mx-auto max-w-lg rounded-2xl border border-brand-500/40 bg-brand-500/10 px-5 py-4 text-brand-500">
        ¡Listo! Te escribimos hoy mismo para dejar lista tu {box.name}.
      </p>
    );
  }
  return (
    <fetcher.Form method="post" action="/api/waitlist" className="mx-auto grid max-w-lg gap-2">
      <input type="hidden" name="courseSlug" value={`caja-${box.id}`} />
      <input type="hidden" name="t" value={t} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          name="email"
          required
          placeholder="tu@correo.com"
          aria-label="Tu correo"
          className="h-12 flex-1 rounded-full border border-colorOutline bg-backface px-5 text-white placeholder:text-colorCaption focus:border-brand-500 focus:outline-none"
        />
        <button
          disabled={fetcher.state !== "idle"}
          className="h-12 rounded-full bg-brand-500 px-6 font-semibold text-brand-900 transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {fetcher.state !== "idle" ? "Enviando…" : `Quiero la ${box.name}`}
        </button>
      </div>
      {fetcher.data?.error && <p className="text-sm text-danger">{fetcher.data.error}</p>}
    </fetcher.Form>
  );
}

/** Home: las tres cajas, una sola sección. */
export function CallBoxesSection() {
  const [picked, setPicked] = useState<BoxId>("taller");
  const box = callBoxes.find((b) => b.id === picked)!;
  return (
    <section id="cajas" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 md:px-[5%] xl:px-0">
      <span className="text-xs font-semibold uppercase tracking-widest text-brand-500">Cajas de llamadas</span>
      <h2 className="mt-2 max-w-3xl text-3xl font-bold !leading-snug text-white md:text-4xl">
        ¿Sólo necesitas la sala de llamadas?
      </h2>
      <p className="mt-3 max-w-2xl text-colorParagraph">
        Renta la misma sala donde corre el Club de Agentes: un servidor de videollamadas sólo para ti, dentro de
        tu sitio o de tu comunidad, con grabación en video.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {callBoxes.map((b) => {
          const on = b.id === picked;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setPicked(b.id)}
              aria-pressed={on}
              className={`flex flex-col rounded-3xl border p-6 text-left transition ${on ? "border-brand-500 bg-brand-500/5" : "border-colorOutline bg-backface hover:border-brand-500/50"}`}
            >
              <span className="text-lg font-semibold text-white">{b.name}</span>
              <span className="text-sm text-colorCaption">{b.forWho}</span>
              <span className="mt-4 text-3xl font-bold text-white">
                ${b.priceMxn.toLocaleString("es-MX")}
                <span className="text-sm font-normal text-colorCaption"> MXN al mes</span>
              </span>
              <ul className="mt-4 grid gap-2 border-t border-colorOutline pt-4 text-sm text-colorParagraph">
                {b.limits.map((l) => (
                  <li key={l} className="flex gap-2">
                    <span aria-hidden className="text-brand-500">✓</span>
                    {l}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <BoxRequestForm key={box.id} box={box} />
        <p className="mt-4 text-sm text-colorCaption">
          Precios de lanzamiento, fijos durante tus primeros 12 meses. La damos de alta contigo, el mismo día.
        </p>
      </div>
    </section>
  );
}

/** Landing de una comunidad: una sola línea que manda a las cajas de la home. */
export function CallBoxBand() {
  return (
    <a
      href="/#cajas"
      className="mt-16 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100/10 bg-brand-900/40 px-5 py-4 transition hover:border-brand-500/50"
    >
      <span className="text-sm text-brand-100">
        <strong className="text-white">¿Das clases o asesorías en vivo?</strong> Renta una sala de llamadas como la
        de esta comunidad, desde ${callBoxes[0].priceMxn} MXN al mes.
      </span>
      <span className="text-sm font-semibold text-brand-500">Ver las cajas →</span>
    </a>
  );
}
