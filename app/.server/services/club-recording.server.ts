// Grabaciones de las llamadas del club (10-nov-2026).
//
// La caja de eventos graba la sala del día y, al parar, la convierte a HLS (1080/720/480, póster y
// miniaturas) y la sube a nuestro bucket de video, en `fixtergeek/videos/club/<club>/<id>/`, el
// mismo camino que los webinars de Teams. gs sólo hace de puente
// (`/api/v2/partner/event-box/recording`, salas `fx-*`): el ADMIN_TOKEN de la caja nunca sale de gs.
//
// Caja propia de fixter (12-nov-2026): con `CLUB_CALL_BOX_URL` y `CLUB_CALL_BOX_ADMIN_TOKEN` las
// tres acciones (state, start, stop) van directo a la caja, sin gs (`club-call-box.server.ts`, que
// documenta el mapa acción → endpoint). Sin esas dos variables todo sigue por gs con
// `GHOSTY_PARTNER_KEY` / `GHOSTY_PARTNER_KEY_SECRET`, como antes. La subida no cambia de dueño:
// la hace la caja con las llaves `HLS_*` de su propio env.
//   CLUB_CALL_BOX_URL          https://… de la caja de llamadas de fixter
//   CLUB_CALL_BOX_ADMIN_TOKEN  el ADMIN_TOKEN de ESA caja (nunca sale del servidor)
//
// Ciclo de una fila (`CommunityRecording.status`):
//   recording  → el anfitrión entró (se graba solo) o pulsó «Grabar». Guarda el archivo de la caja.
//   uploading  → «Detener y guardar»: la caja convierte y sube. Si el anfitrión se fue sin parar, la
//                caja para sola a los 3 min sin nadie, y también al llegar al tope de minutos de su
//                plan (`lastStop` en su `/rec/state`); la siguiente carga del club lo detecta y pide
//                el HLS de ese archivo (`reconcile`).
//   ready      → ya está `storyboard/storyboard.vtt`, que la caja sube DESPUÉS de todo el HLS.
//   failed     → 12 h sin llegar; el anfitrión tiene «Reintentar».
// Sólo a miembros se les entrega la URL del proxy HLS firmada (`~/.server/hls`).
import { db } from "~/.server/db";
import { fileExist } from "~/.server/tigrs";
import { buildHlsProxyUrl } from "~/.server/hls";
import { clubCallRoom } from "~/.server/services/club-call.server";
import { recordingCall } from "~/.server/services/club-call-box.server";

/** Si en 12 h no apareció el HLS, la conversión falló (4 h de llamada tardan en transcodificar). */
export const UPLOAD_GIVE_UP_MS = 12 * 60 * 60_000;
/** El stop en la caja tarda hasta ~90 s en cerrar el MP4; gs espera 120 s. */
const STOP_TIMEOUT_MS = 150_000;

export type RecState = { recording: boolean; busy: boolean; startedAt: string | null; file?: string | null };

/** Carpeta HLS de una grabación (llave completa del bucket). */
export function hlsPrefixFor(communityId: string, recordingId: string) {
  return `fixtergeek/videos/club/${communityId}/${recordingId}/hls`;
}

/** El storyboard se sube al final de todo: si está, el HLS completo ya llegó. */
export function readyMarkerKey(prefix: string) {
  return `${prefix.replace(/\/hls$/, "")}/storyboard/storyboard.vtt`;
}

/** uploading → ready si ya está el marcador; → failed si se pasó del plazo. */
export function nextStatus(r: { status: string; endedAt: Date }, exists: boolean, now = Date.now()) {
  if (r.status !== "uploading") return r.status;
  if (exists) return "ready";
  return now - r.endedAt.getTime() > UPLOAD_GIVE_UP_MS ? "failed" : "uploading";
}

export async function recordingState(room = clubCallRoom()): Promise<RecState | null> {
  const r = await recordingCall<RecState>({ action: "state", room });
  return r.ok && r.data ? { recording: !!r.data.recording, busy: !!r.data.busy, startedAt: r.data.startedAt ?? null } : null;
}

/**
 * Arranca (o confirma) la grabación de la sala del día y deja su fila `recording` con el archivo
 * de la caja. Si ya se estaba grabando, gs devuelve el mismo archivo y no se duplica la fila.
 */
