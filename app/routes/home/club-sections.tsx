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

// Contraste verificado el 10-nov-2026 (docs de cada plataforma y comparativas de 2026; fuentes en
// docs/comunidad/PLAN.md, «Precios para creadores»). Si cambian, se actualiza aquí y en el plan.
const infra = [
  {
    icon: "🎙",
    title: "Servidor de llamadas propio",
    body: "Tus miembros entran desde tu página con un clic; sin Zoom, sin ligas que se reenvían y sin tope de horas al mes.",
    vs: "Mighty Networks: 20 h de transmisión al mes en su plan base.",
  },
  {
    icon: "📡",
    title: "En vivo a YouTube y Facebook",
    body: "La misma llamada sale al mismo tiempo a tus canales: quien todavía no es miembro te ve y llega a tu comunidad.",
    vs: "Skool, Circle, Mighty y Kajabi no transmiten a tus canales; a lo más incrustan un YouTube Live.",
  },
  {
    icon: "🎞",
    title: "Grabación permanente con subtítulos",
    body: "Al colgar, la llamada queda en video 1080/720/480 con subtítulos y miniaturas, dentro de tu comunidad.",
    vs: "Skool Call: la grabación se descarga durante 14 días.",
  },
  {
    icon: "🔒",
    title: "Video sólo para miembros",
    body: "Cada reproducción va firmada y caduca: la liga no sirve fuera de tu comunidad.",
    vs: "Sin subir tus clases a YouTube como «ocultas».",
  },
  {
    icon: "💳",
    title: "Cobro en pesos",
    body: "Membresía mensual o anual con tarjeta; el miembro cancela solo y conserva el acceso hasta el fin de su periodo.",
    vs: "Las plataformas de fuera cobran su plan en dólares.",
  },
  {
    icon: "📅",
    title: "Recordatorios por correo y WhatsApp",
    body: "Llamadas que se repiten cada semana, aviso 24 h y 1 h antes por correo y WhatsApp, «agregar a mi calendario» e invitados con pase a una llamada.",
    vs: "WhatsApp, en camino: hoy el aviso sale por correo. Muro con insignias incluido.",
  },
];

