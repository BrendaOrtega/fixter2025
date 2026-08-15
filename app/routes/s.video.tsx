import { useEffect, useState } from "react";
import {
  type LoaderFunctionArgs,
  data,
  createCookie,
  Link,
  useFetcher,
} from "react-router";
import type { Route } from "./+types/s.video";
import { db } from "~/.server/db";
import { getPresignedFromUrl } from "~/.server/tigrs";
import { estimateUnlockDates } from "~/.server/sequences";
import { validateSequenceVideoToken } from "~/utils/tokens";
import { StoriesFeed, type Slide } from "~/components/stories/StoriesFeed";
import { formatUnlock } from "~/utils/formatUnlock";
import getMetaTags from "~/utils/getMetaTags";

export const meta = () =>
  getMetaTags({ title: "Tu video | FixterGeek" });

/**
 * Los objetos públicos de Tigris (bucket en el host, subidos con ACL
 * public-read) NO deben firmarse: `getPresignedFromUrl` parsea las URLs como
 * path-style (`host/bucket/key`), así que en una URL virtual-hosted toma
 * "videos" como bucket y firma algo que no existe — el video no carga nunca.
 */
const needsSigning = (url: string) => !/^https:\/\/[^/]+\.t3\.storage\.dev\//.test(url);

// Cookie de acceso firmada: recuerda el enrollment para volver sin el token.
//
// El path es "/series" y no "/series/video": React Router pide los loaders de
// una navegación cliente a "/series/video.data", y por las reglas de cookies ese
// path NO cae dentro de "/series/video" (el carácter siguiente debe ser "/", y es un
// punto). Con el path anterior la cookie no viajaba en esas peticiones, así
// que navegar dentro del camino contestaba "Abre este video desde el enlace de
// tu correo" aunque el usuario acabara de entrar con su token.
const accessCookie = createCookie("secuencia_acceso", {
  httpOnly: true,
  sameSite: "lax",
  path: "/series",
  maxAge: 60 * 60 * 24 * 90,
  secrets: [process.env.SECRET || "fixtergeek"],
  secure: process.env.NODE_ENV === "production",
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const selectedEmailId = url.searchParams.get("v");

  // Identidad: token de la URL (y set cookie) o la cookie existente.
  let enrollmentId: string | undefined;
  let setCookie: string | undefined;
  // Par (secuencia, suscriptor) del token: rescata el enlace cuando el
  // enrollment que firmó ya no existe pero el suscriptor sigue inscrito.
  let fallbackOwner: { sequenceId: string; subscriberId: string } | undefined;
  if (token) {
    const { isValid, decoded } = validateSequenceVideoToken(token);
    if (isValid && decoded) {
      enrollmentId = decoded.enrollmentId;
      if (decoded.sequenceId && decoded.subscriberId) {
        fallbackOwner = {
          sequenceId: decoded.sequenceId,
          subscriberId: decoded.subscriberId,
        };
      }
      setCookie = await accessCookie.serialize({ enrollmentId });
    }
  }
  if (!enrollmentId) {
    const parsed = await accessCookie.parse(request.headers.get("Cookie"));
    enrollmentId = parsed?.enrollmentId;
  }
  if (!enrollmentId) {
    return data({
      ok: false as const,
      error: "Abre este video desde el enlace de tu correo.",
    });
  }

  const withSequence = {
    sequence: { include: { emails: { orderBy: { order: "asc" as const } } } },
  };
  let enrollment = await db.sequenceEnrollment.findUnique({
    where: { id: enrollmentId },
    include: withSequence,
  });
  // El enrollment del token murió: si el token trae el par (secuencia,
  // suscriptor) y esa persona sigue inscrita, el enlace se rescata.
  if (!enrollment && fallbackOwner) {
    enrollment = await db.sequenceEnrollment.findUnique({
      where: { sequenceId_subscriberId: fallbackOwner },
      include: withSequence,
    });
    if (enrollment) {
      setCookie = await accessCookie.serialize({ enrollmentId: enrollment.id });
    }
  }
  if (!enrollment) {
    return data({
      ok: false as const,
      error:
        "Este enlace ya no está ligado a una suscripción activa. Si sigues inscrito, abre el video desde el correo más reciente.",
    });
  }

  const emails = enrollment.sequence.emails;
  const videoItems = emails
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => !!e.videoSlug);

  const slugs = videoItems.map(({ e }) => e.videoSlug as string);
  const videos = slugs.length
    ? await db.video.findMany({ where: { slug: { in: slugs } } })
    : [];
  const bySlug = new Map(videos.map((v) => [v.slug, v]));

  // El camino son TODOS los correos, tengan video o no: ver lo que falta es
  // la mitad del valor. Desbloqueado = ya se envió (i < currentEmailIndex).
  const unlockDates = estimateUnlockDates(emails, enrollment);
  const list = emails.map((e, i) => ({
    emailId: e.id,
    title: e.videoSlug
      ? bySlug.get(e.videoSlug)?.title || e.subject
      : e.subject,
    unlocked: i < enrollment.currentEmailIndex,
    hasVideo: !!e.videoSlug,
    unlocksAt: unlockDates[i]?.toISOString() ?? null,
  }));

  // Slides del feed. Un correo desbloqueado SIN video no genera slide: sería
  // un hueco negro en el feed. Sigue apareciendo en el camino de la derecha.
  const slides: Slide[] = (
    await Promise.all(
      emails.map(async (email, i): Promise<Slide | null> => {
        const unlocked = i < enrollment.currentEmailIndex;
        const video = email.videoSlug ? bySlug.get(email.videoSlug) : undefined;

        // Lo que falta SIEMPRE es slide, tenga video o no: ver lo que viene es
        // la mitad del valor del camino. El poster viaja (es el anticipo); la
        // fuente del video, jamás.
        if (!unlocked) {
          return {
            kind: "locked",
            emailId: email.id,
            title: video?.title || email.subject,
            poster: video?.poster || null,
            unlocksAt: unlockDates[i]?.toISOString() ?? null,
          };
        }

        // Ya enviado pero sin video: no hay nada que mostrar en un feed.
        if (!video) return null;

        let src = video.storageLink || "";
        if (src && !video.youtubeUrl && needsSigning(src)) {
          try {
            src = await getPresignedFromUrl(src, 3600);
          } catch {
            src = "";
          }
        }
        // Sin fuente utilizable no hay slide de video: un <video> sin src
        // dispara `error` y ensucia el feed. YouTube tampoco entra: no se
        // puede pausar un iframe al salir de la slide.
        if (!src || video.youtubeUrl) return null;

        return {
          kind: "video",
          emailId: email.id,
          videoId: video.id,
          slug: video.slug,
          title: video.title || email.subject,
          poster: video.poster || null,
          src,
        };
      })
    )
  ).filter((slide): slide is Slide => slide !== null);

  slides.push({ kind: "outro", emailId: "outro", title: "El taller" });

  // ?v=<emailId> manda; si no, la primera pieza que esta persona NO ha visto.
  //
  // Antes el default era la última desbloqueada, y eso mandaba a quien abría el
  // correo 1 directo al video más avanzado que tuviera disponible: no era el
  // video que acababa de recibir, y le spoileaba la secuencia. Los correos ya
  // enviados no llevan ?v=, así que este default es lo único que los rescata.
  const watched = new Set(enrollment.videosWatched ?? []);
  const firstUnwatched = slides.findIndex(
    (slide) => slide.kind === "video" && !watched.has(slide.slug)
  );
  const lastVideo = slides.reduce(
    (acc, slide, i) => (slide.kind === "video" ? i : acc),
    0
  );
  // Todo visto: la última pieza, que es donde se quedó.
  const lastUnlocked = firstUnwatched >= 0 ? firstUnwatched : lastVideo;
  const requested = selectedEmailId
    ? slides.findIndex((slide) => slide.emailId === selectedEmailId)
    : -1;
  const selectedIndex = requested >= 0 ? requested : lastUnlocked;

  return data(
    {
      ok: true as const,
      sequenceName: enrollment.sequence.name,
      list,
      slides,
      selectedIndex,
    },
    setCookie ? { headers: { "Set-Cookie": setCookie } } : undefined
  );
};

