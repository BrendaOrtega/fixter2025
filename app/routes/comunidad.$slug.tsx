import { Suspense, useEffect, useState } from "react";
import {
  Await,
  Form,
  data,
  redirect,
  useActionData,
  useFetcher,
  useNavigation,
  useSearchParams,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import type { Route } from "./+types/comunidad.$slug";
import { db } from "~/.server/db";
import { toggleGoing } from "~/.server/services/club-events.server";
import { getUserOrNull } from "~/.server/dbGetters";
import {
  claimBuyerGift,
  createBillingPortal,
  createMembershipCheckout,
  isCourseBuyer,
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
  avatarUrlFor,
  isCallOpen,
  isOwnImageKey,
  moderatePost,
  toggleLike,
} from "~/.server/services/wall.server";
import {
  Composer,
  LockedPosts,
  PostCard,
  WallSkeleton,
  useWallRefresh,
} from "~/components/community/ClubWall";
import {
  listRecordings,
  recordingState,
  startRecording,
  stopRecording,
} from "~/.server/services/club-recording.server";
import { applyInvite, isCallGuestToday } from "~/.server/services/club-invites.server";
import { badgesForMembers } from "~/.server/services/badges.server";
import { ClubVideo } from "~/components/community/ClubVideo";
import { clubIncluded as included } from "~/components/community/clubIncluded";
import { CommunityIllustration } from "~/components/community/CommunityIllustration";
import { getCallLink, isHostEmail, type CallSkin } from "~/.server/services/club-call.server";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import getMetaTags from "~/utils/getMetaTags";
import { ClubV2 } from "~/components/community/v2/ClubV2";

// Casa de una comunidad de pago (10-nov-2026): hero con la próxima llamada,
// grabaciones, qué incluye, preguntas, invitación a unirse y, al final, el muro
// (todos los miembros publican; dueño/ADMIN modera; las públicas son la
// vitrina). La alta gratuita por correo sigue en /c/:slug.
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
      priceMxn: true, priceAnnualMxn: true, ownerId: true, callSkin: true,
    },
  });
}

