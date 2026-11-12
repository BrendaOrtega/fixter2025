import { Suspense, useState, type ReactNode } from "react";
import { Await, Form, useActionData, useNavigation, useSearchParams } from "react-router";
import { CallBoxBand } from "~/components/community/CallBoxes";
import { clubIncluded } from "~/components/community/clubIncluded";
import { DateTile, EnterCallButton, describeCall, useNow } from "../call";
import type { ClubData, ClubEvent, ClubPost } from "../types";
import { Avatar, card, postTitle, shortDate, timeAgo } from "../ui";
import { WorldScene } from "./WorldScene";

// Landing pública del club (quien todavía no es miembro). Diseño: docs/club-rediseno/
// mockup-landing-v2.html con los tokens de la casa v2. Usa los mismos `intent` que la página
// anterior (join, claim, call): aquí sólo cambia cómo se ve.
//
// ⚠️ No lleva la clase `club-v2`: en la landing la barra del sitio sí se muestra.
// ⚠️ Nada arranca invisible: la página se lee completa desde el HTML del servidor.

const section = "border-t border-[#232D33] py-14 md:py-[72px] lg:py-[88px]";
const wrap = "mx-auto w-full max-w-[1080px] px-4 sm:px-6";
const h2 = "text-[26px] font-bold leading-tight tracking-[-0.02em] text-[#F2F5F4] md:text-[34px]";
const kicker = "text-xs font-semibold uppercase tracking-[0.08em] text-brand-500";
const bigBtn =
  "inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-full px-6 text-[15px] font-semibold transition-colors";
const bigFill = `${bigBtn} bg-brand-500 text-background hover:bg-brand-100 disabled:cursor-default disabled:bg-[#1C252B] disabled:text-[#9AA7AA]`;
const bigGhost = `${bigBtn} border border-[#232D33] bg-[#141B20] text-[#F2F5F4] hover:bg-[#1C252B] disabled:cursor-default disabled:text-[#7C8A8E]`;

const CheckIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-1 shrink-0 text-brand-500">
    <path d="M3 8.5l3.2 3.2L13 4.8" />
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
    <rect x="3" y="7" width="10" height="7" rx="1.5" />
    <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden className="shrink-0 text-brand-500 transition-transform group-open:rotate-45">
    <path d="M8 3v10M3 8h10" />
  </svg>
);

/**
 * Unirse: pago mensual o anual, o los 3 meses gratis de quien ya es estudiante. Sin sesión, el
 * servidor manda a iniciar sesión y regresa aquí.
 */
function JoinBlock({ data, center = false, showError = false }: { data: ClubData; center?: boolean; showError?: boolean }) {
  const { community, isLoggedIn, canClaimGift } = data;
  const navigation = useNavigation();
  const intent = navigation.formData?.get("intent");
  // El checkout de Stripe tarda en crearse: el botón responde al clic, sin esperar al servidor.
  const pendingInterval = intent === "join" ? navigation.formData?.get("interval") ?? null : null;
  const claiming = intent === "claim";
  const actionData = useActionData<{ error?: string }>();
  const row = `flex flex-wrap gap-2.5 ${center ? "justify-center" : ""}`;
  const pay = (
    <Form method="post" className={row}>
      <input type="hidden" name="intent" value="join" />
      <button name="interval" value="month" disabled={!!pendingInterval} aria-busy={pendingInterval === "month"} className={canClaimGift ? bigGhost : bigFill}>
        {pendingInterval === "month"
          ? "Abriendo…"
          : isLoggedIn
            ? `Unirme por $${community.priceMxn} al mes`
            : "Inicia sesión para unirte"}
      </button>
      {isLoggedIn && community.priceAnnualMxn && (
        <button name="interval" value="year" disabled={!!pendingInterval} aria-busy={pendingInterval === "year"} className={bigGhost}>
          {pendingInterval === "year" ? "Abriendo…" : `$${community.priceAnnualMxn} al año · 2 meses gratis`}
        </button>
      )}
    </Form>
  );
  return (
    <div className={`grid gap-3 ${center ? "justify-items-center text-center" : ""}`}>
      {canClaimGift && (
        <>
          <Form method="post" className={row}>
            <button name="intent" value="claim" disabled={claiming} aria-busy={claiming} className={bigFill}>
              {claiming ? "Activando…" : "Activar mis 3 meses gratis"}
            </button>
          </Form>
          <p className="max-w-[46ch] text-sm text-[#7C8A8E]">
            Ya eres estudiante de FixterGeek: entras 3 meses sin tarjeta. Si prefieres pagar de una vez, el cobro
            empieza cuando terminen tus 3 meses gratis.
          </p>
        </>
      )}
      {pay}
      {showError && actionData?.error && !intent && (
        <p role="alert" className="text-sm text-[#F08A80]">
          {actionData.error}
        </p>
      )}
    </div>
  );
}

