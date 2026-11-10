// Grabaciones de las llamadas del club (10-nov-2026).
//
// La caja de eventos graba la sala del día y, al parar, sube el MP4 DIRECTO a nuestro bucket con
// un PUT prefirmado que le damos aquí. gs sólo hace de puente (`/api/v2/partner/event-box/recording`,
// salas `fx-*`): el ADMIN_TOKEN de la caja nunca sale de gs y el video nunca pasa por gs.
//
// Flujo:
//   1. El anfitrión entra a la llamada → `startRecording` (automático, para no olvidarlo).
//   2. Termina → «Detener y guardar» → `stopRecording`: fila `uploading` + la caja sube.
//   3. Cada carga del club revisa las `uploading` con un HEAD al bucket → `ready`.
//   4. Un miembro da play → `/comunidad/:slug/grabacion/:id` revisa la membresía y redirige a
//      una URL de lectura prefirmada (2 h).
import { db } from "~/.server/db";
import { fileExist, getPutFileUrl, getReadURL } from "~/.server/tigrs";
import { clubCallRoom, partnerPost } from "~/.server/services/club-call.server";

const PATH = "/api/v2/partner/event-box/recording";
/** Si en 6 h no apareció el MP4, la subida falló. */
export const UPLOAD_GIVE_UP_MS = 6 * 60 * 60_000;

export type RecState = { recording: boolean; busy: boolean; startedAt: string | null };

export function recordingKey(communityId: string, room: string, now = Date.now()) {
  return `club/${communityId}/${room}-${now}.mp4`;
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
  const key = recordingKey(community.id, room);
  const putUrl = await getPutFileUrl(key);
  const r = await partnerPost<{ file: string; bytes: number | null }>(PATH, { action: "stop", room, putUrl });
  if (!r.ok || !r.data?.file) return { ok: false as const, error: r.data?.error ?? "No se pudo detener" };
  await db.communityRecording.create({
    data: {
      communityId: community.id,
      room,
      title,
      storageKey: key,
      bytes: r.data.bytes ?? undefined,
      startedAt: state?.startedAt ? new Date(state.startedAt) : undefined,
    },
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
    const status = nextStatus(r, await fileExist(r.storageKey));
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
    }));
}

export async function recordingReadUrl(communityId: string, id: string) {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  const r = await db.communityRecording.findFirst({ where: { id, communityId, status: "ready" } });
  if (!r || r.hiddenAt) return null;
  return getReadURL(r.storageKey, 2 * 60 * 60);
}
