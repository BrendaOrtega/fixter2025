import { useEffect, useState } from "react";
import {
  Form,
  data,
  redirect,
  useActionData,
  useSearchParams,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import type { Route } from "./+types/comunidad.$slug";
import { db } from "~/.server/db";
import { getUserOrNull } from "~/.server/dbGetters";
import {
  canClaimBuyerGift,
  claimBuyerGift,
  createBillingPortal,
  createMembershipCheckout,
  isMembershipActive,
} from "~/.server/services/membership.server";
import {
  COMMENT_MAX,
  POST_MAX,
  canModerate,
  canParticipate,
  cleanBody,
  createComment,
  createPost,
  getNextEvent,
  getWall,
  hideComment,
  hideOwnPost,
  imageUrlFor,
  isCallOpen,
  isOwnImageKey,
  moderatePost,
  toggleLike,
} from "~/.server/services/wall.server";
import {
  Composer,
  LockedPosts,
  PostCard,
  useWallRefresh,
} from "~/components/community/ClubWall";
import { MicIllustration } from "~/components/community/MicIllustration";
import { getCallLink } from "~/.server/services/club-call.server";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import getMetaTags from "~/utils/getMetaTags";

// Casa de una comunidad de pago (10-nov-2026): hero con la próxima llamada,
// muro (todos los miembros publican; dueño/ADMIN modera; las públicas son la
// vitrina), qué incluye y preguntas. La alta gratuita por correo sigue en /c/:slug.
//
// ⚠️ Nada del hero arranca en `opacity: 0`: Motion escribe ese estado en el HTML
// del servidor y, si la hidratación tarda, el título se queda transparente
// (lo que pasaba en /c/agentes). Aquí todo anima con CSS sobre lo que ya se ve.

export const meta = ({ data: d }: Route.MetaArgs) =>
  getMetaTags({
    title: d?.community ? `${d.community.name} | FixterGeek` : "Comunidad | FixterGeek",
    description: d?.community?.tagline || d?.community?.description || undefined,
    url: d?.community ? `https://www.fixtergeek.com/comunidad/${d.community.slug}` : undefined,
  });

async function loadCommunity(slug: string) {
  return db.community.findFirst({
    where: { slug, isActive: true, priceMxn: { not: null } },
    select: {
      id: true, slug: true, name: true, tagline: true, description: true,
      priceMxn: true, priceAnnualMxn: true, ownerId: true,
    },
  });
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const community = await loadCommunity(params.slug as string);
  if (!community) throw data("Comunidad no encontrada", { status: 404 });

  const user = await getUserOrNull(request);
  const membership = user
    ? await db.membership.findUnique({
        where: { communityId_userId: { communityId: community.id, userId: user.id } },
        select: { status: true, provider: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
      })
    : null;
  const isMember = isMembershipActive(membership);
  const canMod = canModerate(user, community);
  const isInside = canParticipate(user, membership, community);

  const [memberCount, wall, event, courseCount] = await Promise.all([
    db.membership.count({
      where: { communityId: community.id, status: { in: ["active", "past_due"] } },
    }),
    getWall({ communityId: community.id, isInside, canMod, viewerId: user?.id ?? null }),
    getNextEvent(community.id),
    db.course.count({ where: { isFree: false, published: true } }),
  ]);

  const { ownerId: _owner, ...publicCommunity } = community;
  return {
    community: publicCommunity,
    memberCount,
    courseCount,
    isLoggedIn: !!user,
    isMember,
    isInside,
    canMod,
    me: user
      ? {
          id: user.id,
          name: user.displayName || user.username || user.email.split("@")[0],
          photoURL: user.photoURL ?? null,
        }
      : null,
    membership,
    canClaimGift: !!user && !isInside && (await canClaimBuyerGift(user, community.id)),
    wall,
    event: event
      ? {
          title: event.title,
          startsAt: event.startsAt.toISOString(),
          endsAt: event.endsAt.toISOString(),
          open: isCallOpen(event),
        }
      : null,
  };
};

const isBot = (form: FormData) => {
  if (String(form.get("website") ?? "")) return true;
  const t = Number(form.get("t"));
  return !t || Date.now() - t < 1500;
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const slug = params.slug as string;
  const user = await getUserOrNull(request);
  if (!user) throw redirect(`/login?next=/comunidad/${slug}`);
  const community = await loadCommunity(slug);
  if (!community) throw data("Comunidad no encontrada", { status: 404 });

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  // ── Membresía ──
  if (intent === "claim") {
    if (await claimBuyerGift(user, community.id)) {
      throw redirect(`/comunidad/${slug}?bienvenida=1`);
    }
    return data({ error: "Este regalo no aplica para tu cuenta." }, { status: 400 });
  }
  if (intent === "join") {
    const interval = form.get("interval") === "year" ? "year" : "month";
    const url = await createMembershipCheckout({ user, communitySlug: slug, interval });
    if (url) throw redirect(url);
  }
  if (intent === "billing") {
    const url = await createBillingPortal(user.id, slug);
    if (url) throw redirect(url);
  }

  // ── Muro ──
  const membership = await db.membership.findUnique({
    where: { communityId_userId: { communityId: community.id, userId: user.id } },
    select: { status: true, currentPeriodEnd: true },
  });
  const canMod = canModerate(user, community);
  if (!canParticipate(user, membership, community)) {
    return data({ error: "Únete al club para participar." }, { status: 403 });
  }

  // ── Llamada en vivo: ticket de un solo uso (120 s) que se pide al dar clic ──
  if (intent === "call") {
    const event = await getNextEvent(community.id);
    if (!isCallOpen(event)) {
      return data({ error: "La llamada se abre 15 minutos antes." }, { status: 400 });
    }
    const link = await getCallLink(user, { host: canMod });
    if (link) throw redirect(link);
    return data({ error: "No pudimos abrir la sala. Intenta de nuevo en un momento." }, { status: 502 });
  }

  if (intent === "like") {
    await toggleLike(community.id, String(form.get("postId") ?? ""), user.id);
    return { ok: true };
  }

  if (intent === "post") {
    if (isBot(form)) return { ok: true }; // al bot se le dice que sí y no se guarda
    const body = cleanBody(form.get("body"), POST_MAX);
    if (!body) return data({ error: "Escribe algo (máximo 5,000 caracteres)." }, { status: 400 });
    const key = String(form.get("imageKey") ?? "");
    if (key && !isOwnImageKey(key, user.id)) {
      return data({ error: "Esa imagen no es válida." }, { status: 400 });
    }
    const res = await createPost({
      communityId: community.id,
      authorId: user.id,
      body,
      imageUrl: key ? imageUrlFor(key) : null,
    });
    return "error" in res ? data({ error: res.error }, { status: 429 }) : { ok: true };
  }

  if (intent === "comment") {
    if (isBot(form)) return { ok: true };
    const body = cleanBody(form.get("body"), COMMENT_MAX);
    if (!body) return data({ error: "Comentario vacío o muy largo." }, { status: 400 });
    const res = await createComment({
      communityId: community.id,
      postId: String(form.get("postId") ?? ""),
      authorId: user.id,
      body,
    });
    return "error" in res ? data({ error: res.error }, { status: 400 }) : { ok: true };
  }

  if (intent === "mod") {
    const postId = String(form.get("postId") ?? "");
    const change = String(form.get("change") ?? "");
    if (change === "hide-own") {
      await hideOwnPost(community.id, postId, user.id);
      return { ok: true };
    }
    const allowed = ["pin", "unpin", "public", "private", "hide", "unhide"] as const;
    if (!canMod || !allowed.includes(change as (typeof allowed)[number])) {
      return data({ error: "Sin permiso." }, { status: 403 });
    }
    await moderatePost(community.id, postId, change as (typeof allowed)[number]);
    return { ok: true };
  }

  if (intent === "hide-comment") {
    await hideComment(community.id, String(form.get("commentId") ?? ""), {
      authorId: canMod ? undefined : user.id,
    });
    return { ok: true };
  }

  return data({ error: "No se pudo completar la acción" }, { status: 400 });
};

// ── UI ───────────────────────────────────────────────────────────────────────

const mint = "#85DDCB";

const longDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Mexico_City",
  });