/**
 * Marca una pieza como vista. Antes esto vivía en el loader, que es un GET:
 * se escribía en cada revalidación y, con un feed, el servidor no puede saber
 * qué se vio de verdad. La identidad sale solo de la cookie.
 */
export const action = async ({ request }: LoaderFunctionArgs) => {
  const parsed = await accessCookie.parse(request.headers.get("Cookie"));
  const enrollmentId = parsed?.enrollmentId;
  if (!enrollmentId) return data({ ok: false }, { status: 401 });

  const formData = await request.formData();
  if (formData.get("intent") !== "watched") return data({ ok: false });

  const slug = formData.get("slug") as string;
  const enrollment = await db.sequenceEnrollment.findUnique({
    where: { id: enrollmentId },
    select: { videosWatched: true },
  });
  if (!enrollment || !slug) return data({ ok: false });

  if (!enrollment.videosWatched?.includes(slug)) {
    await db.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: { videosWatched: { push: slug } },
    });
  }
  return data({ ok: true });
};

export default function SequenceVideo({ loaderData }: Route.ComponentProps) {
  // Antes de cualquier return: los hooks no pueden ir tras una condicional.
  const fetcher = useFetcher();
  const markWatched = (slug: string) =>
    fetcher.submit({ intent: "watched", slug }, { method: "POST" });

  // Quién se está viendo, según el feed y no según el loader: al scrollear
  // dentro del feed la URL cambia con replaceState y el loader no revalida,
  // así que un índice del servidor deja el camino marcando la pieza de la
  // entrada para siempre.
  const initialActiveId = loaderData.ok
    ? loaderData.slides[loaderData.selectedIndex]?.emailId
    : undefined;
  const [activeEmailId, setActiveEmailId] = useState(initialActiveId);
  useEffect(() => setActiveEmailId(initialActiveId), [initialActiveId]);

  if (!loaderData.ok) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-brand-900">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🎬</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Video no disponible
          </h1>
          <p className="text-brand-100">{loaderData.error}</p>
        </div>
      </main>
    );
  }

  const { sequenceName, list, slides, selectedIndex } = loaderData;

  if (slides.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-brand-900">
        <p className="text-brand-100 text-center max-w-sm">
          Aún no tienes piezas desbloqueadas. Te llegan por correo conforme
          avanza la secuencia.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-brand-900 pt-16 md:pt-24">
      <div className="md:grid md:grid-cols-[1fr_320px] md:gap-8 md:max-w-6xl md:mx-auto md:px-6">
        <StoriesFeed
          slides={slides}
          initialIndex={selectedIndex}
          sequenceName={sequenceName}
          onWatched={markWatched}
          onActiveChange={setActiveEmailId}
        />

        {/* El camino solo en desktop: en móvil el feed ya ES el camino, y las
            piezas bloqueadas aparecen como slides. */}
        <aside className="hidden md:block pt-2">
          <Path list={list} selectedId={activeEmailId} />
        </aside>
      </div>
    </main>
  );
}

