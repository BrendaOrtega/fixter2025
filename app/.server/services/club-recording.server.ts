// Grabaciones de las llamadas del club (10-nov-2026).
//
// La caja de eventos graba la sala del día y, al parar, la convierte a HLS (1080/720/480, póster y
// miniaturas) y la sube a nuestro bucket de video, en `fixtergeek/videos/club/<club>/<id>/hls/`, el
// mismo camino que los webinars de Teams. gs sólo hace de puente
// (`/api/v2/partner/event-box/recording`, salas `fx-*`): el ADMIN_TOKEN de la caja nunca sale de gs.
//
// Flujo:
//   1. El anfitrión entra a la llamada → `startRecording` (automático, para no olvidarlo).
//   2. Termina → «Detener y guardar» → `stopRecording`: fila `uploading` + la caja convierte y sube.
//   3. Cada carga del club revisa las `uploading` con un HEAD al `master.m3u8` → `ready`.
//   4. Sólo a miembros se les entrega la URL del proxy HLS firmada (`~/.server/hls`).
import { db } from "~/.server/db";
import { fileExist } from "~/.server/tigrs";
import { buildHlsProxyUrl } from "~/.server/hls";
import { clubCallRoom, partnerPost } from "~/.server/services/club-call.server";

const PATH = "/api/v2/partner/event-box/recording";
/** Si en 12 h no apareció el HLS, la conversión falló (4 h de llamada tardan en transcodificar). */
export const UPLOAD_GIVE_UP_MS = 12 * 60 * 60_000;

export type RecState = { recording: boolean; busy: boolean; startedAt: string | null };

/** Carpeta HLS de una grabación (llave completa del bucket). */
export function hlsPrefixFor(communityId: string, recordingId: string) {
  return `fixtergeek/videos/club/${communityId}/${recordingId}/hls`;
}

/** uploading → ready si el objeto ya está; → failed si se pasó del plazo. */
export function nextStatus(r: { status: string; endedAt: Date }, exists: boolean, now = Date.now()) {
  if (r.status !== "uploading") return r.status;
  if (exists) return "ready";
  return now - r.endedAt.getTime() > UPLOAD_GIVE_UP_MS ? "failed" : "uploading";
}

export async function recordingState(room = clubCallRoom()): Promise<RecState | null> {
  const r = await partnerPost<RecState>(PATH, { action: "state", room });
  return r.ok && r.data ? { recording: !!r.data.recording, busy: !!r.data.busy, startedAt: r.data.startedAt ?? null } : null;
}

export async function startRecording(title: string, room = clubCallRoom()) {
  const r = await partnerPost<RecState>(PATH, { action: "start", room, title });
  return r.ok ? { ok: true as const } : { ok: false as const, error: r.data?.error ?? "No se pudo grabar" };
}

export async function stopRecording(community: { id: string }, title: string, room = clubCallRoom()) {
  const state = await recordingState(room);
  if (!state?.recording) return { ok: false as const, error: state?.busy ? "La caja graba otra sala" : "No se está grabando" };
  // La fila va primero: su id nombra la carpeta del HLS.
  const row = await db.communityRecording.create({
    data: {
      communityId: community.id,
      room,
      title,
      storageKey: "",
      startedAt: state.startedAt ? new Date(state.startedAt) : undefined,
    },
  });
  const prefix = hlsPrefixFor(community.id, row.id);
  const r = await partnerPost<{ file: string; bytes: number | null }>(PATH, { action: "stop", room, hlsPrefix: prefix });
  if (!r.ok || !r.data?.file) {
    await db.communityRecording.delete({ where: { id: row.id } });
    return { ok: false as const, error: r.data?.error ?? "No se pudo detener" };
  }
  await db.communityRecording.update({
    where: { id: row.id },
    data: { storageKey: `${prefix}/master.m3u8`, bytes: r.data.bytes ?? undefined, endedAt: new Date() },
  });
  return { ok: true as const };
}

/** Grabaciones visibles del club; de paso confirma las que se estaban subiendo. */
export async function listRecordings(communityId: string, canMod: boolean) {
  const notHidden = { OR: [{ hiddenAt: null }, { hiddenAt: { isSet: false } }] };
  const rows = await db.communityRecording.findMany({
    where: { communityId, ...(canMod ? {} : notHidden) },
    orderBy: { endedAt: "desc" },
    take: 50,
  });
  for (const r of rows.filter((x) => x.status === "uploading")) {
    const status = nextStatus(r, await fileExist(r.storageKey, 3600, false));
    if (status !== r.status) {
      await db.communityRecording.update({ where: { id: r.id }, data: { status } });
      r.status = status;
    }
  }
  return rows
    .filter((r) => canMod || r.status !== "failed")
    .map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      endedAt: r.endedAt.toISOString(),
      minutes: r.startedAt ? Math.max(1, Math.round((r.endedAt.getTime() - r.startedAt.getTime()) / 60_000)) : null,
      hidden: !!r.hiddenAt,
      poster:
        r.status === "ready" ? buildHlsProxyUrl(r.storageKey.replace(/master\.m3u8$/, "poster.jpg")) : null,
    }));
}

/** URL del proxy HLS firmada para una grabación lista, o null. Quien llama ya revisó la membresía. */
export async function recordingPlayUrl(communityId: string, id: string) {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  const r = await db.communityRecording.findFirst({ where: { id, communityId, status: "ready" } });
  if (!r || r.hiddenAt) return null;
  return buildHlsProxyUrl(r.storageKey);
}