export async function startRecording(
  community: { id: string },
  title: string,
  room = clubCallRoom(),
  opts: { live?: boolean; event?: { id: string; startsAt: Date } | null } = {}
) {
  // `live`: además de grabar, sale a YouTube y Facebook (destinos que gs ya cargó en la caja con
  // «Preparar transmisión»). Si la caja no tiene destinos, falla y se graba sin transmitir.
  let r = await recordingCall<RecState>({ action: "start", room, title, live: !!opts.live });
  if (!r.ok && opts.live) r = await recordingCall<RecState>({ action: "start", room, title });
  if (!r.ok || !r.data) return { ok: false as const, error: r.data?.error ?? "No se pudo grabar" };
  const file = r.data.file ?? null;
  const existing = await db.communityRecording.findFirst({
    where: { communityId: community.id, status: "recording", room },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    if (file && existing.boxFile !== file) {
      await db.communityRecording.update({ where: { id: existing.id }, data: { boxFile: file } });
    }
  } else {
    const row = await db.communityRecording.create({
      data: {
        communityId: community.id,
        room,
        title,
        status: "recording",
        boxFile: file,
        storageKey: "",
        startedAt: r.data.startedAt ? new Date(r.data.startedAt) : new Date(),
        ...(opts.event ? { eventId: opts.event.id, occurrenceAt: opts.event.startsAt } : {}),
      },
    });
    const prefix = hlsPrefixFor(community.id, row.id);
    await db.communityRecording.update({ where: { id: row.id }, data: { storageKey: `${prefix}/master.m3u8` } });
  }
  return { ok: true as const };
}

/** Pide a la caja el HLS de una fila (parando la grabación si sigue). */
async function finish(row: { id: string; communityId: string; room: string; boxFile: string | null }) {
  const prefix = hlsPrefixFor(row.communityId, row.id);
  const r = await recordingCall<{ file: string; bytes: number | null }>(
    { action: "stop", room: row.room, hlsPrefix: prefix, ...(row.boxFile ? { file: row.boxFile } : {}) },
    { timeoutMs: STOP_TIMEOUT_MS }
  );
  // Sin respuesta (timeout) la caja pudo haber parado igual: se marca `uploading` y el HEAD dirá.
  const answered = r.data !== null;
  if (answered && (!r.ok || !r.data?.file)) return { ok: false as const, error: r.data?.error ?? "No se pudo detener" };
  await db.communityRecording.update({
    where: { id: row.id },
    data: {
      status: "uploading",
      endedAt: new Date(),
      ...(r.data?.file ? { boxFile: r.data.file } : {}),
      ...(r.data?.bytes ? { bytes: r.data.bytes } : {}),
    },
  });
  return { ok: true as const };
}

export async function stopRecording(
  community: { id: string },
  title: string,
  room = clubCallRoom(),
  event?: { id: string; startsAt: Date } | null
) {
  let row = await db.communityRecording.findFirst({
    where: { communityId: community.id, status: "recording", room },
    orderBy: { createdAt: "desc" },
  });
  if (!row) {
    // Grabación sin fila (p. ej. arrancó antes de este deploy): `start` la registra sin duplicar.
    const s = await startRecording(community, title, room, { event });
    if (!s.ok) return s;
    row = await db.communityRecording.findFirst({
      where: { communityId: community.id, status: "recording", room },
      orderBy: { createdAt: "desc" },
    });
    if (!row) return { ok: false as const, error: "No se está grabando" };
  }
  return finish(row);
}

/** «Reintentar» del anfitrión: vuelve a pedir el HLS del archivo de la caja. */
export async function retryRecording(communityId: string, id: string) {
  const row = await db.communityRecording.findFirst({ where: { id, communityId } });
  if (!row?.boxFile) return { ok: false as const, error: "Esta grabación no tiene archivo en la caja" };
  return finish(row);
}

/**
 * Filas `recording` cuya sala ya no se graba (el anfitrión se fue sin parar y la caja paró sola):
 * se pide el HLS de su archivo. Se espera 1 min tras arrancar para no pisar el arranque.
 */
async function reconcile(communityId: string) {
  const open = await db.communityRecording.findMany({ where: { communityId, status: "recording" } });
  for (const row of open) {
    if (Date.now() - row.createdAt.getTime() < 60_000) continue;
    const state = await recordingState(row.room);
    if (state && !state.recording) await finish(row).catch(() => null);
  }
}

/** Grabaciones del club; de paso cierra las abandonadas y confirma las que se estaban subiendo. */
export async function listRecordings(communityId: string, canMod: boolean) {
  await reconcile(communityId).catch(() => null);
  const notHidden = { OR: [{ hiddenAt: null }, { hiddenAt: { isSet: false } }] };
  const rows = await db.communityRecording.findMany({
    where: { communityId, ...(canMod ? {} : notHidden) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  for (const r of rows.filter((x) => x.status === "uploading")) {
    const marker = readyMarkerKey(r.storageKey.replace(/\/master\.m3u8$/, ""));
    const status = nextStatus(r, await fileExist(marker, 3600, false));
    if (status !== r.status) {
      await db.communityRecording.update({ where: { id: r.id }, data: { status } });
      r.status = status;
    }
  }
  return rows
    .filter((r) => canMod || r.status === "ready" || r.status === "uploading")
    .map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      endedAt: (r.status === "recording" ? r.createdAt : r.endedAt).toISOString(),
      minutes:
        r.startedAt && r.status !== "recording"
          ? Math.max(1, Math.round((r.endedAt.getTime() - r.startedAt.getTime()) / 60_000))
          : null,
      hidden: !!r.hiddenAt,
      eventId: r.eventId ?? null,
      canRetry: canMod && r.status === "failed" && !!r.boxFile,
      poster: r.status === "ready" ? buildHlsProxyUrl(r.storageKey.replace(/master\.m3u8$/, "poster.jpg")) : null,
    }));
}

/** URL del proxy HLS firmada para una grabación lista, o null. Quien llama ya revisó la membresía. */
export async function recordingPlayUrl(communityId: string, id: string, opts: { includeHidden?: boolean } = {}) {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  const r = await db.communityRecording.findFirst({ where: { id, communityId, status: "ready" } });
  // El anfitrión ve también las ocultas: es como decide si borrarlas.
  if (!r || (r.hiddenAt && !opts.includeHidden)) return null;
  return buildHlsProxyUrl(r.storageKey);
}