/** Renglón compacto del muro, como se ve adentro. */
function WallRow({ post }: { post: ClubPost }) {
  const replies = post.comments.length;
  return (
    <li className="flex items-center gap-3 border-b border-[#232D33] px-4 py-3 last:border-b-0">
      <Avatar person={post.author} size={32} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#F2F5F4]">{postTitle(post)}</p>
        <p className="truncate text-xs text-[#7C8A8E]" suppressHydrationWarning>
          {post.author.name} · {timeAgo(post.createdAt)}
          {replies > 0 ? ` · ${replies} ${replies === 1 ? "respuesta" : "respuestas"}` : ""}
        </p>
      </div>
    </li>
  );
}

/** Adelanto del muro: 3 publicaciones públicas, «Ver más» y cuántas quedan sólo para miembros. */
function WallPreview({ wall }: { wall: ClubData["wall"] }) {
  const PREVIEW = 3;
  const [showAll, setShowAll] = useState(false);
  return (
    <Suspense fallback={null}>
      <Await resolve={wall} errorElement={null}>
        {(loaded) => {
          if (!loaded || (loaded.posts.length === 0 && loaded.lockedCount === 0)) return null;
          const shown = showAll ? loaded.posts : loaded.posts.slice(0, PREVIEW);
          const hidden = loaded.posts.length - shown.length;
          return (
            <div className={`${card} mt-6 overflow-hidden`}>
              <p className="border-b border-[#232D33] bg-[#1C252B] px-4 py-2.5 text-xs font-semibold text-[#7C8A8E]">
                El muro del club
              </p>
              <ul>
                {shown.map((post) => (
                  <WallRow key={post.id} post={post} />
                ))}
              </ul>
              {hidden > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="block w-full border-t border-[#232D33] px-4 py-3 text-left text-sm font-semibold text-brand-500 hover:bg-[#182026]"
                >
                  Ver {hidden} {hidden === 1 ? "publicación más" : "publicaciones más"}
                </button>
              )}
              {loaded.lockedCount > 0 && (
                <p className="flex items-center gap-2 border-t border-[#232D33] bg-[#1C252B] px-4 py-3 text-sm text-[#7C8A8E]">
                  <LockIcon />
                  {loaded.lockedCount === 1
                    ? "1 publicación más, sólo para miembros"
                    : `${loaded.lockedCount} publicaciones más, sólo para miembros`}
                </p>
              )}
            </div>
          );
        }}
      </Await>
    </Suspense>
  );
}

/** La próxima llamada: fecha, cuánto falta, calendario y la puerta (invitado o sólo miembros). */
function NextCall({ event, slug, isCallGuest }: { event: ClubEvent; slug: string; isCallGuest: boolean }) {
  const now = useNow(1000);
  const call = describeCall(event, now);
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="flex items-start gap-3.5 p-4 sm:p-5">
        <DateTile month={call.month} day={call.dayOfMonth} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug text-[#F2F5F4]">{event.title}</p>
          <p className="mt-1 text-sm text-[#D9E0DE]" suppressHydrationWarning>
            {call.when}
          </p>
          <p className={`mt-1 text-xs ${call.isLive ? "font-semibold text-[#F08A80]" : "text-[#7C8A8E]"}`} suppressHydrationWarning>
            {call.status}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#232D33] bg-[#1C252B] px-4 py-3 sm:px-5">
        {isCallGuest ? (
          <EnterCallButton event={event} />
        ) : (
          <span className="flex items-center gap-2 text-sm text-[#7C8A8E]">
            <LockIcon />
            Sólo miembros
          </span>
        )}
        <a href={`/comunidad/${slug}/evento/${event.id}.ics`} className="text-sm font-semibold text-brand-500 hover:underline">
          Agregar a mi calendario
        </a>
      </div>
    </div>
  );
}

