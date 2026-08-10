import {
  type LoaderFunctionArgs,
  data,
  createCookie,
  Link,
} from "react-router";
import type { Route } from "./+types/s.video";
import { db } from "~/.server/db";
import { getPresignedFromUrl } from "~/.server/tigrs";
import { estimateUnlockDates } from "~/.server/sequences";
import { validateSequenceVideoToken } from "~/utils/tokens";
import { VideoPlayer } from "~/components/viewer/VideoPlayer";
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
const accessCookie = createCookie("secuencia_acceso", {
  httpOnly: true,
  sameSite: "lax",
  path: "/s/video",
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
  if (token) {
    const { isValid, decoded } = validateSequenceVideoToken(token);
    if (isValid && decoded) {
      enrollmentId = decoded.enrollmentId;
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

  const enrollment = await db.sequenceEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      sequence: { include: { emails: { orderBy: { order: "asc" } } } },
    },
  });
  if (!enrollment) {
    return data({ ok: false as const, error: "No encontramos tu suscripción." });
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

  // Seleccionado: ?v=<emailId> si está desbloqueado, o el último desbloqueado.
  const unlocked = videoItems.filter(({ i }) => i < enrollment.currentEmailIndex);
  let chosen = unlocked[unlocked.length - 1];
  if (selectedEmailId) {
    const found = unlocked.find(({ e }) => e.id === selectedEmailId);
    if (found) chosen = found;
  }

  let selected = null as null | {
    emailId: string;
    id: string;
    slug: string;
    title: string;
    poster: string | null;
    youtubeUrl: string | null;
    m3u8: string | null;
    storageLink: string | null;
  };

  if (chosen) {
    const v = bySlug.get(chosen.e.videoSlug as string);
    if (v) {
      // Solo se resuelve la fuente del video DESBLOQUEADO (no se filtran futuros).
      let src = v.storageLink || "";
      if (src && !v.youtubeUrl && needsSigning(src)) {
        try {
          src = await getPresignedFromUrl(src, 3600);
        } catch {
          src = "";
        }
      }
      selected = {
        emailId: chosen.e.id,
        id: v.id,
        slug: v.slug,
        title: v.title,
        poster: v.poster || null,
        youtubeUrl: v.youtubeUrl || null,
        m3u8: v.m3u8 || null,
        storageLink: src || null,
      };

      // Registro: marca el video como visto en el enrollment (sin duplicar).
      if (!enrollment.videosWatched?.includes(v.slug)) {
        await db.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { videosWatched: { push: v.slug } },
        });
      }
    }
  }

  return data(
    {
      ok: true as const,
      sequenceName: enrollment.sequence.name,
      list,
      selected,
    },
    setCookie ? { headers: { "Set-Cookie": setCookie } } : undefined
  );
};

export default function SequenceVideo({ loaderData }: Route.ComponentProps) {
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

  const { sequenceName, list, selected } = loaderData;

  return (
    <main className="min-h-screen bg-brand-900 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4">
        <p className="text-brand-500 text-xs font-bold uppercase tracking-widest mb-2">
          {sequenceName}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">
          {selected?.title || "Tus videos"}
        </h1>

        {selected ? (
          <div className="rounded-xl overflow-hidden">
            {/* Las piezas de las secuencias se graban verticales (9:16). */}
            <VideoPlayer
              vertical
              video={{
                id: selected.id,
                slug: selected.slug,
                title: selected.title,
                youtubeUrl: selected.youtubeUrl || undefined,
                m3u8: selected.m3u8 || undefined,
                storageLink: selected.storageLink || undefined,
                poster: selected.poster || undefined,
              }}
              slug={selected.slug}
              src={selected.storageLink || undefined}
              poster={selected.poster || undefined}
            />
          </div>
        ) : (
          <p className="text-brand-100">
            Aún no tienes videos desbloqueados. Te llegarán por correo conforme
            avances en la secuencia.
          </p>
        )}

        <Camino list={list} selectedId={selected?.emailId} />
      </div>
    </main>
  );
}

/** "el jue 14" / "mañana" — el día basta; el cron corre cada 5 minutos. */
function formatUnlock(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  const days = Math.round((date.getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "hoy";
  if (days === 1) return "mañana";
  return `el ${new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "America/Mexico_City",
  }).format(date)}`;
}

/**
 * Camino vertical con un solo hilo: cada correo es un nodo, y se ven todos —
 * incluidos los que faltan. Duolingo cambió su árbol explorable por un camino
 * lineal justamente porque saber qué sigue pesa más que poder elegir.
 *
 * El nodo actual no es enlace: sería un link a esta misma página.
 */
function Camino({
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
                  "relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0 border " +
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
                    "block text-sm truncate " +
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
                  to={`/s/video?v=${item.emailId}`}
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
