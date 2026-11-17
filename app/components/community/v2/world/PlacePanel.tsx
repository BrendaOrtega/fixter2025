import { Suspense, type ReactNode } from "react";
import { Await } from "react-router";
import { EnterCallButton, RsvpControl, describeCall, useNow } from "../call";
import type { ClubData, ClubRecording, ClubWallData, Go } from "../types";

/** Qué contenido abre cada lugar del mapa (lo declara el cartucho en `place.target`). */
export type PanelTarget = "call" | "wall" | "recs" | "courses";
export const isPanelTarget = (t: string | undefined | null): t is PanelTarget => t === "call" || t === "wall" || t === "recs" || t === "courses";

const link = "text-[12px] font-semibold text-brand-500 underline-offset-2 hover:underline";
const Note = ({ children }: { children: ReactNode }) => <p className="text-[13px] text-[#7C8A8E]">{children}</p>;
const day = (iso: string | Date | null | undefined) => (iso ? new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "");

/**
 * El contenido de un lugar, dentro del Mundo: llegas a la isla y lo ves aquí, sin salir del mapa.
 * No depende de la piel: sale de `place.target` y de lo que ya trae el loader del club.
 */
/** Grabación que se proyecta sobre el mapa (el reproductor no cabe en el panel angosto). */
export type Playing = { id: string; title: string; poster: string | null };

export function PlacePanel({ target, here, data, go, playingId, onPlay }: { target: PanelTarget; here: number; data: ClubData; go: Go; playingId: string | null; onPlay: (r: Playing | null) => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3 py-2.5">
      {here > 1 && <p className="text-[11px] font-semibold text-brand-500">{here} personas en este lugar</p>}
      {target === "call" && <CallPanel data={data} go={go} />}
      {target === "wall" && (
        <Suspense fallback={<Note>Cargando el Muro…</Note>}>
          <Await resolve={data.wall} errorElement={<Note>No pudimos cargar el Muro.</Note>}>
            {(wall) => (wall ? <WallPanel wall={wall} go={go} /> : <Note>No pudimos cargar el Muro.</Note>)}
          </Await>
        </Suspense>
      )}
      {target === "recs" && (
        <Suspense fallback={<Note>Cargando grabaciones…</Note>}>
          <Await resolve={data.recordings} errorElement={<Note>No pudimos cargar las grabaciones.</Note>}>
            {(list) => <RecsPanel recordings={list} go={go} playingId={playingId} onPlay={onPlay} />}
          </Await>
        </Suspense>
      )}
      {target === "courses" && (
        <>
          <Note>{data.courseCount === 1 ? "1 curso incluido en tu membresía." : `${data.courseCount} cursos incluidos en tu membresía.`}</Note>
          <button type="button" className={`${link} self-start`} onClick={() => go("courses")}>Ver los cursos</button>
        </>
      )}
    </div>
  );
}

function CallPanel({ data, go }: { data: ClubData; go: Go }) {
  const now = useNow();
  const { event, me } = data;
  if (!event) return <Note>No hay llamada programada. Cuando haya una, el Faro se enciende.</Note>;
  const call = describeCall(event, now);
  return (
    <>
      <div>
        <b className="block text-[14px] font-semibold leading-snug text-[#F2F5F4]">{event.title}</b>
        <small className="text-[12px] text-[#7C8A8E]" suppressHydrationWarning>{call.status}</small>
      </div>
      <EnterCallButton event={event} block />
      <RsvpControl event={event} me={me} block />
      <button type="button" className={`${link} self-start`} onClick={() => go("events")}>Ver el evento completo</button>
    </>
  );
}

function WallPanel({ wall, go }: { wall: ClubWallData; go: Go }) {
  const posts = wall.posts.filter((p) => !p.hidden).slice(0, 3);
  if (!posts.length) return <Note>Todavía nadie publica. Sé la primera persona.</Note>;
  return (
    <>
      {posts.map((p) => (
        <button key={p.id} type="button" onClick={() => go("wall", p.id)} className="rounded-[10px] border border-[#232D33] bg-background p-2.5 text-left hover:border-brand-500">
          <span className="flex items-center gap-1.5 text-[12px] text-[#7C8A8E]">
            {p.author.photoURL && <img src={p.author.photoURL} alt="" className="h-4 w-4 rounded-full object-cover" />}
            <b className="font-semibold text-[#F2F5F4]">{p.author.name}</b> · <span suppressHydrationWarning>{day(p.createdAt)}</span>
          </span>
          <span className="mt-1 line-clamp-3 block text-[13px] leading-snug text-[#D9E0DE] [overflow-wrap:anywhere]">{p.body}</span>
          <span className="mt-1 block text-[11px] text-[#7C8A8E]">♥ {p.likeCount} · {p.comments.length} {p.comments.length === 1 ? "comentario" : "comentarios"}</span>
        </button>
      ))}
      <button type="button" className={`${link} self-start`} onClick={() => go("wall")}>Abrir el Muro completo</button>
    </>
  );
}

function RecsPanel({ recordings, go, playingId, onPlay }: { recordings: ClubRecording[]; go: Go; playingId: string | null; onPlay: (r: Playing | null) => void }) {
  const ready = recordings.filter((r) => r.status === "ready" && !r.hidden).slice(0, 6);
  if (!ready.length) return <Note>Aún no hay grabaciones listas.</Note>;
  return (
    <>
      <Note>Elige una y se proyecta en grande sobre el mapa.</Note>
      {ready.map((r) => {
        const on = r.id === playingId;
        return (
          <button key={r.id} type="button" aria-pressed={on} onClick={() => onPlay(on ? null : { id: r.id, title: r.title, poster: r.poster })} className={`flex items-center gap-2.5 rounded-[10px] border bg-background p-1.5 text-left hover:border-brand-500 ${on ? "border-brand-500" : "border-[#232D33]"}`}>
            <span className="relative h-[46px] w-[82px] shrink-0 overflow-hidden rounded-md bg-[#1C252B]">
              {r.poster && <img src={r.poster} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
              <span aria-hidden className="absolute inset-0 grid place-items-center text-[14px] text-white drop-shadow">{on ? "■" : "▶"}</span>
            </span>
            <span className="min-w-0">
              <b className="line-clamp-2 block text-[12.5px] font-semibold leading-tight text-[#F2F5F4]">{r.title}</b>
              <small className="text-[11px] text-[#7C8A8E]" suppressHydrationWarning>{on ? "Proyectando · toca para cerrar" : `${day(r.endedAt)}${r.minutes ? ` · ${r.minutes} min` : ""}`}</small>
            </span>
          </button>
        );
      })}
      <button type="button" className={`${link} self-start`} onClick={() => go("recs")}>Todas las grabaciones</button>
    </>
  );
}