// Lo diferido nunca tumba la página: si tarda más que el corte del stream (5 s en
// entry.server) o falla, se resuelve con su valor de respaldo.
const DEFER_TIMEOUT_MS = 4000;
function settle<T, F>(work: Promise<T>, fallback: F): Promise<T | F> {
  return Promise.race([
    work.catch((e) => {
      console.error("[club] dato diferido falló:", e instanceof Error ? e.message : e);
      return fallback;
    }),
    new Promise<F>((resolve) => setTimeout(() => resolve(fallback), DEFER_TIMEOUT_MS)),
  ]);
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  // La comunidad y la sesión no dependen una de la otra.
  const [community, user] = await Promise.all([
    loadCommunity(params.slug as string),
    getUserOrNull(request),
  ]);
  if (!community) throw data("Comunidad no encontrada", { status: 404 });

  // Camino crítico (lo que pinta el hero, el estado de quien mira y la próxima llamada), todo en
  // paralelo. La identidad es la única cadena en serie: invitación → membresía → regalo.
  const identity = (async () => {
    // Invitado: el regalo se aplica solo al entrar con su correo (antes de leer la membresía).
    const invite = user ? await applyInvite(user, community.id) : null;
    const membership = user
      ? await db.membership.findUnique({
          where: { communityId_userId: { communityId: community.id, userId: user.id } },
          select: { status: true, provider: true, currentPeriodEnd: true, cancelAtPeriodEnd: true, interval: true },
        })
      : null;
    const isMember = isMembershipActive(membership);
    const isInside = canParticipate(user, membership, community);
    // Mismo criterio que `canClaimBuyerGift`, sin volver a leer la membresía.
    const canClaimGift =
      !!user && !isInside && membership?.provider !== "grant" && !isMember && (await isCourseBuyer(user));
    return { invite, membership, isMember, isInside, canClaimGift };
  })();
  const [{ invite, membership, isMember, isInside, canClaimGift }, memberCount, event, courseCount, recordingCount] =
    await Promise.all([
      identity,
      db.membership.count({
        where: { communityId: community.id, status: { in: ["active", "past_due"] } },
      }),
      getNextEvent(community.id),
      db.course.count({ where: { isFree: false, published: true } }),
      // Sólo para que el esqueleto de grabaciones mida lo mismo que la lista que llega después.
      db.communityRecording.count({
        where: {
          communityId: community.id,
          status: { in: ["ready", "uploading"] },
          OR: [{ hiddenAt: null }, { hiddenAt: { isSet: false } }],
        },
      }),
    ]);
  const canMod = canModerate(user, community);
  // Quién confirmó la próxima llamada: se enseñan hasta 8 caras, las más recientes.
  const goingIds = event?.going ?? [];
  const goingPeople = goingIds.length
    ? await db.user.findMany({
        where: { id: { in: goingIds.slice(-8) } },
        select: { id: true, displayName: true, username: true, email: true, photoURL: true },
      })
    : [];

  // Diferido (se regresa la promesa sin `await` y la página la pinta con <Await>): el muro con
  // sus insignias, las grabaciones (su `reconcile` llama a la caja de Ghosty Studio y a S3) y el
  // estado del grabador. Antes todo esto bloqueaba el primer byte.
  const wall = settle(
    getWall({ communityId: community.id, isInside, canMod, viewerId: user?.id ?? null }).then(async (wall) => {
      // Insignias de quienes aparecen en el muro (autores de publicaciones y comentarios).
      const authorIds = wall.posts.flatMap((p) => [p.author.id, ...p.comments.map((c) => c.author.id)]);
      const badges = await badgesForMembers(community, authorIds);
      const withBadges = <A extends { id: string }>(a: A) => ({ ...a, badges: badges[a.id] ?? [] });
      return {
        ...wall,
        posts: wall.posts.map((p) => ({
          ...p,
          author: withBadges(p.author),
          comments: p.comments.map((c) => ({ ...c, author: withBadges(c.author) })),
        })),
      };
    }),
    null
  );
  // La página muestra las grabaciones como las ve un miembro; ocultar/reintentar vive en el panel.
  const recordings = settle(listRecordings(community.id, false), []);
  // Estado de la grabación sólo para el anfitrión, y sólo con la llamada abierta.
  const rec = canMod && isCallOpen(event) ? settle(recordingState(), null) : null;

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
          photoURL: avatarUrlFor(user),
        }
      : null,
    membership,
    canClaimGift,
    wall,
    recordings,
    recordingCount,
    rec,
    isCallGuest: !isInside && isCallGuestToday(invite),
    event: event
      ? {
          id: event.id,
          title: event.title,
          startsAt: event.startsAt.toISOString(),
          endsAt: event.endsAt.toISOString(),
          open: isCallOpen(event),
          imageUrl: event.imageKey ? imageUrlFor(event.imageKey) : null,
          going: {
            count: goingIds.length,
            mine: !!user && goingIds.includes(user.id),
            people: goingPeople.map((p) => ({
              id: p.id,
              name: p.displayName || p.username || p.email.split("@")[0],
              photoURL: avatarUrlFor(p),
            })),
          },
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
  const inside = canParticipate(user, membership, community);
  // Invitado a la llamada de hoy: entra a la llamada (sólo eso) aunque no sea miembro.
  const callGuest = !inside && intent === "call" && isCallGuestToday(await applyInvite(user, community.id));
  if (!inside && !callGuest) {
    return data({ error: "Únete al club para participar." }, { status: 403 });
  }

  // ── Llamada en vivo: ticket de un solo uso (120 s) que se pide al dar clic ──
  if (intent === "call") {
    const event = await getNextEvent(community.id);
    if (!isCallOpen(event)) {
      return data({ error: "La llamada se abre 15 minutos antes." }, { status: 400 });
    }
    // Los participantes del micro-hackatón (invitados con esa fuente) entran como speaker para
    // compartir su pantalla; el resto de la audiencia entra como viewer.
    const speakerInvite = await db.communityInvite.findFirst({
      where: { communityId: community.id, email: user.email.toLowerCase(), source: { startsWith: "micro-hackaton" } },
      select: { id: true },
    });
    // Anfitrión (sacar gente, mutear, pantalla grande, grabar) SÓLO por correo
    // (CLUB_CALL_HOST_EMAILS). Antes era cualquier ADMIN de fixtergeek y en el ensayo del
    // 10-nov una participante con rol ADMIN sacó a bliss de la llamada. Los ADMIN entran como
    // ponentes: comparten pantalla pero no moderan.
    const link = await getCallLink(user, {
      host: isHostEmail(user.email),
      speaker: !!speakerInvite || canMod,
      // Skin de la comunidad; vacío = el de la casa. Sólo viaja cuando fixter firma el ticket.
      skin: (community.callSkin as CallSkin | null) ?? null,
    });
    // La sala va dentro de fixtergeek (iframe), como en Teams: así su botón Grabar/Detener
    // funciona. La grabación ya no arranca sola; la inicia el anfitrión desde la sala.
    if (link) throw redirect(`/comunidad/${slug}/llamada?u=${encodeURIComponent(link)}`);
    return data({ error: "No pudimos abrir la sala. Intenta de nuevo en un momento." }, { status: 502 });
  }

  // ── Grabación (sólo anfitrión) ──
  if (intent === "rec-start" || intent === "rec-stop") {
    if (!canMod) return data({ error: "Sólo el anfitrión graba." }, { status: 403 });
    const event = await getNextEvent(community.id);
    const title = event?.title ?? "Llamada del club";
    const r =
      intent === "rec-start"
        ? await startRecording(community, title, undefined, { event })
        : await stopRecording(community, title, undefined, event);
    return r.ok ? { ok: true } : data({ error: r.error }, { status: 502 });
  }
  // Confirmar asistencia a la próxima llamada (o retirarla). Sólo quien está adentro.
  if (intent === "rsvp") {
    if (!inside) return data({ error: "Únete al club para confirmar." }, { status: 403 });
    const event = await getNextEvent(community.id);
    if (!event || event.id !== String(form.get("eventId") ?? "")) {
      return data({ error: "Ese evento ya no está en el calendario." }, { status: 404 });
    }
    await toggleGoing(community.id, event.id, event.startsAt, user.id);
    return { ok: true };
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
  "inline-flex h-12 items-center justify-center rounded-full border-2 border-brand-500 px-6 font-semibold transition-all hover:-translate-y-1";

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
    return <p className="text-2xl font-bold text-danger">● En vivo ahora</p>;
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
              className="min-w-[3.2rem] rounded-xl border border-colorOutline bg-backface px-2 py-1 text-center text-2xl font-bold"
            >
              {String(v).padStart(2, "0")}
              <span className="ml-0.5 text-sm text-colorCaption">{u}</span>
            </span>
          ))}
      </div>
      <p className="mt-2 text-sm text-colorCaption">{when} (CDMX)</p>
    </div>
  );
}

