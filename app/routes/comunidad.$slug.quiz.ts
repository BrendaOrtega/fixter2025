// Quiz en vivo del club: ruta de recurso (sin UI) que consulta el panel de la llamada.
//
// Va APARTE del action de la llamada a propósito: aquel reenvía cada respuesta a la sala como
// estado de grabación, y una respuesta del quiz le diría «ya no se graba».
//
//   GET  /comunidad/:slug/quiz            → { enabled, canHost, active }   (sondeo, cada 5 s)
//   GET  /comunidad/:slug/quiz?list=1     → { quizzes } de ESTA comunidad  (anfitrión o coanfitrión)
//   GET  /comunidad/:slug/quiz?quiz=<id>  → { quiz } completo, para editar (dueño o admin)
//   GET  /comunidad/:slug/quiz?play=1     → el QR del tablero: manda al miembro a su partida
//   POST intent=quiz-start | quiz-end                                      (anfitrión o coanfitrión)
//   POST intent=quiz-save | quiz-archive | hosts-save                      (dueño o admin)
//
// Quién es anfitrión se decide por comunidad (`canHostQuiz`): su dueño, un ADMIN de la plataforma
// o un coanfitrión que el dueño nombró. Ya no depende de la lista global de la sala.
import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { getUserOrNull } from "~/.server/dbGetters";
import { isCallGuestToday } from "~/.server/services/club-invites.server";
import {
  activeGame, archiveQuiz, boardUrl, canHostQuiz, cleanHostEmails, endGame, getQuiz, listQuizzes, parseQuiz, playerUrl,
  quizBase, quizEnabled, saveQuiz, startGame,
} from "~/.server/services/club-quiz.server";
import { canModerate, canParticipate } from "~/.server/services/wall.server";

type Access = { community: { id: string; name: string; callSkin: unknown }; canPlay: boolean; canHost: boolean; canEdit: boolean };

// El sondeo llega cada 5 s por persona: los permisos se recuerdan un minuto.
const ACCESS_MS = 60_000;
const accessCache = new Map<string, { at: number; access: Access | null }>();

async function resolveAccess(user: NonNullable<Awaited<ReturnType<typeof getUserOrNull>>>, slug: string): Promise<Access | null> {
  const key = `${slug}:${user.id}`;
  const hit = accessCache.get(key);
  if (hit && Date.now() - hit.at < ACCESS_MS) return hit.access;
  const community = await db.community.findFirst({ where: { slug, isActive: true }, select: { id: true, ownerId: true, name: true, callSkin: true, quizHostEmails: true },
  });
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
    const canHost = canHostQuiz(user, community);
    access = {
      community: { id: community.id, name: community.name, callSkin: community.callSkin },
      // Juega quien puede estar en la llamada: miembro activo o invitado de hoy.
      canPlay: canHost || canParticipate(user, membership, community) || isCallGuestToday(invite),
      canHost,
      // Editar quizzes y nombrar coanfitriones es de quien administra el club.
      canEdit: canModerate(user, community),
    };
  }
  accessCache.set(key, { at: Date.now(), access });
  return access;
}

const OFF = { enabled: false, canHost: false, canEdit: false, active: null } as const;
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
    const game = await activeGame(access.community.id);
    throw redirect(game ? playerUrl(quizBase(), game.inviteCode, user) : home);
  }

  if (!user) return json(OFF, { status: 401 });
  const access = await resolveAccess(user, slug);
  if (!access) return json(OFF, { status: 404 });

  if (url.searchParams.has("list")) {
    if (!access.canHost) return json({ error: "Sólo el anfitrión lanza quizzes." }, { status: 403 });
    return json({ quizzes: await listQuizzes(access.community.id) });
  }
  const quizId = url.searchParams.get("quiz");
  if (quizId) {
    if (!access.canEdit) return json({ error: "Sólo quien administra el club edita los quizzes." }, { status: 403 });
    const quiz = await getQuiz(access.community.id, quizId);
    return quiz ? json({ quiz }) : json({ error: "Ese quiz ya no existe." }, { status: 404 });
  }

  if (!access.canPlay) return json(OFF, { status: 403 });
  const game = await activeGame(access.community.id);
  if (!game) return json({ enabled: true, canHost: access.canHost, canEdit: access.canEdit, active: null });
  return json({
    enabled: true,
    canHost: access.canHost,
    canEdit: access.canEdit,
    active: access.canHost
      ? // El anfitrión no juega su propia partida (Razzia lo rechaza): ve los controles.
        // Partida abierta: se enseña el PIN para quien juegue desde fuera. Sólo miembros: no sirve, no se enseña.
        {
          gameId: game.gameId,
          subject: game.subject,
          membersOnly: !!game.membersOnly,
          inviteCode: game.membersOnly ? undefined : game.inviteCode,
          site: new URL(quizBase()).host,
          boardUrl: boardUrl(quizBase(), game.gameId),
        }
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
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  // ── Administrar: quizzes y coanfitriones ──
  if (intent === "quiz-save" || intent === "quiz-archive" || intent === "hosts-save") {
    if (!access.canEdit) return json({ error: "Sólo quien administra el club puede hacer esto." }, { status: 403 });
    if (intent === "quiz-save") {
      let raw: unknown = null;
      try {
        raw = JSON.parse(String(form.get("quiz") ?? ""));
      } catch {}
      const parsed = parseQuiz(raw);
      if (!parsed.ok) return json({ error: parsed.error }, { status: 400 });
      const id = await saveQuiz(access.community.id, user.id, String(form.get("id") ?? "") || null, parsed.quiz);
      return id ? json({ ok: true, id }) : json({ error: "Ese quiz ya no existe." }, { status: 404 });
    }
    if (intent === "quiz-archive") {
      const done = await archiveQuiz(access.community.id, String(form.get("id") ?? ""));
      return done ? json({ ok: true }) : json({ error: "Ese quiz ya no existe." }, { status: 404 });
    }
    const emails = cleanHostEmails(form.getAll("email").map(String));
    await db.community.update({ where: { id: access.community.id }, data: { quizHostEmails: emails } });
    accessCache.clear(); // los permisos nuevos valen desde ya, no en un minuto
    return json({ ok: true, emails });
  }

  // ── Jugar: lanzar y terminar ──
  if (!access.canHost) return json({ error: "Sólo el anfitrión lanza quizzes." }, { status: 403 });

  if (intent === "quiz-start") {
    const r = await startGame({ ...access.community, slug }, String(form.get("quizId") ?? ""), user.id, {
      membersOnly: form.get("membersOnly") === "1",
    });
    if (!r.ok) return json({ error: r.error }, { status: 502 });
    return json({ ok: true, managerUrl: r.managerUrl, subject: r.game.subject });
  }
  if (intent === "quiz-end") {
    await endGame(access.community.id);
    return json({ ok: true });
  }
  return json({ error: "Acción desconocida" }, { status: 400 });
};
