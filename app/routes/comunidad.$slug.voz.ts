// Voz en las mesas del «Mundo» (recurso, sin UI). El interruptor vive en memoria; no escribe en la base.
//   GET  /comunidad/:slug/voz → { enabled, canManage, table, roster }
//   POST /comunidad/:slug/voz → `{intent: "token", zone}`  → { token, wsUrl, identity, table }
//                               `{intent: "toggle", on}`   → { enabled }   (sólo quien administra)
// Sólo quien está adentro del club: mismos guardias que /comunidad/:slug/mundo.
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { getUserOrNull } from "~/.server/dbGetters";
import { issueVoiceToken, seatedTable, setVoiceEnabled, tableRoster, voiceEnabled } from "~/.server/services/club-voice.server";
import { canModerate, canParticipate } from "~/.server/services/wall.server";
import { getSession } from "~/sessions";

type Access = { communityId: string; canManage: boolean; who: { id: string; name: string } } | null;

// El estado se sondea cada ~15 s por persona: quién es y si puede entrar se recuerda un minuto.
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
    db.community.findFirst({ where: { slug, isActive: true }, select: { id: true, ownerId: true } }),
  ]);
  if (user && community) {
    const membership = await db.membership.findUnique({
      where: { communityId_userId: { communityId: community.id, userId: user.id } },
      select: { status: true, currentPeriodEnd: true },
    });
    if (canParticipate(user, membership, community)) {
      // Mismo nombre que usa la presencia del Mundo; el correo nunca sale al cliente.
      const name = (user.displayName || user.username || user.email.split("@")[0]).slice(0, 40);
      // Administra: dueño de la comunidad o ADMIN de la casa (misma regla que el panel de admin).
      access = { communityId: community.id, canManage: canModerate(user, community), who: { id: user.id, name } };
    }
  }
  accessCache.set(key, { at: Date.now(), access });
  return access;
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

function state(access: NonNullable<Access>) {
  const on = voiceEnabled(access.communityId);
  const table = on ? seatedTable(access.communityId, access.who.id) : null;
  return { enabled: on, canManage: access.canManage, table, roster: table === null ? [] : tableRoster(access.communityId, table) };
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const access = await resolveAccess(request, params.slug as string);
  if (!access) return json({ error: "Únete al club para entrar al Mundo." }, 403);
  return json(state(access));
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const slug = params.slug as string;
  const access = await resolveAccess(request, slug);
  if (!access) return json({ error: "Únete al club para entrar al Mundo." }, 403);

  const raw = await request.text();
  if (raw.length > 500) return json({ error: "Cuerpo demasiado grande." }, 413);
  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw || "{}");
    body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }

  if (body.intent === "toggle") {
    const r = setVoiceEnabled({ communityId: access.communityId, canManage: access.canManage, on: body.on });
    if (!r.ok) return json({ error: r.error }, r.status);
    return json(state(access));
  }
  if (body.intent === "token") {
    const r = await issueVoiceToken({ communityId: access.communityId, slug, who: access.who, zone: body.zone });
    if (!r.ok) return json({ error: r.error, code: r.code }, r.status);
    return json({ token: r.token, wsUrl: r.wsUrl, identity: r.identity, table: r.table, roster: tableRoster(access.communityId, r.table) });
  }
  return json({ error: "Acción desconocida." }, 400);
};
