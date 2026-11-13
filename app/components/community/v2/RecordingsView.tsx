import { Suspense, useState } from "react";
import { Await } from "react-router";
import { ClubVideo } from "../ClubVideo";
import { PlayIcon } from "./icons";
import { EmptyNote, SectionHead, Tag, Wrap, btnGhost, card, shortDate } from "./ui";
import type { ClubData, ClubRecording } from "./types";

// Grabaciones: la más reciente destacada y el resto en cuadrícula con póster y duración. Al dar clic
// se abre arriba el reproductor oficial (ClubVideo pide las URLs firmadas sólo cuando se monta).

const grid = "grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3";

const STATUS_TAG: Record<string, { label: string; tone: "plain" | "bad" }> = {
  recording: { label: "Grabando", tone: "plain" },
  uploading: { label: "Procesando, puede tardar un rato", tone: "plain" },
  failed: { label: "La subida falló", tone: "bad" },
};

function Poster({ src }: { src: string | null }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return null;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
    />
  );
}

/** «3 h 18 min» o «45 min»: lo que se lee en la etiqueta del póster. */
function duration(minutes: number | null | undefined) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
}

function DurationChip({ minutes }: { minutes: number | null | undefined }) {
  const d = duration(minutes);
  if (!d) return null;
  return (
    <span className="absolute bottom-2 right-2 rounded-md bg-[#0E1317]/85 px-1.5 py-0.5 text-[11px] font-semibold text-[#F2F5F4]">
      {d}
    </span>
  );
}

/** `featured`: la más reciente, a todo el ancho y con el póster grande (en ≥sm, póster a la izquierda). */
function RecordingCard({ recording, onPlay, featured = false }: { recording: ClubRecording; onPlay: () => void; featured?: boolean }) {
  const ready = recording.status === "ready";
  const status = STATUS_TAG[recording.status];
  const thumb = `relative grid aspect-video w-full place-items-center overflow-hidden bg-[#1C252B] ${
    featured ? "rounded-t-[9px] sm:rounded-l-[9px] sm:rounded-tr-none" : "rounded-t-[9px]"
  }`;
  return (
    <li className={`${card} overflow-hidden ${featured ? "sm:col-span-2 lg:col-span-3 sm:grid sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]" : ""}`}>
      {ready ? (
        <button
          type="button"
          onClick={onPlay}
          aria-label={`Reproducir «${recording.title}»`}
          className={`${thumb} group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500`}
        >
          <Poster src={recording.poster} />
          <span
            className={`relative grid place-items-center rounded-full bg-[#F2F5F4] text-background transition-transform group-hover:scale-105 motion-reduce:transition-none ${
              featured ? "h-14 w-14" : "h-10 w-10"
            }`}
          >
            <PlayIcon className={featured ? "ml-1 h-5 w-5" : "ml-0.5 h-3.5 w-3.5"} />
          </span>
          <DurationChip minutes={recording.minutes} />
        </button>
      ) : (
        <div className={thumb}>{status && <Tag tone={status.tone}>{status.label}</Tag>}</div>
      )}
      <div className={featured ? "flex flex-col justify-center gap-1.5 px-4 py-4 sm:px-6" : "grid gap-0.5 px-3 pb-3 pt-2.5"}>
        {featured && <p className="text-xs font-medium text-brand-500">La más reciente</p>}
        <p className={`font-semibold leading-snug text-[#F2F5F4] ${featured ? "text-lg sm:text-xl" : ""}`}>{recording.title}</p>
        <p className="text-xs text-[#7C8A8E]" suppressHydrationWarning>
          {shortDate(recording.endedAt)}
        </p>
        {featured && ready && (
          <button type="button" onClick={onPlay} className={`${btnGhost} mt-2 self-start`}>
            Ver la grabación
          </button>
        )}
      </div>
    </li>
  );
}

function RecordingsGrid({ slug, recordings }: { slug: string; recordings: ClubRecording[] }) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const playing = recordings.find((r) => r.id === playingId && r.status === "ready");
  if (recordings.length === 0) {
    return <EmptyNote>Todavía no hay grabaciones. Cada llamada queda aquí completa cuando termina.</EmptyNote>;
  }
  // La que se está viendo no se repite abajo: su tarjeta ya es el reproductor.
  const rest = recordings.filter((r) => r.id !== playing?.id);
  const play = (id: string) => {
    setPlayingId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <>
      {playing && (
        <section className={`${card} mb-5 overflow-hidden`} aria-label={`Reproduciendo «${playing.title}»`}>
          {/* `key`: al cambiar de grabación el reproductor se vuelve a montar con la URL nueva. */}
          <ClubVideo key={playing.id} srcUrl={`/comunidad/${slug}/grabacion/${playing.id}`} poster={playing.poster} />
          <div className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-xs font-medium text-brand-500">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                Reproduciendo
              </p>
              <h2 className="mt-1 text-lg font-semibold leading-snug text-[#F2F5F4] sm:text-xl">{playing.title}</h2>
              <p className="mt-0.5 text-xs text-[#7C8A8E]" suppressHydrationWarning>
                {shortDate(playing.endedAt)}
                {duration(playing.minutes) && <span className="ml-3">{duration(playing.minutes)}</span>}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPlayingId(null)}
              aria-label="Cerrar el reproductor"
              className={`${btnGhost} h-9 w-9 !px-0`}
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </section>
      )}
      {rest.length > 0 && (
        <>
          {playing && <h3 className="mb-2.5 text-sm font-semibold text-[#7C8A8E]">Más grabaciones</h3>}
          <ul className={grid}>
            {rest.map((r, i) => (
              <RecordingCard key={r.id} recording={r} featured={!playing && i === 0} onPlay={() => play(r.id)} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

/** Mismas tarjetas, vacías, mientras llega la lista (que consulta a la caja y a S3). */
function RecordingsSkeleton({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <ul aria-busy className={grid}>
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className={card}>
          <div className="aspect-video w-full animate-pulse rounded-t-[9px] bg-[#1C252B]" />
          <div className="grid gap-2 px-3 pb-3 pt-3">
            <span className="h-3.5 w-3/4 animate-pulse rounded bg-[#1C252B]" />
            <span className="h-3 w-1/3 animate-pulse rounded bg-[#1C252B]" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function RecordingsView({ data }: { data: ClubData }) {
  const { community, canMod, recordings, recordingCount } = data;
  return (
    <>
      <SectionHead
        title="Grabaciones"
        action={
          canMod && (
            <a href={`/comunidad/${community.slug}/admin`} className={btnGhost}>
              Administrar grabaciones
            </a>
          )
        }
      />
      <Wrap>
        <Suspense fallback={<RecordingsSkeleton count={recordingCount} />}>
          <Await resolve={recordings} errorElement={<EmptyNote>No pudimos cargar las grabaciones. Recarga la página en un momento.</EmptyNote>}>
            {(list) => <RecordingsGrid slug={community.slug} recordings={list} />}
          </Await>
        </Suspense>
      </Wrap>
    </>
  );
}
