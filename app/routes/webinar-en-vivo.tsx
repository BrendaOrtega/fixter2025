import { redirect, type LoaderFunctionArgs } from "react-router";
import getMetaTags from "~/utils/getMetaTags";
import {
  proximoWebinar,
  webinarsDisponibles,
} from "~/utils/webinarDates";

/** Cuando ya pasaron todos los webinars, la sala habla de la serie. */
const SERIE = "Diseño de sistemas agénticos";

/**
 * URL estable de la sala del webinar. Los correos (confirmación y
 * recordatorios ya programados) apuntan aquí, así el link real de la sala se
 * define después con la variable de entorno WEBINAR_ROOM_URL — sin tener que
 * reeditar correos que ya salieron.
 */
export const meta = () =>
  getMetaTags({
    title: `Webinar en vivo | ${proximoWebinar()?.title ?? SERIE} | FixterGeek`,
    description:
      "Acceso a la sala del webinar gratuito sobre diseño de sistemas agénticos.",
    url: "https://www.fixtergeek.com/webinar-en-vivo",
  });

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const roomUrl = process.env.WEBINAR_ROOM_URL;
  if (roomUrl) throw redirect(roomUrl);
  return null;
};

export default function WebinarEnVivo() {
  // El tema de la sesión que sigue, no el de la serie: cada webinar es distinto.
  const proximo = proximoWebinar();
  const disponibles = webinarsDisponibles();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0E1317] px-6 text-center text-zinc-100">
      <div className="max-w-md">
        <span className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-5 py-2 text-sm font-medium text-brand-500">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-500" />
          Webinar gratuito
        </span>
        <h1 className="text-3xl font-black leading-tight sm:text-4xl">
          {proximo?.title ?? SERIE}
        </h1>
        {proximo && <p className="mt-3 text-zinc-400">{proximo.subtitle}.</p>}
        {disponibles.length > 0 ? (
          <>
            <p className="mt-5 leading-relaxed text-zinc-400">
              La sala todavía no abre. Se abre 10 minutos antes de cada sesión:
            </p>
            {/* Solo las fechas que faltan: listar las que ya pasaron hace dudar
                de si uno se metió al link equivocado. */}
            <ul className="mt-5 space-y-2 text-zinc-300">
              {disponibles.map((slot) => (
                <li key={slot.id} className="font-mono text-sm">
                  {slot.short}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-5 leading-relaxed text-zinc-400">
            Esta serie de webinars ya terminó. La grabación y el taller completo
            están en la página del taller.
          </p>
        )}
        <p className="mt-8 text-sm text-zinc-500">
          Vuelve a este mismo link a la hora del webinar. Si tienes dudas,
          escríbeme por{" "}
          <a
            href="https://wa.me/527712412825"
            className="text-brand-500 underline underline-offset-4"
          >
            WhatsApp
          </a>
          .
        </p>
        <a
          href="/sistemas-agenticos"
          className="mt-8 inline-block rounded-xl border border-brand-500/40 bg-brand-500/10 px-6 py-3 text-sm font-bold text-brand-500 transition hover:bg-brand-500/20"
        >
          Ver el taller completo →
        </a>
      </div>
    </main>
  );
}
