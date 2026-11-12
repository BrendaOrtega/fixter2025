// «Mundo» del club: presencia de las naves (recurso, sin UI). Todo en memoria; no escribe en la base.
//   GET  /comunidad/:slug/mundo  → { cartridge, count, ships, waves, me } (`cartridge`: id del mundo activo)
//   POST /comunidad/:slug/mundo  → cuerpo JSON `{x, y, tx, ty, ship, color, pilot, table?}` (latido y
//                                   posición), `{wave: userId}` (saludo), `{boom: botId}` (robot tumbado), `{share: {key, value}}` (estado compartido del modo de juego) o `{leave: true}`. Responde
//                                   lo mismo que el GET, así el cliente sondea con un solo viaje.
// Sólo quien está adentro del club: mismos guardias que la acción de /comunidad/:slug.
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { getUserOrNull } from "~/.server/dbGetters";
import { MAX_BODY, hydrateCartridge, removeShip, sendBoom, sendNudge, sendSay, sendWave, setShared, snapshot, upsertShip } from "~/.server/services/club-world.server";
import { avatarUrlFor, canParticipate } from "~/.server/services/wall.server";
import { getSession } from "~/sessions";

type Access = { communityId: string; who: { id: string; name: string; photoURL: string } } | null;

// El sondeo llega cada ~2.5 s por persona: quién es y si puede entrar se recuerda un minuto
// (misma idea que el quiz), para no leer la base en cada latido.
const ACCESS_MS = 60_000;
const accessCache = new Map<string, { at: number; access: Access }>();

async function resolveAccess(request: Request, slug: string): Promise<Access> {
  const session = await getSession(request.headers.get("Cookie"));
  const email = session.get("email");
  if (typeof email !== "string" || !email) return null;
  const key = `${slug}:${email}`;
  const hit = accessCache.get(key);
  if (hit && Date.now() - hit.at < ACCESS_MS) return hit.access;
  if (accessCache.size > 2000) accessCache.clear();

  let access: Access = null;
  const [user, community] = await Promise.all([
    getUserOrNull(request),
    db.community.findFirst({ where: { slug, isActive: true }, select: { id: true, ownerId: true, worldCartridge: true } }),
  ]);
  // El mundo activo se lee de la base la primera vez; después lo lleva la memoria del servicio.
  if (community) hydrateCartridge(community.id, community.worldCartridge);
  if (user && community) {
    const membership = await db.membership.findUnique({
      where: { communityId_userId: { communityId: community.id, userId: user.id } },
      select: { status: true, currentPeriodEnd: true },
    });
    if (canParticipate(user, membership, community)) {
      // El correo nunca sale al cliente: sólo nombre y foto.
      const name = (user.displayName || user.username || user.email.split("@")[0]).slice(0, 40);
      access = { communityId: community.id, who: { id: user.id, name, photoURL: avatarUrlFor(user) } };
    }
  }
  accessCache.set(key, { at: Date.now(), access });
  return access;
}

// Respuesta explícita: a esta ruta se le pega con fetch directo.
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const access = await resolveAccess(request, params.slug as string);
  if (!access) return json({ error: "Únete al club para entrar al Mundo." }, 403);
  return json({ ...snapshot(access.communityId), me: access.who.id });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const access = await resolveAccess(request, params.slug as string);
  if (!access) return json({ error: "Únete al club para entrar al Mundo." }, 403);

  if (Number(request.headers.get("Content-Length") ?? 0) > MAX_BODY) return json({ error: "Cuerpo demasiado grande." }, 413);
  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: "Cuerpo demasiado grande." }, 413);
  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw || "{}");
    body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }

  const { communityId, who } = access;
  if (body.leave === true) {
    removeShip(communityId, who.id);
    return json({ ok: true });
  }
  let waveId: string | null = null;
  let sayId: string | null = null;
  let nudgeId: string | null = null;
  if ("wave" in body) waveId = sendWave(communityId, who.id, body.wave);
  else if ("say" in body) sayId = sendSay(communityId, who.id, body.say);
  else if ("nudge" in body) nudgeId = sendNudge(communityId, who.id, body.nudge, Date.now(), body.kind);
  else if ("boom" in body) sendBoom(communityId, who.id, body.boom);
  else if ("share" in body) setShared(communityId, who.id, body.share);
  else if (!upsertShip(communityId, who, body)) return json({ error: "El Mundo está lleno. Intenta en un momento." }, 429);
  return json({ ...snapshot(communityId), me: who.id, waveId, sayId, nudgeId });
};