const upperFirst = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const pillBtn =
  "inline-flex items-center justify-center rounded-xl border-2 border-[#F2F5F4] px-6 py-3 font-bold transition active:translate-x-[3px] active:translate-y-[3px] active:shadow-none";

function Countdown({ startsAt, endsAt }: { startsAt: string; endsAt: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const when = upperFirst(new Date(startsAt).toLocaleString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
  }));
  if (now !== null && now >= start && now < end) {
    return <p className="text-2xl font-bold text-[#ef4444]">● En vivo ahora</p>;
  }
  if (now === null || now >= end) {
    return <p className="text-lg">{when} (CDMX)</p>;
  }
  const s = Math.floor((start - now) / 1000);
  const parts = [
    [Math.floor(s / 86400), "d"],
    [Math.floor((s % 86400) / 3600), "h"],
    [Math.floor((s % 3600) / 60), "m"],
    [s % 60, "s"],
  ] as const;
  return (
    <div>
      <div className="flex gap-2 font-mono">
        {parts
          .filter(([v, u], i) => v > 0 || u !== "d" || i > 0)
          .map(([v, u]) => (
            <span
              key={u}
              className="min-w-[3.2rem] rounded-xl border-2 border-[#F2F5F4] bg-[#0E1317] px-2 py-1 text-center text-2xl font-bold"
            >
              {String(v).padStart(2, "0")}
              <span className="ml-0.5 text-sm text-[#7C8A8E]">{u}</span>
            </span>
          ))}
      </div>
      <p className="mt-2 text-sm text-[#7C8A8E]">{when} (CDMX)</p>
    </div>
  );
}