/** Datos del <Form> de página que va en camino con este `intent` (null si no hay). */
function usePendingIntent(intent: string) {
  const { formData } = useNavigation();
  return formData?.get("intent") === intent ? formData : null;
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
  // El checkout de Stripe tarda en crearse: el botón responde al clic, sin esperar al servidor.
  const pendingInterval = usePendingIntent("join")?.get("interval") ?? null;
  return (
    <Form method="post" className="grid gap-3">
      <input type="hidden" name="intent" value="join" />
      <div className={`flex flex-wrap gap-3 ${compact ? "justify-center" : ""}`}>
        <button
          name="interval"
          value="month"
          aria-busy={pendingInterval === "month"}
          className={`${pillBtn} bg-brand-500 text-brand-900 ${pendingInterval ? "pointer-events-none opacity-60" : ""}`}
        >
          {pendingInterval === "month"
            ? "Abriendo…"
            : isLoggedIn ? `$${community.priceMxn}/mes` : "Inicia sesión para unirte"}
        </button>
        {isLoggedIn && community.priceAnnualMxn && !compact && (
          <button
            name="interval"
            value="year"
            aria-busy={pendingInterval === "year"}
            className={`${pillBtn} text-brand-500 ${pendingInterval ? "pointer-events-none opacity-60" : ""}`}
          >
            {pendingInterval === "year" ? "Abriendo…" : `$${community.priceAnnualMxn}/año · 2 meses gratis`}
          </button>
        )}
      </div>
    </Form>
  );
}


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