/**
 * Camino vertical con un solo hilo: cada correo es un nodo, y se ven todos —
 * incluidos los que faltan. Duolingo cambió su árbol explorable por un camino
 * lineal justamente porque saber qué sigue pesa más que poder elegir.
 *
 * El nodo actual no es enlace: sería un link a esta misma página.
 */
function Path({
  list,
  selectedId,
}: {
  list: {
    emailId: string;
    title: string;
    unlocked: boolean;
    hasVideo: boolean;
    unlocksAt: string | null;
  }[];
  selectedId?: string;
}) {
  if (list.length < 2) return null;
  const done = list.filter((i) => i.unlocked).length;

  return (
    <section className="mt-14">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-brand-100 text-xs uppercase tracking-widest font-bold">
          Tu camino
        </h2>
        <span className="text-brand-500 text-xs font-bold">
          {done} de {list.length}
        </span>
      </div>

      <ol className="relative">
        {list.map((item, i) => {
          const isCurrent = item.emailId === selectedId;
          const isLast = i === list.length - 1;
          const when = formatUnlock(item.unlocksAt);

          const node = (
            <>
              {/* Hilo que une los nodos; se corta en el último. */}
              {!isLast && (
                <span
                  aria-hidden
                  className={
                    "absolute left-[15px] top-9 bottom-0 w-px " +
                    (item.unlocked ? "bg-brand-500/40" : "bg-brand-100/10")
                  }
                />
              )}
              <span
                className={
                  "relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0 border transition-colors duration-300 " +
                  (isCurrent
                    ? "bg-brand-500 text-brand-900 border-brand-500 font-bold"
                    : item.unlocked
                      ? "bg-brand-500/15 text-brand-100 border-brand-500/40"
                      : "bg-brand-900 text-brand-100/40 border-brand-100/10")
                }
              >
                {item.unlocked ? (item.hasVideo ? "▶" : i + 1) : "🔒"}
              </span>
              <span className="min-w-0 pb-6">
                <span
                  className={
                    "block text-sm truncate transition-colors duration-300 " +
                    (item.unlocked ? "text-white" : "text-brand-100/60")
                  }
                >
                  {item.title}
                </span>
                <span className="block text-[11px] text-brand-100/40">
                  {isCurrent
                    ? "Lo estás viendo"
                    : item.unlocked
                      ? "Disponible"
                      : when
                        ? `Se abre ${when}`
                        : "Te llega por correo"}
                </span>
              </span>
            </>
          );

          return (
            <li key={item.emailId} className="relative">
              {item.unlocked && item.hasVideo && !isCurrent ? (
                <Link
                  to={`/series/video?v=${item.emailId}`}
                  className="flex gap-4 group hover:opacity-90"
                >
                  {node}
                </Link>
              ) : (
                <div className="flex gap-4">{node}</div>
              )}
            </li>
          );
        })}
      </ol>

      {/* El destino: lo que todo el camino está preparando. */}
      <div className="mt-2 flex gap-4">
        <span className="w-8 h-8 rounded-full bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-xs flex-shrink-0">
          🏁
        </span>
        <div>
          <p className="text-white text-sm font-bold">
            Taller: Diseño de sistemas agénticos
          </p>
          <p className="text-brand-100/40 text-[11px]">
            Arranca el 1 de septiembre · 8:00 PM CDMX
          </p>
        </div>
      </div>
    </section>
  );
}
