import {
  type LoaderFunctionArgs,
  data,
  createCookie,
  Link,
} from "react-router";
import type { Route } from "./+types/s.video";
import { db } from "~/.server/db";
import { getPresignedFromUrl } from "~/.server/tigrs";
import { validateSequenceVideoToken } from "~/utils/tokens";
import { VideoPlayer } from "~/components/viewer/VideoPlayer";
import getMetaTags from "~/utils/getMetaTags";

export const meta = () =>
  getMetaTags({ title: "Tu video | FixterGeek" });

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

  // Emails con video + su índice en la secuencia (para el gating).
  const videoItems = enrollment.sequence.emails
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => !!e.videoSlug);
  if (videoItems.length === 0) {
    return data({ ok: false as const, error: "Esta secuencia aún no tiene videos." });
  }

  const slugs = videoItems.map(({ e }) => e.videoSlug as string);
  const videos = await db.video.findMany({ where: { slug: { in: slugs } } });
  const bySlug = new Map(videos.map((v) => [v.slug, v]));

  // Lista: títulos siempre; desbloqueado = email ya enviado (i < currentEmailIndex).
  const list = videoItems.map(({ e, i }) => ({
    emailId: e.id,
    title: bySlug.get(e.videoSlug as string)?.title || e.subject,
    unlocked: i < enrollment.currentEmailIndex,
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
      if (src && !v.youtubeUrl) {
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
        <p className="text-brand-300 text-sm mb-1">{sequenceName}</p>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">
          {selected?.title || "Tus videos"}
        </h1>

        {selected ? (
          <div className="rounded-xl overflow-hidden border border-brand-100/10 bg-black">
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

        {/* Lista de videos de la secuencia */}
        <div className="mt-8 space-y-2">
          {list.map((item) =>
            item.unlocked ? (
              <Link
                key={item.emailId}
                to={`/s/video?v=${item.emailId}`}
                className={
                  "flex items-center gap-3 rounded-lg p-3 border transition-colors " +
                  (selected && item.emailId === selected.emailId
                    ? "border-brand-500/50 bg-brand-500/10"
                    : "border-brand-100/10 bg-brand-900/50 hover:border-brand-500/40")
                }
              >
                <span className="w-7 h-7 rounded-full bg-brand-500/15 text-brand-100 flex items-center justify-center text-xs flex-shrink-0">
                  ▶
                </span>
                <span className="text-white text-sm truncate">{item.title}</span>
              </Link>
            ) : (
              <div
                key={item.emailId}
                className="flex items-center gap-3 rounded-lg p-3 border border-brand-100/5 bg-brand-900/30 opacity-60"
              >
                <span className="w-7 h-7 rounded-full bg-brand-900/60 text-brand-100/50 flex items-center justify-center text-xs flex-shrink-0">
                  🔒
                </span>
                <div className="min-w-0">
                  <div className="text-brand-100/70 text-sm truncate">
                    {item.title}
                  </div>
                  <div className="text-brand-100/40 text-[11px]">
                    Disponible al avanzar
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </main>
  );
}
