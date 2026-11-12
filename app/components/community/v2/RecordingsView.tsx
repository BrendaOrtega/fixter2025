import { Suspense, useState } from "react";
import { Await } from "react-router";
import { ClubVideo } from "../ClubVideo";
import { PlayIcon } from "./icons";
import { EmptyNote, SectionHead, Tag, Wrap, btnGhost, card, shortDate } from "./ui";
import type { ClubData, ClubRecording } from "./types";

// Grabaciones: cuadrícula con póster. Al dar clic se abre arriba el reproductor de siempre
// (ClubVideo pide la URL firmada sólo cuando se monta).

const grid = "grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3";

const STATUS_TAG: Record<string, { label: string; tone: "plain" | "bad" }> = {
  recording: { label: "Grabando", tone: "plain" },
  uploading: { label: "Procesando · puede tardar un rato", tone: "plain" },
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
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

function RecordingCard({ recording, onPlay }: { recording: ClubRecording; onPlay: () => void }) {
  const ready = recording.status === "ready";
  const status = STATUS_TAG[recording.status];
  const thumb = "relative grid aspect-video w-full place-items-center overflow-hidden rounded-t-[9px] bg-[#1C252B]";
  return (
    <li className={card}>
      {ready ? (
        <button type="button" onClick={onPlay} aria-label={`Reproducir «${recording.title}»`} className={`${thumb} group`}>
          <Poster src={recording.poster} />
          <span className="relative grid h-10 w-10 place-items-center rounded-full bg-white text-background transition-transform group-hover:scale-105">
            <PlayIcon className="ml-0.5 h-3.5 w-3.5" />
          </span>
        </button>
      ) : (
        <div className={thumb}>{status && <Tag tone={status.tone}>{status.label}</Tag>}</div>
      )}
      <div className="px-3 pb-3 pt-2.5">
        <p className="font-semibold leading-snug text-[#F2F5F4]">{recording.title}</p>
        <p className="text-xs text-[#7C8A8E]" suppressHydrationWarning>
          {shortDate(recording.endedAt)}
          {recording.minutes ? ` · ${recording.minutes} min` : ""}
        </p>
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
  return (
    <>
      {playing && (
        <section className={`${card} mb-3.5 px-4 pb-4 pt-3`} aria-label={`Reproduciendo «${playing.title}»`}>
          <div className="flex items-center gap-3">
            <p className="min-w-0 flex-1 truncate font-semibold text-[#F2F5F4]">{playing.title}</p>
            <button type="button" onClick={() => setPlayingId(null)} className={btnGhost}>
              Cerrar
            </button>
          </div>
          {/* `key`: al cambiar de grabación el reproductor se vuelve a montar con la URL nueva. */}
          <ClubVideo key={playing.id} srcUrl={`/comunidad/${slug}/grabacion/${playing.id}`} poster={playing.poster} />
        </section>
      )}
      <ul className={grid}>
        {recordings.map((r) => (
          <RecordingCard
            key={r.id}
            recording={r}
            onPlay={() => {
              setPlayingId(r.id);
              window.scrollTo({ top: 0 });
            }}
          />
        ))}
      </ul>
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