function RecControl({ rec }: { rec: { recording: boolean; busy: boolean; startedAt: string | null } | null }) {
  const fetcher = useFetcher<{ error?: string }>();
  const busy = fetcher.state !== "idle";
  if (!rec) return <p className="text-sm text-colorCaption">Grabación: la caja no contestó.</p>;
  return (
    <fetcher.Form method="post" className="grid gap-1">
      {rec.recording ? (
        <button
          name="intent"
          value="rec-stop"
          disabled={busy}
          className={`${pillBtn} border border-danger text-white`}
        >
          <span className="mr-2 inline-block h-3 w-3 animate-pulse rounded-full bg-danger align-middle" />
          {busy ? "Guardando…" : "Grabando · Detener y guardar"}
        </button>
      ) : (
        <button
          name="intent"
          value="rec-start"
          disabled={busy || rec.busy}
          className={`${pillBtn} border border-colorOutline text-white disabled:opacity-50`}
        >
          {rec.busy ? "La caja graba otra sala" : busy ? "Arrancando…" : "⏺ Grabar"}
        </button>
      )}
      {fetcher.data?.error && <p className="max-w-[16rem] text-sm text-brand-500">{fetcher.data.error}</p>}
    </fetcher.Form>
  );
}

type RecordingView = {
  id: string;
  title: string;
  status: string;
  endedAt: string;
  minutes: number | null;
  hidden: boolean;
  poster: string | null;
};