/** Títulos de las llamadas grabadas; verlas es de miembros. */
function LockedRecordings({ recordings }: { recordings: ClubData["recordings"] }) {
  return (
    <Suspense fallback={null}>
      <Await resolve={recordings} errorElement={null}>
        {(list) =>
          list.length === 0 ? null : (
            <div className={`${card} mt-4 overflow-hidden`}>
              <p className="flex items-center gap-2 border-b border-[#232D33] bg-[#1C252B] px-4 py-2.5 text-xs font-semibold text-[#7C8A8E]">
                <LockIcon />
                Llamadas grabadas · sólo miembros
              </p>
              <ul>
                {list.slice(0, 4).map((r) => (
                  <li key={r.id} className="border-b border-[#232D33] px-4 py-3 last:border-b-0">
                    <p className="truncate text-sm font-semibold text-[#F2F5F4]">{r.title}</p>
                    <p className="text-xs text-[#7C8A8E]" suppressHydrationWarning>
                      {shortDate(r.endedAt)}
                      {r.minutes ? ` · ${r.minutes} min` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )
        }
      </Await>
    </Suspense>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#17302C] text-[13px] font-bold text-brand-500">
        {n}
      </span>
      <div>
        <p className="font-semibold text-[#F2F5F4]">{title}</p>
        <p className="mt-0.5 text-sm text-[#7C8A8E]">{children}</p>
      </div>
    </li>
  );
}

const faqs = [
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí. Dentro del club, en la sección de tu membresía, cancelas en un clic y conservas el acceso hasta el fin del periodo pagado.",
  },
  {
    q: "¿Cuándo son las llamadas?",
    a: "La próxima aparece en esta página con su fecha y la puedes agregar a tu calendario. El botón para entrar se enciende 15 minutos antes.",
  },
  {
    q: "Ya compré un curso, ¿qué pasa con él?",
    a: "Es tuyo para siempre, aunque dejes el club. Además tienes 3 meses gratis: inicia sesión y actívalos aquí.",
  },
  {
    q: "¿Qué pasa con los cursos si cancelo?",
    a: "Los cursos incluidos se abren mientras seas miembro. Los que compraste por separado siguen siendo tuyos.",
  },
  {
    q: "¿Necesito saber programar?",
    a: "Ayuda, pero no es requisito. En las llamadas armamos agentes paso a paso y cualquiera puede preguntar.",
  },
];

export function ClubLanding(data: ClubData) {
  const { community, memberCount, courseCount, isLoggedIn, canClaimGift, wall, event, recordings, isCallGuest } = data;
  const [params] = useSearchParams();
  const justJoined = params.get("bienvenida") === "1";
  // «Llamada en vivo cada semana» no se promete: sólo se anuncia la que ya tiene fecha.
  const included = [
    ...clubIncluded(courseCount).map((item) =>
      item.title.includes("cada semana") ? { ...item, title: "Llamadas en vivo" } : item,
    ),
    {
      title: "El Mundo del club",
      body: "Cada miembro conectado es una nave. Vuelas la tuya, saludas y chateas con quien esté conectado.",
    },
  ];
  const facts = [
    memberCount > 0 ? `${memberCount} ${memberCount === 1 ? "miembro" : "miembros"}` : null,
    courseCount > 0 ? `${courseCount} cursos incluidos` : null,
    community.priceMxn ? `$${community.priceMxn} MXN al mes` : null,
  ].filter(Boolean);

  return (
    <main className="min-h-screen overflow-x-hidden bg-background pt-[44px] text-[#D9E0DE] md:pt-[60px] lg:pt-[78px]">
      {/* ── Hero ── */}
      <section className="py-14 text-center md:py-20 lg:py-24">
        <div className={wrap}>
          <span className="inline-block rounded-full border border-[#232D33] bg-[#141B20] px-3 py-1 text-xs font-semibold text-brand-500">
            Comunidad · FixterGeek
          </span>
          <h1 className="mx-auto mt-5 max-w-[14ch] lg:max-w-none text-[42px] font-bold leading-[1.02] tracking-[-0.035em] text-[#F2F5F4] md:text-[64px] lg:text-[80px]">
            {community.name}
          </h1>
          <p className="mx-auto mt-5 max-w-[52ch] text-[17px] leading-relaxed text-[#7C8A8E] md:text-xl">
            {community.description ||
              "Construimos agentes de IA en llamadas en vivo. Cada llamada queda grabada, el código se comparte y los cursos de FixterGeek están abiertos mientras eres miembro."}
          </p>
          {justJoined && !canClaimGift && (
            <p className="mx-auto mt-5 max-w-[44ch] rounded-[10px] bg-[#17302C] px-4 py-3 text-sm text-brand-500">
              Estamos confirmando tu pago; recarga en unos segundos.
            </p>
          )}
          <div className="mt-7">
            <JoinBlock data={data} center showError={!isCallGuest} />
          </div>
          {!isLoggedIn && (
            <p className="mx-auto mt-4 max-w-[46ch] text-sm text-[#7C8A8E]">
              ¿Ya eres estudiante de FixterGeek? Tienes 3 meses gratis.{" "}
              <a href={`/login?next=/comunidad/${community.slug}`} className="font-semibold text-brand-500 underline underline-offset-2">
                Inicia sesión
              </a>{" "}
              y se activan aquí.
            </p>
          )}
          {facts.length > 0 && (
            <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[#7C8A8E]">
              {facts.map((fact) => (
                <li key={fact} className="flex items-center gap-2">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  {fact}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Así se ve por dentro: el Mundo y el muro ── */}
      <section className={section}>
        <div className={wrap}>
          <p className={kicker}>Así se ve por dentro</p>
          <h2 className={`${h2} mt-2 max-w-[22ch]`}>Adentro hay un Mundo donde vuelas tu nave con los demás miembros</h2>
          <figure className={`${card} mt-6 overflow-hidden`}>
            <WorldScene className="block h-[240px] w-full sm:h-[320px] lg:h-[380px]" />
            <figcaption className="border-t border-[#232D33] px-4 py-3 text-sm text-[#7C8A8E]">
              Cada miembro conectado es una nave: Ghosty, un alien o un astronauta. Saludas y chateas mientras empieza la llamada.
            </figcaption>
          </figure>
          <WallPreview wall={wall} />
        </div>
      </section>

      {/* ── Qué incluye ── */}
      <section className={section}>
        <div className={wrap}>
          <h2 className={h2}>Qué incluye</h2>
          <ul className="mt-6 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
            {included.map((item) => (
              <li key={item.title} className="flex gap-3 border-b border-[#232D33] py-4">
                <CheckIcon />
                <div>
                  <p className="font-semibold text-[#F2F5F4]">{item.title}</p>
                  <p className="mt-0.5 text-sm text-[#7C8A8E]">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Próxima llamada + qué pasa cuando entras ── */}
      <section className={section}>
        <div className={`${wrap} grid gap-12 lg:grid-cols-2 lg:gap-14`}>
          {event && (
            <div>
              <h2 className={h2}>Próxima llamada en vivo</h2>
              <div className="mt-6">
                <NextCall event={event} slug={community.slug} isCallGuest={isCallGuest} />
              </div>
              <LockedRecordings recordings={recordings} />
            </div>
          )}
          <div>
            <h2 className={h2}>Qué pasa cuando entras</h2>
            <ol className="mt-6 grid gap-5">
              <Step n={1} title="Inicias sesión con tu correo">
                Eliges pago mensual o anual. Si ya compraste un curso o libro de FixterGeek, activas 3 meses gratis sin
                tarjeta.
              </Step>
              <Step n={2} title="Se abre el club">
                El Mundo, el muro, las grabaciones{courseCount > 0 ? ` y los ${courseCount} cursos` : ""} quedan
                disponibles en ese momento.
              </Step>
              <Step n={3} title="Entras a la llamada desde aquí">
                El botón «Entrar a la llamada» se enciende 15 minutos antes. La sala vive en esta misma página.
              </Step>
            </ol>
          </div>
        </div>
      </section>

      {/* ── Membresía ── */}
      <section className={section}>
        <div className={wrap}>
          <div className={`${card} grid gap-6 p-5 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center`}>
            <div>
              <span className="inline-block rounded-full bg-[#17302C] px-2.5 py-0.5 text-xs font-semibold text-brand-500">
                Membresía del club
              </span>
              {community.priceMxn && (
                <p className="mt-3 text-[34px] font-bold leading-none tracking-[-0.02em] text-[#F2F5F4]">
                  ${community.priceMxn} MXN <span className="text-base font-normal text-[#7C8A8E]">al mes</span>
                </p>
              )}
              <ul className="mt-4 grid gap-1.5 text-sm">
                {community.priceAnnualMxn && (
                  <li className="flex gap-2.5">
                    <CheckIcon />
                    <span>O ${community.priceAnnualMxn} MXN al año: pagas 10 meses y recibes 12.</span>
                  </li>
                )}
                <li className="flex gap-2.5">
                  <CheckIcon />
                  <span>Cancelas cuando quieras y conservas el acceso hasta el fin del periodo pagado.</span>
                </li>
                <li className="flex gap-2.5">
                  <CheckIcon />
                  <span>3 meses gratis, sin tarjeta, si ya compraste un curso o libro de FixterGeek.</span>
                </li>
              </ul>
            </div>
            <JoinBlock data={data} />
          </div>
        </div>
      </section>

      {/* ── Preguntas ── */}
      <section className={section}>
        <div className={`${wrap} max-w-[760px]`}>
          <h2 className={h2}>Antes de entrar</h2>
          <div className="mt-6 border-t border-[#232D33]">
            {faqs.map((f) => (
              <details key={f.q} className="group border-b border-[#232D33]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold text-[#F2F5F4] [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <PlusIcon />
                </summary>
                <p className="pb-4 text-[15px] text-[#7C8A8E]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cierre ── */}
      <section className={`${section} text-center`}>
        <div className={wrap}>
          <h2 className={`${h2} mx-auto max-w-[20ch]`}>
            {event ? "Tu nave ya tiene lugar en la próxima llamada" : "Tu nave ya tiene lugar en el Mundo"}
          </h2>
          <div className="mt-6">
            <JoinBlock data={data} center />
          </div>
          <CallBoxBand />
        </div>
      </section>
    </main>
  );
}
