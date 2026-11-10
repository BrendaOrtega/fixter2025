// Primeras secciones de la home desde el pivote (10-nov-2026): FixterGeek vende su plataforma de
// comunidades a otros creadores, y el Club de Agentes de IA es la comunidad piloto donde se prueba
// cada función antes de ofrecerla. Lo de antes (cursos, MentorIA, libros) sigue debajo.
//
// ⚠️ Nada con `opacity: 0` inicial: es lo primero que se ve y el HTML del servidor tiene que
// llegar visible aunque la hidratación tarde.
import { useEffect, useState } from "react";
import { Link, useFetcher } from "react-router";
import { PrimaryButton } from "~/components/common/PrimaryButton";
import { MicIllustration } from "~/components/community/MicIllustration";

const CLUB = "/comunidad/club-de-agentes";
/** Lista de espera: `/api/waitlist` le pone el tag `espera-comunidades` al suscriptor. */
const WAITLIST_SLUG = "comunidades";

export type HomeClub = {
  memberCount: number;
  courseCount: number;
  priceMxn: number;
  nextCall: { title: string; startsAt: string } | null;
  posts: Array<{
    id: string;
    author: { name: string; photoURL: string | null };
    body: string;
    createdAt: string;
    link: { url: string; title: string; image: string | null } | null;
  }>;
};

const callDate = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
  });

/** Texto plano de un cuerpo en markdown, para el adelanto. */
const excerpt = (md: string, max = 180) => {
  const t = md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[#*_>`-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t;
};

function Avatar({ name, photoURL }: { name: string; photoURL: string | null }) {
  return photoURL ? (
    <img src={photoURL} alt={name} className="h-9 w-9 rounded-full object-cover" />
  ) : (
    <span className="grid h-9 w-9 place-content-center rounded-full bg-brand-500 font-bold text-brand-900">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

/** Correo para la lista de espera de creadores. */
function WaitlistForm({ center = false }: { center?: boolean }) {
  const fetcher = useFetcher<{ success?: boolean; error?: string }>();
  // Marca de tiempo para el guard anti-bot (un humano tarda más de 1.5 s en escribir su correo).
  const [t, setT] = useState("");
  useEffect(() => setT(String(Date.now())), []);
  if (fetcher.data?.success) {
    return (
      <p className={`rounded-2xl border border-brand-500/40 bg-brand-500/10 px-5 py-4 text-brand-500 ${center ? "mx-auto max-w-lg" : "max-w-lg"}`}>
        ¡Listo! Te escribimos en cuanto abramos los primeros lugares para creadores.
      </p>
    );
  }
  return (
    <fetcher.Form method="post" action="/api/waitlist" className={`grid max-w-lg gap-2 ${center ? "mx-auto" : ""}`}>
      <input type="hidden" name="courseSlug" value={WAITLIST_SLUG} />
      <input type="hidden" name="t" value={t} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          name="email"
          required
          placeholder="tu@correo.com"
          className="h-12 flex-1 rounded-full border border-colorOutline bg-backface px-5 text-white placeholder:text-colorCaption focus:border-brand-500 focus:outline-none"
        />
        <button
          disabled={fetcher.state !== "idle"}
          className="h-12 rounded-full bg-brand-500 px-6 font-semibold text-brand-900 transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {fetcher.state !== "idle" ? "Enviando…" : "Quiero mi comunidad"}
        </button>
      </div>
      {fetcher.data?.error && <p className="text-sm text-danger">{fetcher.data.error}</p>}
    </fetcher.Form>
  );
}

/** 1 · Lo que vende FixterGeek ahora: tu propia comunidad de pago. */
export function ClubHomeHero({ club }: { club: HomeClub }) {
  return (
    <section className="relative w-full overflow-hidden bg-background px-4 pb-20 pt-32 md:px-10 md:pt-40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(#85DDCB 1px, transparent 1px), linear-gradient(90deg, #85DDCB 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 75%)",
        }}
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.3fr_1fr]">
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-500">
            <span className="h-2 w-2 rounded-full bg-brand-500" /> Comunidades FixterGeek · beta
          </span>
          <h1 className="mt-6 text-4xl font-bold !leading-tight text-white md:text-5xl xl:text-6xl">
            Abre tu comunidad de pago y <span className="text-brand-500">da clases en vivo</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-colorParagraph lg:mx-0">
            Cobra una membresía mensual a tu gente, junta a tus miembros en un muro y da llamadas en vivo
            desde tu propia página. Cada llamada se graba sola para tus miembros y sale al mismo tiempo a
            YouTube y Facebook.
          </p>
          <div className="mt-8 flex justify-center lg:justify-start">
            <WaitlistForm />
          </div>
          <p className="mt-4 text-sm text-colorCaption">
            Abrimos lugares por tandas.{" "}
            <Link to={CLUB} className="font-semibold text-brand-500 hover:underline">
              Mira la comunidad piloto →
            </Link>
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          <MicIllustration className="h-auto w-[200px] md:w-[240px]" />
          <Link
            to={CLUB}
            className="w-full max-w-sm rounded-3xl border border-brand-500/30 bg-backface p-6 transition hover:-translate-y-1 hover:border-brand-500/60"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">Comunidad piloto</p>
            <p className="mt-2 text-lg font-semibold text-white">Club de Agentes de IA</p>
            <p className="mt-1 text-sm text-colorCaption">{club.memberCount} miembros · llamada en vivo cada semana</p>
            {club.nextCall && (
              <p className="mt-3 border-t border-colorOutline pt-3 text-sm text-colorParagraph" suppressHydrationWarning>
                Próxima transmisión en vivo: {callDate(club.nextCall.startsAt)} (CDMX)
              </p>
            )}
          </Link>
        </div>
      </div>
    </section>
  );
}