/** Mismo alto que la lista real (título + renglón de fecha por fila): no hay salto al llegar. */
function RecordingsSkeleton({ count, isInside }: { count: number; isInside: boolean }) {
  return (
    <section className="mt-14" aria-busy>
      <h2 className="text-2xl font-bold sm:text-3xl">Grabaciones de las llamadas</h2>
      <p className="mt-1 text-colorCaption">
        {isInside ? "Si te perdiste una llamada, aquí está completa." : "Los miembros ven todas las llamadas grabadas."}
      </p>
      <ul className="mt-6 grid gap-4">
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className="rounded-2xl border border-colorOutline bg-backface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold">
                  <span className="inline-block h-4 w-48 max-w-full animate-pulse rounded bg-white/20 align-middle" />
                </p>
                <p className="text-sm">
                  <span className="inline-block h-3 w-32 animate-pulse rounded bg-white/10 align-middle" />
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Recordings({
  slug,
  recordings,
  isInside,
}: {
  slug: string;
  recordings: RecordingView[];
  isInside: boolean;
}) {
  const [playing, setPlaying] = useState<string | null>(null);
  return (
    <section className="mt-14">
      <h2 className="text-2xl font-bold sm:text-3xl">Grabaciones de las llamadas</h2>
      <p className="mt-1 text-colorCaption">
        {isInside ? "Si te perdiste una llamada, aquí está completa." : "Los miembros ven todas las llamadas grabadas."}
      </p>
      <ul className="mt-6 grid gap-4">
        {recordings.map((r) => (
          <li
            key={r.id}
            className={`rounded-2xl border border-colorOutline bg-backface p-5 ${r.hidden ? "opacity-50" : ""}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold">🎞 {r.title}</p>
                <p className="text-sm text-colorCaption" suppressHydrationWarning>
                  {upperFirst(longDate(r.endedAt))}
                  {r.minutes ? ` · ${r.minutes} min` : ""}
                  {r.status === "recording" ? " · 🔴 grabando" : ""}
                  {r.status === "uploading" ? " · procesando (puede tardar un rato)" : ""}
                  {r.status === "failed" ? " · la subida falló" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isInside ? (
                  <span className="text-sm text-colorCaption">🔒 Sólo miembros</span>
                ) : r.status === "ready" ? (
                  <button
                    type="button"
                    onClick={() => setPlaying(playing === r.id ? null : r.id)}
                    className="rounded-full border border-brand-500 px-4 py-1 text-sm font-bold text-brand-500 hover:bg-brand-500 hover:text-brand-900"
                  >
                    {playing === r.id ? "Cerrar" : "▶ Ver"}
                  </button>
                ) : null}
              </div>
            </div>
            {playing === r.id && (
              <ClubVideo srcUrl={`/comunidad/${slug}/grabacion/${r.id}`} poster={r.poster} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function WallUnavailable() {
  return (
    <p className="rounded-2xl border border-colorOutline p-6 text-center text-colorCaption">
      No pudimos cargar el muro. Recarga la página en un momento.
    </p>
  );
}

export default function CommunityHome({ loaderData }: Route.ComponentProps) {
  const {
    community, memberCount, courseCount, isLoggedIn, isInside, canMod, me,
    membership, canClaimGift, wall, event, recordings, recordingCount, rec, isCallGuest,
  } = loaderData;
  const enteringCall = !!usePendingIntent("call");
  const claiming = !!usePendingIntent("claim");
  const [params] = useSearchParams();
  const actionData = useActionData<{ error?: string }>();
  const justJoined = params.get("bienvenida") === "1";
  useWallRefresh(isInside);
  // Sin membresía la página sigue siendo landing: 3 publicaciones y «Ver más»,
  // para que lo de abajo (qué incluye, preguntas, cierre) quede a la vista.
  const PREVIEW = 3;
  const [showAll, setShowAll] = useState(false);
  // Rediseño (12-nov-2026): todos los de adentro lo ven por defecto; `?v=1` regresa a la
  // página anterior.
  if (isInside && params.get("v") !== "1") return <ClubV2 {...loaderData} />;

  const joinBlock = canClaimGift ? (
    <div className="grid gap-4">
      <Form method="post">
        <button
          name="intent"
          value="claim"
          aria-busy={claiming}
          className={`${pillBtn} bg-brand-500 text-brand-900 ${claiming ? "pointer-events-none opacity-60" : ""}`}
        >
          {claiming ? "Activando…" : "🎁 Activar mis 3 meses gratis"}
        </button>
      </Form>
      <p className="text-sm text-colorCaption">
        ¿Prefieres asegurar tu lugar de una vez? Paga ahora y el cobro empieza cuando terminen tus 3
        meses gratis.
      </p>
      <JoinCta community={community} isLoggedIn={isLoggedIn} />
    </div>
  ) : (
    <JoinCta community={community} isLoggedIn={isLoggedIn} />
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-background pb-24 pt-28 text-white">
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
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-500 px-4 py-1.5 text-sm font-bold text-brand-500">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-500" />
              Club · FixterGeek
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] sm:text-6xl">{community.name}</h1>
            {community.tagline && (
              <p className="mt-4 text-lg text-brand-500 sm:text-xl">{community.tagline}</p>
            )}
            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full border border-colorOutline/30 px-3 py-1">
                {memberCount} miembros
              </span>
              <span className="rounded-full border border-colorOutline/30 px-3 py-1">
                Llamada en vivo cada semana
              </span>
              <span className="rounded-full border border-colorOutline/30 px-3 py-1">
                {courseCount} cursos incluidos
              </span>
              <span className="rounded-full border border-colorOutline/30 px-3 py-1">
                ${community.priceMxn} MXN al mes
              </span>
            </div>
          </div>
          <div className="club-rise shrink-0 self-center">
            <CommunityIllustration className="h-auto w-[260px] sm:w-[340px]" />
          </div>
        </section>

        {canMod && (
          <div className="mt-8 flex justify-end">
            <a
              href={`/comunidad/${community.slug}/admin`}
              className="rounded-full border border-colorOutline px-4 py-2 text-sm font-semibold text-white transition hover:border-brand-500 hover:text-brand-500"
            >
              ⚙️ Administrar club
            </a>
          </div>
        )}

        {/* ── Estado de quien mira ── */}
        <section className="mt-10">
          {isInside ? (
            <div className="rounded-2xl border border-brand-500 p-5">
              <p className="text-lg font-bold">
                {justJoined ? "¡Ya eres parte del club! 🎉" : `Hola, ${me?.name} 👋`}
              </p>
              {membership?.cancelAtPeriodEnd && membership.currentPeriodEnd && (
                <p className="mt-1 text-brand-500">
                  Tu membresía termina el{" "}
                  {longDate(membership.currentPeriodEnd)}.
                </p>
              )}
              {/* Meses gratis: con meses por delante basta la fecha; los precios salen hasta los
                  últimos 14 días. Al dueño y a los ADMIN, nada (11-nov-2026). */}
              {membership?.provider === "grant" && membership.currentPeriodEnd && !canMod && (
                new Date(membership.currentPeriodEnd).getTime() - Date.now() > 14 * 86400e3 ? (
                  <p className="mt-1 text-sm text-colorCaption">
                    🎁 Tus meses gratis van hasta el {longDate(membership.currentPeriodEnd)}.
                  </p>
                ) : (
                  <div className="mt-3 rounded-xl border border-brand-500 p-4">
                    <p className="text-sm">
                      🎁 Tus meses gratis terminan el{" "}
                      <strong>{longDate(membership.currentPeriodEnd)}</strong>.
                      Asegura tu lugar: no se cobra nada hasta esa fecha.
                    </p>
                    <div className="mt-3">
                      <JoinCta community={community} isLoggedIn />
                    </div>
                  </div>
                )
              )}
              {membership?.provider === "stripe" && (
                <Form method="post" className="mt-2">
                  <button name="intent" value="billing" className="text-sm text-brand-500 underline">
                    Administrar mi membresía
                  </button>
                </Form>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-colorOutline p-6">
              {canClaimGift ? (
                <>
                  <p className="text-2xl font-bold">Ya eres estudiante de FixterGeek 🎁</p>
                  <p className="mt-1">Tienes 3 meses gratis en el club, sin tarjeta.</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold">
                    ${community.priceMxn} MXN <span className="text-base font-normal">al mes</span>
                  </p>
                  {community.priceAnnualMxn && (
                    <p className="text-brand-500">
                      o ${community.priceAnnualMxn} al año (dos meses gratis) · cancela cuando quieras
                    </p>
                  )}
                </>
              )}
              {justJoined && !canClaimGift && (
                <p className="mt-3 text-brand-500">Estamos confirmando tu pago; recarga en unos segundos.</p>
              )}
              <div className="mt-5">{joinBlock}</div>
              {!isLoggedIn && (
                <p className="mt-5 rounded-xl border border-brand-500 p-3 text-sm text-brand-500">
                  🎁 ¿Ya eres estudiante de FixterGeek? Tienes <strong>3 meses gratis</strong>.{" "}
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
          <section className="mt-8 rounded-2xl border border-colorOutline bg-brand-500/10 p-6">
            <p className="text-sm font-bold uppercase tracking-wider text-brand-500">Próxima transmisión en vivo</p>
            <h2 className="mt-1 text-2xl font-bold">{event.title}</h2>
            <a
              href={`/comunidad/${community.slug}/evento/${event.id}.ics`}
              className="mt-1 inline-block text-sm text-brand-500 hover:underline"
            >
              📅 Agregar a mi calendario
            </a>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <Countdown startsAt={event.startsAt} endsAt={event.endsAt} />
              {isInside || isCallGuest ? (
                <Form method="post" className="grid gap-3">
                  <button
                    name="intent"
                    value="call"
                    disabled={!event.open}
                    aria-busy={enteringCall}
                    className={`${pillBtn} bg-danger text-white disabled:bg-colorOutline disabled:shadow-none ${enteringCall ? "pointer-events-none opacity-70" : ""}`}
                  >
                    {enteringCall ? "Abriendo la sala…" : event.open ? "🎙 Entrar a la llamada" : "Se abre 15 min antes"}
                  </button>
                  {actionData?.error && !enteringCall && (
                    <p className="max-w-[16rem] text-sm text-brand-500">{actionData.error}</p>
                  )}
                </Form>
              ) : (
                <span className="rounded-xl border border-colorOutline px-4 py-3 text-sm text-colorCaption">
                  🔒 Sólo miembros
                </span>
              )}
              {isInside && canMod && event.open && (
                <Suspense
                  fallback={<span aria-busy className="inline-block h-12 w-36 animate-pulse rounded-full border border-colorOutline" />}
                >
                  <Await resolve={rec} errorElement={<RecControl rec={null} />}>
                    {(state) => <RecControl rec={state} />}
                  </Await>
                </Suspense>
              )}
            </div>
          </section>
        )}

        {/* ── Grabaciones ── */}
        <Suspense
          fallback={recordingCount > 0 ? <RecordingsSkeleton count={recordingCount} isInside={isInside} /> : null}
        >
          <Await resolve={recordings} errorElement={null}>
            {(list) =>
              list.length > 0 ? <Recordings slug={community.slug} recordings={list} isInside={isInside} /> : null
            }
          </Await>
        </Suspense>

        {/* ── Qué incluye: es venta, el miembro ya está adentro ── */}
        {!isInside && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold sm:text-3xl">Qué incluye</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {included(courseCount).map((c) => (
              <div key={c.title} className="rounded-2xl border border-colorOutline p-5">
                <p className="text-3xl">{c.icon}</p>
                <h3 className="mt-3 font-bold">{c.title}</h3>
                <p className="mt-1 text-sm text-white/80">{c.body}</p>
              </div>
            ))}
          </div>
        </section>
        )}

        {/* ── Preguntas: también es venta; el miembro ya las resolvió ── */}
        {!isInside && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold sm:text-3xl">Preguntas frecuentes</h2>
          <div className="mt-6 grid gap-3">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-colorOutline/40 p-4 open:border-brand-500">
                <summary className="flex cursor-pointer list-none items-center justify-between font-bold">
                  {f.q}
                  <span className="text-brand-500 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-white/80">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
        )}

        {!isInside && (
          <section className="mt-16 text-center">
            <p className="text-2xl font-bold">¿Construimos tu primer agente esta semana?</p>
            <div className="mt-5 flex justify-center">{joinBlock}</div>
          </section>
        )}

        {/* ── Muro ── */}
        <section className="mt-14">
          <h2 className="text-2xl font-bold sm:text-3xl">El muro</h2>
          <p className="mt-1 text-colorCaption">
            {isInside
              ? "Comparte lo que construyes, pregunta lo que se te atora."
              : "Esto es lo que se está platicando en el club."}
          </p>
          <div className="mt-6 grid gap-5">
            {isInside && me && <Composer me={me} />}
            <Suspense fallback={<WallSkeleton />}>
              <Await resolve={wall} errorElement={<WallUnavailable />}>
                {(loaded) => {
                  if (!loaded) return <WallUnavailable />;
                  const shownPosts = isInside || showAll ? loaded.posts : loaded.posts.slice(0, PREVIEW);
                  const hiddenPublic = loaded.posts.length - shownPosts.length;
                  return (
                    <>
                      {shownPosts.map((p) => (
                        <PostCard
                          key={p.id}
                          post={p}
                          viewerId={me?.id ?? null}
                          viewer={me}
                          canMod={canMod}
                          canComment={isInside}
                        />
                      ))}
                      {hiddenPublic > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowAll(true)}
                          className="mx-auto rounded-xl border border-colorOutline px-6 py-2.5 font-bold text-brand-500 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                        >
                          Ver {hiddenPublic} {hiddenPublic === 1 ? "publicación más" : "publicaciones más"}
                        </button>
                      )}
                      {loaded.posts.length === 0 && isInside && (
                        <p className="rounded-2xl border border-colorOutline p-6 text-center text-colorCaption">
                          Todavía no hay publicaciones. Estrena el muro: cuéntanos qué agente quieres construir.
                        </p>
                      )}
                      {!isInside && (
                        <LockedPosts count={loaded.lockedCount} cta={<JoinCta community={community} isLoggedIn={isLoggedIn} compact />} />
                      )}
                    </>
                  );
                }}
              </Await>
            </Suspense>
          </div>
        </section>
      </div>
    </main>
  );
}
