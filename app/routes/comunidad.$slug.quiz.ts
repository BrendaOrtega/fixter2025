// Quiz en vivo del club: ruta de recurso (sin UI) que consulta el panel de la llamada.
//
// Va APARTE del action de la llamada a propósito: aquel reenvía cada respuesta a la sala como
// estado de grabación, y una respuesta del quiz le diría «ya no se graba».
//
//   GET  /comunidad/:slug/quiz            → { enabled, canHost, active }   (sondeo, cada 5 s)
//   GET  /comunidad/:slug/quiz?list=1     → { quizzes }                    (sólo anfitrión)
//   GET  /comunidad/:slug/quiz?editor=1   → redirige al editor de quizzes  (anfitrión o moderador)
//   GET  /comunidad/:slug/quiz?play=1     → el QR del tablero: manda al miembro a su partida
//   POST intent=quiz-start | quiz-end                                      (sólo anfitrión)
import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { getUserOrNull } from "~/.server/dbGetters";
import { isHostEmail } from "~/.server/services/club-call.server";
import { isCallGuestToday } from "~/.server/services/club-invites.server";
import {
  activeGame, boardUrl, editorUrl, endGame, listQuizzes, playerUrl, quizBase, quizEnabled, startGame,
} from "~/.server/services/club-quiz.server";
import { canModerate, canParticipate } from "~/.server/services/wall.server";

type Access = { communityId: string; canPlay: boolean; canHost: boolean; canEdit: boolean };

// El sondeo llega cada 5 s por persona: los permisos se recuerdan un minuto.
const ACCESS_MS = 60_000;
const accessCache = new Map<string, { at: number; access: Access | null }>();

async function resolveAccess(user: NonNullable<Awaited<ReturnType<typeof getUserOrNull>>>, slug: string): Promise<Access | null> {
  const key = `${slug}:${user.id}`;
  const hit = accessCache.get(key);
  if (hit && Date.now() - hit.at < ACCESS_MS) return hit.access;
  const community = await db.community.findFirst({ where: { slug, isActive: true }, select: { id: true, ownerId: true } });
  let access: Access | null = null;
  if (community) {
    const [membership, invite] = await Promise.all([
      db.membership.findUnique({
        where: { communityId_userId: { communityId: community.id, userId: user.id } },
        select: { status: true, currentPeriodEnd: true },
      }),
      db.communityInvite.findUnique({
        where: { communityId_email: { communityId: community.id, email: user.email.trim().toLowerCase() } },
        select: { callDays: true },
      }),
    ]);
    const canHost = isHostEmail(user.email);
    const canMod = canModerate(user, community);
    access = {
      communityId: community.id,
      // Juega quien puede estar en la llamada: miembro activo o invitado de hoy.
      canPlay: canHost || canParticipate(user, membership, community) || isCallGuestToday(invite),
      canHost,
      canEdit: canHost || canMod,
    };
  }
  accessCache.set(key, { at: Date.now(), access });
  return access;
}

const OFF = { enabled: false, canHost: false, active: null } as const;
// Respuesta explícita: a esta ruta se le pega con fetch directo, no pasa por el serializador de loaders.
const json = (body: unknown, init?: ResponseInit) => Response.json(body, init);

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const slug = params.slug as string;
  if (!quizEnabled()) return json(OFF);
  const user = await getUserOrNull(request);
  const url = new URL(request.url);

  // QR del tablero: se abre en el celular. Con sesión y partida en curso cae directo a jugar con
  // su identidad firmada; sin sesión pasa por el login y regresa; en cualquier otro caso, al club.
  if (url.searchParams.has("play")) {
    const home = `/comunidad/${slug}`;
    if (!user) throw redirect(`/login?next=${encodeURIComponent(`${home}/quiz?play=1`)}`);
    const access = await resolveAccess(user, slug);
    if (!access?.canPlay || access.canHost) throw redirect(home);
    const game = await activeGame(access.communityId);
    throw redirect(game ? playerUrl(quizBase(), game.inviteCode, user) : home);
  }

  if (!user) return json(OFF, { status: 401 });
  const access = await resolveAccess(user, slug);
  if (!access) return json(OFF, { status: 404 });

  if (url.searchParams.has("editor")) {
    if (!access.canEdit) return json({ error: "Sólo el anfitrión edita los quizzes." }, { status: 403 });
    const target = await editorUrl();
    if (!target) return json({ error: "El servidor de quizzes no contestó. Intenta de nuevo." }, { status: 502 });
    throw redirect(target);
  }
  if (url.searchParams.has("list")) {
    if (!access.canHost) return json({ error: "Sólo el anfitrión lanza quizzes." }, { status: 403 });
    return json({ quizzes: (await listQuizzes()) ?? [] });
  }

  if (!access.canPlay) return json(OFF, { status: 403 });
  const game = await activeGame(access.communityId);
  if (!game) return json({ enabled: true, canHost: access.canHost, active: null });
  return json({
    enabled: true,
    canHost: access.canHost,
    active: access.canHost
      ? // El anfitrión no juega su propia partida (Razzia lo rechaza): ve los controles.
        // Con identidad firmada sólo entran miembros: el PIN ya no le sirve a nadie de fuera y no se enseña.
        { gameId: game.gameId, subject: game.subject, inviteCode: process.env.QUIZ_IDENTITY_SECRET ? undefined : game.inviteCode, boardUrl: boardUrl(quizBase(), game.gameId) }
      : { gameId: game.gameId, subject: game.subject, playerUrl: playerUrl(quizBase(), game.inviteCode, user) },
  });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const slug = params.slug as string;
  if (!quizEnabled()) return json({ error: "El quiz está apagado." }, { status: 503 });
  const user = await getUserOrNull(request);
  if (!user) return json({ error: "Inicia sesión." }, { status: 401 });
  const access = await resolveAccess(user, slug);
  if (!access) return json({ error: "Comunidad no encontrada" }, { status: 404 });
  if (!access.canHost) return json({ error: "Sólo el anfitrión lanza quizzes." }, { status: 403 });
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "quiz-start") {
    const r = await startGame({ id: access.communityId, slug }, String(form.get("quizId") ?? ""), user.id);
    if (!r.ok) return json({ error: r.error }, { status: 502 });
    return json({ ok: true, managerUrl: r.managerUrl, subject: r.game.subject });
  }
  if (intent === "quiz-end") {
    await endGame(access.communityId);
    return json({ ok: true });
  }
  return json({ error: "Acción desconocida" }, { status: 400 });
};