function JoinCta({
  community,
  isLoggedIn,
  compact = false,
}: {
  community: { slug: string; priceMxn: number | null; priceAnnualMxn: number | null };
  isLoggedIn: boolean;
  compact?: boolean;
}) {
  return (
    <Form method="post" className="grid gap-3">
      <input type="hidden" name="intent" value="join" />
      <div className={`flex flex-wrap gap-3 ${compact ? "justify-center" : ""}`}>
        <button
          name="interval"
          value="month"
          className={`${pillBtn} bg-[#85DDCB] text-[#0E1317] shadow-[6px_6px_0_#F2F5F4]`}
        >
          {isLoggedIn ? `$${community.priceMxn}/mes` : "Inicia sesión para unirte"}
        </button>
        {isLoggedIn && community.priceAnnualMxn && !compact && (
          <button name="interval" value="year" className={`${pillBtn} text-[#85DDCB]`}>
            ${community.priceAnnualMxn}/año · 2 meses gratis
          </button>
        )}
      </div>
    </Form>
  );
}

const included = (courseCount: number) => [
  {
    icon: "📚",
    title: `Todos los cursos (${courseCount})`,
    body: "Los cursos de pago de FixterGeek abiertos mientras seas miembro: React, IA, Claude Code, agentes y más.",
  },
  {
    icon: "🎙",
    title: "Llamada en vivo cada semana",
    body: "Construimos un agente en vivo y respondemos tus dudas en la llamada.",
  },
  {
    icon: "📼",
    title: "Grabaciones de cada llamada",
    body: "¿No llegaste? Cada llamada queda grabada en el club para verla cuando quieras.",
  },
  {
    icon: "🧩",
    title: "Código y plantillas",
    body: "El repositorio de cada agente que construimos en vivo, listo para clonarlo y adaptarlo.",
  },
  {
    icon: "🧱",
    title: "Un muro de gente que construye",
    body: "Publica lo que armaste o lo que se te atoró. Los demás miembros y bliss te contestan.",
  },
  {
    icon: "🎟",
    title: "Precio de miembro en talleres",
    body: "Los talleres y eventos de pago tienen precio especial para miembros del club.",
  },
  {
    icon: "🎁",
    title: "3 meses gratis si ya compraste",
    body: "Quien compró un curso o libro en FixterGeek entra sin tarjeta durante tres meses.",
  },
];