/** 2 · La infraestructura que va con cada comunidad, contra lo que dan los demás. */
export function ClubIncludedSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-[5%] xl:px-0">
      <span className="text-xs font-semibold uppercase tracking-widest text-brand-500">Infraestructura incluida</span>
      <h2 className="mt-2 text-3xl font-bold text-white md:text-4xl">Tu comunidad trae su propio estudio en vivo</h2>
      <p className="mt-2 max-w-2xl text-colorParagraph">
        Lo mismo que ya corre en el Club de Agentes, con tu nombre, tu precio y tu tema.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {infra.map((c) => (
          <div key={c.title} className="flex flex-col rounded-3xl border border-colorOutline bg-backface p-6">
            <p className="text-3xl">{c.icon}</p>
            <h3 className="mt-4 text-lg font-semibold text-white">{c.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-colorParagraph">{c.body}</p>
            <p className="mt-4 border-t border-colorOutline pt-3 text-xs text-colorCaption">{c.vs}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── El modelo ────────────────────────────────────────────────────────────────

/** Stripe México: 3.6 % + $3 por cobro con tarjeta nacional, más IVA sobre la comisión. */
const stripeFee = (price: number) => (price * 0.036 + 3) * 1.16;
/** Tipo de cambio supuesto para comparar con los planes en dólares (se dice en pantalla). */
const USD_MXN = 18;

/** Propuesta de precios para creadores (beta, pendiente de aprobar por bliss). */
export const creatorPlans = [
  {
    name: "Arranque",
    monthly: 0,
    fee: 0.08,
    forWho: "Para empezar sin arriesgar nada",
    pitch: "No pagas cuota: FixterGeek se queda con el 8 % de lo que te paguen tus miembros. Si no cobras, no pagas.",
  },
  {
    name: "Creador",
    monthly: 590,
    fee: 0,
    forWho: "Cuando ya cobras más de $7,400 al mes",
    pitch: "Una cuota fija y FixterGeek no toma nada de lo que te pagan tus miembros.",
  },
  {
    name: "Escuela",
    monthly: 1490,
    fee: 0,
    forWho: "Para clases grandes o varias llamadas a la semana",
    pitch: "Lo mismo que Creador, más un servidor de llamadas sólo para tu comunidad.",
  },
];

// `ownProcessing`: Skool cobra con su propio procesador (2.9 % + US$0.30 ya incluye el cobro con
// tarjeta); Circle y Mighty cobran su comisión ENCIMA de Stripe.
const competitors = [
  { name: "Skool Pro", monthlyUsd: 99, fee: 0.029, ownProcessing: true, label: "US$99/mes + 2.9 % + US$0.30 por cobro" },
  { name: "Circle Professional", monthlyUsd: 89, fee: 0.02, ownProcessing: false, label: "US$89/mes + 2 % + Stripe" },
  { name: "Mighty Networks Launch", monthlyUsd: 79, fee: 0.02, ownProcessing: false, label: "US$79/mes + 2 % + Stripe" },
];

function competitorNet(members: number, price: number, c: (typeof competitors)[number]) {
  if (!c.ownProcessing) return netMonthly(members, price, { monthly: c.monthlyUsd * USD_MXN, fee: c.fee });
  return members * price - members * (price * c.fee + 0.3 * USD_MXN) - c.monthlyUsd * USD_MXN;
}

const mxn = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(Math.round(n)).toLocaleString("es-MX")}`;
const pct = (f: number) => String(Math.round(f * 1000) / 10);

/** Lo que le queda al creador al mes con un plan (después de Stripe y de la plataforma). */
export function netMonthly(members: number, price: number, plan: { monthly: number; fee: number }) {
  const gross = members * price;
  return gross - members * stripeFee(price) - gross * plan.fee - plan.monthly;
}

/** 3 · El modelo: cuánto deja una comunidad, para que te animes. */
export function CommunityModelSection() {
  const [members, setMembers] = useState(50);
  const [price, setPrice] = useState(199);
  const gross = members * price;
  // El plan que más le conviene con esos números.
  const best = creatorPlans.reduce((a, b) => (netMonthly(members, price, b) > netMonthly(members, price, a) ? b : a));
  const ours = netMonthly(members, price, best);
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-[5%] xl:px-0">
      <span className="text-xs font-semibold uppercase tracking-widest text-brand-500">El modelo</span>
      <h2 className="mt-2 max-w-3xl text-3xl font-bold !leading-snug text-white md:text-4xl">
        Una comunidad cobra cada mes; un curso se vende una vez
      </h2>
      <p className="mt-3 max-w-2xl text-colorParagraph">
        Tus miembros pagan mientras les sirva lo que pasa adentro: la llamada de cada semana, las grabaciones
        y la gente. Mueve los números con los de tu audiencia.
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-3xl border border-colorOutline bg-backface p-6 md:p-8">
          <label className="grid gap-2 text-sm text-colorParagraph">
            <span className="flex justify-between">
              Miembros <strong className="text-white">{members}</strong>
            </span>
            <input type="range" min={10} max={1000} step={10} value={members} onChange={(e) => setMembers(Number(e.target.value))} className="accent-brand-500" />
          </label>
          <label className="mt-6 grid gap-2 text-sm text-colorParagraph">
            <span className="flex justify-between">
              Precio al mes <strong className="text-white">{mxn(price)} MXN</strong>
            </span>
            <input type="range" min={49} max={999} step={10} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="accent-brand-500" />
          </label>
          <div className="mt-8 grid gap-1 border-t border-colorOutline pt-6">
            <p className="text-sm text-colorCaption">Cobras al mes</p>
            <p className="text-2xl font-semibold text-white">{mxn(gross)} MXN</p>
            <p className="mt-4 text-sm text-colorCaption">Te quedan, con el plan {best.name}</p>
            <p className="text-4xl font-bold text-brand-500 md:text-5xl">{mxn(ours)} MXN</p>
            <p className="mt-1 text-xs text-colorCaption">
              Ya descontadas la comisión de Stripe (3.6 % + $3 por cobro, más IVA) y la de FixterGeek.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-colorOutline bg-backface p-6 md:p-8">
          <p className="text-sm font-semibold text-white">Con esos mismos números en otra plataforma</p>
          <ul className="mt-4 grid gap-3">
            {competitors.map((c) => {
              const net = competitorNet(members, price, c);
              const diff = ours - net;
              return (
                <li key={c.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-colorParagraph">
                    {c.name}
                    <span className="block text-xs text-colorCaption">{c.label}</span>
                  </span>
                  <span className="text-right">
                    <span className="block text-white">te quedarían {mxn(net)}</span>
                    <span className={`block text-xs ${diff >= 0 ? "text-brand-500" : "text-colorCaption"}`}>
                      {diff >= 0 ? `${mxn(diff)} más con FixterGeek` : `${mxn(-diff)} más ahí`}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs text-colorCaption">
            A $18 por dólar. Sus planes base no transmiten a YouTube ni a Facebook.
          </p>
        </div>
      </div>

      <h3 className="mt-14 text-2xl font-bold text-white">Elige cómo le pagas a FixterGeek</h3>
      <p className="mt-2 max-w-3xl text-colorParagraph">
        Los tres planes traen todo lo de arriba. Sólo cambia cómo pagas: un porcentaje de lo que cobras o una
        cuota fija. El cobro con tarjeta (3.6 % + $3 por pago, más IVA) lo descuenta el banco y es igual en los tres.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {creatorPlans.map((p) => {
          const cost = p.monthly + gross * p.fee;
          const isBest = p.name === best.name;
          return (
            <div
              key={p.name}
              className={`flex flex-col rounded-3xl border p-6 ${isBest ? "border-brand-500 bg-brand-500/5" : "border-colorOutline bg-backface"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-lg font-semibold text-white">{p.name}</p>
                {isBest && (
                  <span className="rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-brand-900">
                    Te conviene
                  </span>
                )}
              </div>
              <p className="text-sm text-colorCaption">{p.forWho}</p>
              <p className="mt-4 text-3xl font-bold text-white">
                {p.monthly ? `${mxn(p.monthly)}` : `${pct(p.fee)} %`}
                <span className="text-sm font-normal text-colorCaption">
                  {p.monthly ? " MXN al mes" : " de lo que cobras"}
                </span>
              </p>
              <p className="mt-3 flex-1 text-sm text-colorParagraph">{p.pitch}</p>
              <p className="mt-4 border-t border-colorOutline pt-3 text-sm text-colorParagraph">
                Con {members} miembros a {mxn(price)}: pagas <strong className="text-white">{mxn(cost)}</strong> al mes
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-colorCaption">Precios de fundador para las primeras comunidades de la beta.</p>
    </section>
  );
}

/** 4 · La comunidad piloto, con lo que se está publicando en su muro. */
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

/** 5 · Cierre para creadores. */
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