const features = [
  { icon: "💳", title: "Membresía mensual o anual", body: "Tus miembros pagan con tarjeta en pesos; cancelan solos desde su cuenta y conservan el acceso hasta fin de mes." },
  { icon: "🎙", title: "Llamadas con sala propia", body: "Tus miembros entran desde tu página con un clic, sin Zoom y sin ligas que se reenvían." },
  { icon: "📡", title: "En vivo a YouTube y Facebook", body: "La misma llamada sale al mismo tiempo a tus canales para que la vean quienes todavía no son miembros." },
  { icon: "🎞", title: "Grabación automática", body: "Al colgar, la llamada queda en video con subtítulos dentro de tu comunidad, sólo para miembros." },
  { icon: "📅", title: "Calendario y recordatorios", body: "Eventos que se repiten cada semana, correo 24 h y 1 h antes y «agregar a mi calendario»." },
  { icon: "🎟", title: "Muro, insignias e invitados", body: "Publicaciones, comentarios e insignias; invitas por correo con meses de regalo o pase a una llamada." },
];

/** 2 · Qué trae cada comunidad. */
export function ClubIncludedSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-[5%] xl:px-0">
      <h2 className="text-3xl font-bold text-white md:text-4xl">Todo lo que trae tu comunidad</h2>
      <p className="mt-2 max-w-2xl text-colorParagraph">
        Lo mismo que ya funciona en el Club de Agentes, con tu nombre, tu precio y tu tema.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((c) => (
          <div key={c.title} className="rounded-3xl border border-colorOutline bg-backface p-6">
            <p className="text-3xl">{c.icon}</p>
            <h3 className="mt-4 text-lg font-semibold text-white">{c.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-colorParagraph">{c.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** 3 · La comunidad piloto, con lo que se está publicando en su muro. */
export function ClubWallPreview({ club }: { club: HomeClub }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-[5%] xl:px-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-500">Comunidad piloto</span>
          <h2 className="mt-2 text-3xl font-bold text-white md:text-4xl">Club de Agentes de IA</h2>
          <p className="mt-2 max-w-2xl text-colorParagraph">
            Nuestra propia comunidad: aquí estrenamos cada función antes de dártela. Una llamada en vivo
            cada semana, {club.courseCount} cursos incluidos y ${club.priceMxn} MXN al mes.
          </p>
        </div>
        <PrimaryButton as="Link" to={CLUB} variant="fill" title="Entra al club" />
      </div>
      {club.posts.length > 0 && (
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {club.posts.map((p) => (
            <Link
              key={p.id}
              to={CLUB}
              className="flex flex-col overflow-hidden rounded-3xl border border-colorOutline bg-backface transition hover:-translate-y-1 hover:border-brand-500/50"
            >
              {p.link?.image && (
                <img src={p.link.image} alt="" loading="lazy" className="aspect-[1200/630] w-full object-cover" />
              )}
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center gap-3">
                  <Avatar {...p.author} />
                  <p className="text-sm font-semibold text-white">{p.author.name}</p>
                </div>
                <p className="mt-4 text-colorParagraph">{p.link?.title ?? excerpt(p.body)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

/** 4 · Cierre para creadores. */
export function CreatorCommunitiesBand() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-[5%] xl:px-0">
      <div className="rounded-3xl border border-brand-500/20 bg-brand-500/5 p-8 text-center md:p-12 lg:p-16">
        <h2 className="mx-auto max-w-3xl text-3xl font-bold !leading-snug text-white md:text-4xl">
          ¿Enseñas algo y tienes gente que te sigue?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-colorParagraph">
          Déjanos tu correo y te escribimos cuando abramos la siguiente tanda de comunidades. Si prefieres
          platicarlo, escríbenos a{" "}
          <a href="mailto:brenda@fixter.org?subject=Quiero%20mi%20comunidad%20en%20FixterGeek" className="text-brand-500 hover:underline">
            brenda@fixter.org
          </a>
          .
        </p>
        <div className="mt-8">
          <WaitlistForm center />
        </div>
      </div>
    </section>
  );
}