const faqs = [
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí. Desde esta página, en «Administrar mi membresía», cancelas en un clic y conservas el acceso hasta el fin del periodo pagado.",
  },
  {
    q: "¿Cuándo son las llamadas?",
    a: "Cada semana. La próxima aparece arriba con su cuenta regresiva y el botón para entrar se enciende 15 minutos antes.",
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

export default function CommunityHome({ loaderData }: Route.ComponentProps) {
  const {
    community, memberCount, courseCount, isLoggedIn, isInside, canMod, me,
    membership, canClaimGift, wall, event,
  } = loaderData;
  const [params] = useSearchParams();
  const actionData = useActionData<{ error?: string }>();
  const justJoined = params.get("bienvenida") === "1";
  useWallRefresh(isInside);
  // Sin membresía la página sigue siendo landing: 3 publicaciones y «Ver más»,
  // para que lo de abajo (qué incluye, preguntas, cierre) quede a la vista.
  const PREVIEW = 3;
  const [showAll, setShowAll] = useState(false);
  const shownPosts = isInside || showAll ? wall.posts : wall.posts.slice(0, PREVIEW);
  const hiddenPublic = wall.posts.length - shownPosts.length;

  const joinBlock = canClaimGift ? (
    <div className="grid gap-4">
      <Form method="post">
        <button
          name="intent"
          value="claim"
          className={`${pillBtn} bg-[#fbbf24] text-[#0E1317] shadow-[6px_6px_0_#F2F5F4]`}
        >
          🎁 Activar mis 3 meses gratis
        </button>
      </Form>
      <p className="text-sm text-[#7C8A8E]">
        ¿Prefieres asegurar tu lugar de una vez? Paga ahora y el cobro empieza cuando terminen tus 3
        meses gratis.
      </p>
      <JoinCta community={community} isLoggedIn={isLoggedIn} />
    </div>
  ) : (
    <JoinCta community={community} isLoggedIn={isLoggedIn} />
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0E1317] pb-24 pt-28 text-[#F2F5F4]">
      {(justJoined && isInside) && <EmojiConfetti />}
      <style>{`
        @keyframes club-grid { to { background-position: 44px 44px } }
        @keyframes club-rise { from { transform: translateY(14px) } to { transform: none } }
        .club-grid { animation: club-grid 6s linear infinite; }
        .club-rise { animation: club-rise .6s cubic-bezier(.2,.8,.2,1) both; }
        @media (prefers-reduced-motion: reduce) { .club-grid,.club-rise { animation: none } }
      `}</style>
      {/* cuadrícula de fondo (CSS: se ve desde el HTML del servidor) */}
      <div
        aria-hidden
        className="club-grid pointer-events-none absolute inset-0 opacity-[0.1]"
        style={{
          backgroundImage: `linear-gradient(${mint} 1px, transparent 1px), linear-gradient(90deg, ${mint} 1px, transparent 1px)`,
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 80% 55% at 50% 20%, black 30%, transparent 75%)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 sm:px-6">
        {/* ── Hero ── */}
        <section className="flex flex-col-reverse gap-6 sm:flex-row sm:items-center sm:gap-10">
          <div className="club-rise min-w-0 flex-1">
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-[#85DDCB] px-4 py-1.5 text-sm font-bold text-[#85DDCB]">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#85DDCB]" />
              Club · FixterGeek
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] sm:text-6xl">{community.name}</h1>
            {community.tagline && (
              <p className="mt-4 text-lg text-[#85DDCB] sm:text-xl">{community.tagline}</p>
            )}
            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full border-2 border-[#F2F5F4]/30 px-3 py-1">
                {memberCount} miembros
              </span>
              <span className="rounded-full border-2 border-[#F2F5F4]/30 px-3 py-1">
                Llamada en vivo cada semana
              </span>
              <span className="rounded-full border-2 border-[#F2F5F4]/30 px-3 py-1">
                {courseCount} cursos incluidos
              </span>
              <span className="rounded-full border-2 border-[#F2F5F4]/30 px-3 py-1">
                ${community.priceMxn} MXN al mes
              </span>
            </div>
          </div>
          <div className="club-rise shrink-0 self-center">
            <MicIllustration className="h-auto w-[200px] sm:w-[260px]" />
          </div>
        </section>

        {/* ── Estado de quien mira ── */}
        <section className="mt-10">
          {isInside ? (
            <div className="rounded-2xl border-2 border-[#85DDCB] p-5">
              <p className="text-lg font-bold">
                {justJoined ? "¡Ya eres parte del club! 🎉" : `Hola, ${me?.name} 👋`}
              </p>
              {membership?.cancelAtPeriodEnd && membership.currentPeriodEnd && (
                <p className="mt-1 text-[#fbbf24]">
                  Tu membresía termina el{" "}
                  {longDate(membership.currentPeriodEnd)}.
                </p>
              )}
              {membership?.provider === "grant" && membership.currentPeriodEnd && (
                <div className="mt-3 rounded-xl border-2 border-dashed border-[#fbbf24] p-4">
                  <p className="text-sm">
                    🎁 Tus meses gratis van hasta el{" "}
                    <strong>{longDate(membership.currentPeriodEnd)}</strong>.
                    Asegura tu lugar desde ahora: no se cobra nada hasta esa fecha.
                  </p>
                  <div className="mt-3">
                    <JoinCta community={community} isLoggedIn />
                  </div>
                </div>
              )}
              {membership?.provider === "stripe" && (
                <Form method="post" className="mt-2">
                  <button name="intent" value="billing" className="text-sm text-[#85DDCB] underline">
                    Administrar mi membresía
                  </button>
                </Form>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-[#F2F5F4] p-6 shadow-[8px_8px_0_#85DDCB]">
              {canClaimGift ? (
                <>
                  <p className="text-2xl font-bold">Compraste un curso en FixterGeek 🎁</p>
                  <p className="mt-1">Tienes 3 meses gratis en el club, sin tarjeta.</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-black">
                    ${community.priceMxn} MXN <span className="text-base font-normal">al mes</span>
                  </p>
                  {community.priceAnnualMxn && (
                    <p className="text-[#85DDCB]">
                      o ${community.priceAnnualMxn} al año (dos meses gratis) · cancela cuando quieras
                    </p>
                  )}
                </>
              )}
              {justJoined && !canClaimGift && (
                <p className="mt-3 text-[#fbbf24]">Estamos confirmando tu pago; recarga en unos segundos.</p>
              )}
              <div className="mt-5">{joinBlock}</div>
              {!isLoggedIn && (
                <p className="mt-5 rounded-xl border-2 border-dashed border-[#fbbf24] p-3 text-sm text-[#fbbf24]">
                  🎁 ¿Ya compraste un curso en FixterGeek? Tienes <strong>3 meses gratis</strong>.{" "}
                  <a href={`/login?next=/comunidad/${community.slug}`} className="font-bold underline">
                    Inicia sesión
                  </a>{" "}
                  y se activan aquí.
                </p>
              )}
            </div>
          )}
        </section>

        {/* ── Próxima llamada ── */}
        {event && (
          <section className="mt-8 rounded-2xl border-2 border-[#F2F5F4] bg-[#85DDCB]/10 p-6 shadow-[8px_8px_0_#fbbf24]">
            <p className="text-sm font-bold uppercase tracking-wider text-[#fbbf24]">Próxima llamada</p>
            <h2 className="mt-1 text-2xl font-black">{event.title}</h2>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <Countdown startsAt={event.startsAt} endsAt={event.endsAt} />
              {isInside ? (
                <Form method="post">
                  <button
                    name="intent"
                    value="call"
                    disabled={!event.open}
                    className={`${pillBtn} bg-[#ef4444] text-[#F2F5F4] shadow-[6px_6px_0_#F2F5F4] disabled:bg-[#7C8A8E] disabled:shadow-none`}
                  >
                    {event.open ? "🎙 Entrar a la llamada" : "Se abre 15 min antes"}
                  </button>
                  {actionData?.error && (
                    <p className="mt-2 max-w-[16rem] text-sm text-[#fbbf24]">{actionData.error}</p>
                  )}
                </Form>
              ) : (
                <span className="rounded-xl border-2 border-dashed border-[#7C8A8E] px-4 py-3 text-sm text-[#7C8A8E]">
                  🔒 Sólo miembros
                </span>
              )}
            </div>
          </section>
        )}

        {/* ── Muro ── */}
        <section className="mt-14">
          <h2 className="text-2xl font-black sm:text-3xl">El muro</h2>
          <p className="mt-1 text-[#7C8A8E]">
            {isInside
              ? "Comparte lo que construyes, pregunta lo que se te atora."
              : "Esto es lo que se está platicando en el club."}
          </p>
          <div className="mt-6 grid gap-5">
            {isInside && me && <Composer me={me} />}
            {shownPosts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                viewerId={me?.id ?? null}
                canMod={canMod}
                canComment={isInside}
              />
            ))}
            {hiddenPublic > 0 && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="mx-auto rounded-xl border-2 border-[#F2F5F4] px-6 py-2.5 font-bold text-[#85DDCB] shadow-[4px_4px_0_#85DDCB] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                Ver {hiddenPublic} {hiddenPublic === 1 ? "publicación más" : "publicaciones más"}
              </button>
            )}
            {wall.posts.length === 0 && isInside && (
              <p className="rounded-2xl border-2 border-dashed border-[#7C8A8E] p-6 text-center text-[#7C8A8E]">
                Todavía no hay publicaciones. Estrena el muro: cuéntanos qué agente quieres construir.
              </p>
            )}
            {!isInside && (
              <LockedPosts count={wall.lockedCount} cta={<JoinCta community={community} isLoggedIn={isLoggedIn} compact />} />
            )}
          </div>
        </section>

        {/* ── Qué incluye ── */}
        <section className="mt-16">
          <h2 className="text-2xl font-black sm:text-3xl">Qué incluye</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {included(courseCount).map((c) => (
              <div key={c.title} className="rounded-2xl border-2 border-[#F2F5F4] p-5 shadow-[6px_6px_0_#85DDCB]">
                <p className="text-3xl">{c.icon}</p>
                <h3 className="mt-3 font-bold">{c.title}</h3>
                <p className="mt-1 text-sm text-[#F2F5F4]/80">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Preguntas ── */}
        <section className="mt-16">
          <h2 className="text-2xl font-black sm:text-3xl">Preguntas frecuentes</h2>
          <div className="mt-6 grid gap-3">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-2xl border-2 border-[#F2F5F4]/40 p-4 open:border-[#85DDCB]">
                <summary className="flex cursor-pointer list-none items-center justify-between font-bold">
                  {f.q}
                  <span className="text-[#85DDCB] transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-[#F2F5F4]/80">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {!isInside && (
          <section className="mt-16 text-center">
            <p className="text-2xl font-black">¿Construimos tu primer agente esta semana?</p>
            <div className="mt-5 flex justify-center">{joinBlock}</div>
          </section>
        )}
      </div>
    </main>
  );
}
