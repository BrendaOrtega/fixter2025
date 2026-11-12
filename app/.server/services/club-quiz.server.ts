// Quiz en vivo de las comunidades (12-nov-2026). Multi-comunidad: cada club es un cliente.
//
// El quiz corre en un servicio aparte: Razzia (MIT), fork en `blissito/razzia`, en su propia
// caja. Razzia es sólo el MOTOR de partidas; los datos son de FixterGeek:
//   · los quizzes viven en Mongo por comunidad (`CommunityQuiz`) y se mandan completos al lanzar;
//   · la marca de la partida sale del `callSkin` de la comunidad (la misma de su sala);
//   · el resultado se lee al terminar, se guarda aquí y se borra de Razzia.
// El navegador del anfitrión recibe un `hostToken` que sólo maneja ESA partida; la llave del
// servicio (QUIZ_SERVICE_KEY) nunca sale del servidor.
//
// El tablero (preguntas, ranking, podio) sólo existe en la pantalla del manager: el anfitrión la
// abre en otra ventana y la comparte. Esa ventana además mantiene viva la partida: Razzia borra a
// los 5 min una partida sin manager conectado.
//
// Interruptor de apagado: sin QUIZ_API_URL o sin QUIZ_SERVICE_KEY todo contesta «apagado» y la
// página de la llamada queda exactamente como estaba.
//
// Env:
//   QUIZ_API_URL          https://quiz.fixtergeek.com (sin diagonal final)
//   QUIZ_SERVICE_KEY      la SERVICE_KEY de la caja de Razzia; nunca sale del servidor
//   QUIZ_IDENTITY_SECRET  opcional; el IDENTITY_SECRET de Razzia. Con él, cada miembro entra con
//                         una identidad firmada: Razzia impone su nombre del club y guarda su id
//                         de usuario en el resultado. Sin él, entra sólo con PIN y nombre.
import crypto from "node:crypto";
import { z } from "zod";
import { db } from "~/.server/db";

const TIMEOUT_MS = 4000;
const CACHE_MS = 3000; // el sondeo de cada miembro cae aquí, no en Mongo
const VERIFY_MS = 15_000; // cada cuánto se le pregunta a Razzia si la partida sigue viva
const MAX_GAME_MS = 3 * 3600_000; // una partida «viva» más vieja que esto se da por terminada
export const QUIZ_NAME_MAX = 24; // tope de Razzia para el nombre del jugador

const IDENTITY_TTL_S = 6 * 3600;
/** El sitio de la plataforma: a donde lleva el QR de una partida «sólo miembros». */
export const PLATFORM_URL = "https://www.fixtergeek.com";

type QuizUser = { id?: string; email: string; displayName?: string | null; username: string };
export type QuizStanding = { userId: string | null; username: string; points: number; rank: number };
export type LiveGame = { id: string; gameId: string; inviteCode: string; subject: string; createdAt: Date; membersOnly: boolean | null };

export function quizBase(env: NodeJS.ProcessEnv = process.env): string {
  return (env.QUIZ_API_URL || "").trim().replace(/\/+$/, "");
}

export function quizEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!quizBase(env) && !!env.QUIZ_SERVICE_KEY;
}

// ── Reglas puras (probadas en __tests__/club-quiz.test.ts) ───────────────────

/** El mismo nombre que lleva en la llamada, recortado al tope de Razzia. */
export function quizPlayerName(user: QuizUser): string {
  // Un displayName de puros espacios cuenta como vacío.
  const name = [user.displayName, user.username, user.email.split("@")[0]].map((v) => (v ?? "").trim()).find(Boolean);
  return (name ?? "Invitado").slice(0, QUIZ_NAME_MAX);
}

/**
 * Identidad firmada que Razzia verifica con el mismo secreto: `base64url(JSON).hex(HMAC-SHA256)`.
 * Va atada al PIN, así que no sirve en otra partida.
 */
export function signIdentity(secret: string, p: { userId: string; name: string; inviteCode: string }, now = new Date()): string {
  const payload = { sub: p.userId, name: p.name, exp: Math.floor(now.getTime() / 1000) + IDENTITY_TTL_S, pin: p.inviteCode };
  const part = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${part}.${crypto.createHmac("sha256", secret).update(part).digest("hex")}`;
}

/** URL del panel del jugador: entra solo, en español y sin sonido (el tablero ya suena en la llamada). */
export function playerUrl(base: string, inviteCode: string, user: QuizUser, identitySecret = process.env.QUIZ_IDENTITY_SECRET): string {
  const name = quizPlayerName(user);
  const q = new URLSearchParams({ pin: inviteCode, name, lng: "es", mute: "1" });
  if (identitySecret && user.id) q.set("id", signIdentity(identitySecret, { userId: user.id, name, inviteCode }));
  return `${base}/?${q}`;
}

type RazziaResult = { id: string; gameId?: string; players?: Array<{ username: string; points: number; rank: number; externalId?: string }> };

/** Deja una fila por miembro (su mejor lugar si entró desde dos navegadores) y reordena los lugares. */
export function toStandings(players: NonNullable<RazziaResult["players"]>): QuizStanding[] {
  const seen = new Set<string>();
  const out: QuizStanding[] = [];
  for (const p of [...players].sort((a, b) => a.rank - b.rank)) {
    if (p.externalId) {
      if (seen.has(p.externalId)) continue;
      seen.add(p.externalId);
    }
    out.push({ userId: p.externalId ?? null, username: p.username, points: p.points, rank: out.length + 1 });
  }
  return out;
}

/** El token viaja en el hash: no llega a logs del servidor ni a cabeceras Referer. */
export function managerUrl(base: string, token: string, target: { gameId: string; join?: string }): string {
  const h = new URLSearchParams({ token, ...target });
  return `${base}/embed/manager?lng=es#${h}`;
}

/** Liga que va en el QR del tablero: quien la abre con sesión del club cae directo en la partida. */
export function joinUrl(slug: string, site = PLATFORM_URL): string {
  return `${site}/comunidad/${slug}/quiz?play=1`;
}

/** Reabrir el tablero en el mismo navegador: la sesión de manager ya vive ahí, no viaja de nuevo. */
export function boardUrl(base: string, gameId: string): string {
  return `${base}/party/manager/${encodeURIComponent(gameId)}`;
}

export function isStale(game: { createdAt: Date }, now = new Date()): boolean {
  return now.getTime() - game.createdAt.getTime() > MAX_GAME_MS;
}

// ── Quizzes de la comunidad ──────────────────────────────────────────────────

export const QUIZ_LIMITS = { subject: 80, question: 200, answer: 90, questions: 50, times: [10, 20, 30, 60] } as const;

const questionInput = z
  .object({
    question: z.string().trim().min(1, "Escribe la pregunta.").max(QUIZ_LIMITS.question),
    answers: z.array(z.string().trim().min(1, "Hay una respuesta vacía.").max(QUIZ_LIMITS.answer)).min(2, "Pon al menos dos respuestas.").max(4),
    solution: z.number().int().min(0),
    time: z.number().int().min(5).max(120),
    image: z.string().trim().url().startsWith("https://", "La imagen debe ser una liga https.").max(500).optional(),
  })
  .refine((q) => q.solution < q.answers.length, { message: "Marca cuál respuesta es la correcta.", path: ["solution"] });

export const quizInput = z.object({
  subject: z.string().trim().min(1, "Ponle nombre al quiz.").max(QUIZ_LIMITS.subject),
  questions: z.array(questionInput).min(1, "Agrega al menos una pregunta.").max(QUIZ_LIMITS.questions),
});
export type QuizInput = z.infer<typeof quizInput>;
export type QuizQuestion = QuizInput["questions"][number];

/** Valida lo que manda el editor. El error ya viene en español y dice en qué pregunta está. */
export function parseQuiz(raw: unknown): { ok: true; quiz: QuizInput } | { ok: false; error: string } {
  const r = quizInput.safeParse(raw);
  if (r.success) return { ok: true, quiz: r.data };
  const issue = r.error.issues[0];
  const at = issue.path[0] === "questions" && typeof issue.path[1] === "number" ? `Pregunta ${issue.path[1] + 1}: ` : "";
  return { ok: false, error: `${at}${issue.message}` };
}

/** El quiz en el formato de Razzia: opción única, 5 s entre pregunta y respuestas. */
export function toRazziaQuiz(quiz: QuizInput) {
  return {
    gameMode: "quiz" as const,
    subject: quiz.subject,
    questions: quiz.questions.map((q) => ({
      type: "single" as const,
      question: q.question,
      answers: q.answers,
      solutions: [q.solution],
      cooldown: 5,
      time: q.time,
      ...(q.image ? { media: { type: "image" as const, url: q.image } } : {}),
    })),
  };
}

// ── Permisos y marca por comunidad ───────────────────────────────────────────

export const MAX_QUIZ_HOSTS = 10;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Correos de coanfitriones: en minúsculas, sin repetir y sólo los que parecen correo. */
export function cleanHostEmails(raw: string[]): string[] {
  return [...new Set(raw.map((e) => e.trim().toLowerCase()).filter((e) => EMAIL.test(e)))].slice(0, MAX_QUIZ_HOSTS);
}

/**
 * Lanza quizzes quien modera la comunidad (su dueño o un ADMIN de la plataforma) y los
 * coanfitriones que el dueño nombró. Es por comunidad: no depende de variables de entorno.
 */
export function canHostQuiz(
  viewer: { id: string; email: string; role?: string | null } | null,
  community: { ownerId: string; quizHostEmails?: string[] | null }
): boolean {
  if (!viewer) return false;
  if (viewer.role === "ADMIN" || viewer.id === community.ownerId) return true;
  return (community.quizHostEmails ?? []).includes(viewer.email.trim().toLowerCase());
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
// Token del skin de la sala → variable de color del tablero y del jugador.
const SKIN_TO_THEME: Record<string, string> = {
  bg: "background",
  panel: "card",
  line: "border",
  ink: "foreground",
  muted: "muted-foreground",
  surface2: "muted",
  accent: "primary",
  accentInk: "primary-foreground",
};

export type QuizBrand = { appName: string; colors?: Record<string, string>; logo?: string };

/**
 * Marca de la partida: el nombre de la comunidad y, si tiene `callSkin`, sus colores y su logo
 * (los mismos de su sala). Sin skin, el tablero usa el tema de la casa.
 */
export function brandFor(community: { name: string; callSkin?: unknown }): QuizBrand {
  const brand: QuizBrand = { appName: community.name.slice(0, 60) };
  const skin = community.callSkin as { colors?: Record<string, unknown>; logoUrl?: unknown } | null | undefined;
  if (!skin || typeof skin !== "object") return brand;
  const colors: Record<string, string> = {};
  for (const [key, name] of Object.entries(SKIN_TO_THEME)) {
    const value = skin.colors?.[key];
    if (typeof value === "string" && HEX.test(value)) colors[name] = value;
  }
  if (Object.keys(colors).length) brand.colors = colors;
  if (typeof skin.logoUrl === "string" && skin.logoUrl.startsWith("https://")) brand.logo = skin.logoUrl;
  return brand;
}

// ── Razzia por HTTP ──────────────────────────────────────────────────────────

type Reply<T> = { ok: boolean; status: number; data: T | null };

/** `service: true` manda la llave del servicio; lo demás (revisar un PIN) es público. */
async function razzia<T>(path: string, init: { method?: string; service?: boolean; body?: unknown } = {}): Promise<Reply<T>> {
  try {
    const res = await fetch(`${quizBase()}${path}`, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: {
        ...(init.body === undefined ? {} : { "content-type": "application/json" }),
        ...(init.service ? { authorization: `Bearer ${process.env.QUIZ_SERVICE_KEY}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = (await res.json().catch(() => null)) as T | null;
    if (!res.ok) console.error(`[club-quiz] razzia ${path} contestó ${res.status}`);
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    console.error(`[club-quiz] no pude llamar a razzia ${path}:`, e instanceof Error ? e.message : e);
    return { ok: false, status: 0, data: null };
  }
}

// ── Quizzes en Mongo ─────────────────────────────────────────────────────────

// En Mongo un campo que nunca se escribió no es `null`: «sin archivar» cubre los dos casos.
const ACTIVE = { OR: [{ archivedAt: null }, { archivedAt: { isSet: false } }] };
const countOf = (questions: unknown) => (Array.isArray(questions) ? questions.length : 0);

export async function listQuizzes(communityId: string) {
  const rows = await db.communityQuiz.findMany({
    where: { communityId, ...ACTIVE },
    orderBy: { updatedAt: "desc" },
    select: { id: true, subject: true, questions: true, updatedAt: true },
  });
  return rows.map((q) => ({ id: q.id, subject: q.subject, questionCount: countOf(q.questions), updatedAt: q.updatedAt }));
}

/** Un quiz de ESTA comunidad, o null. El filtro por comunidad es el aislamiento entre clientes. */
export async function getQuiz(communityId: string, id: string) {
  if (!/^[0-9a-f]{24}$/i.test(id)) return null;
  const row = await db.communityQuiz.findFirst({
    where: { id, communityId, ...ACTIVE },
    select: { id: true, subject: true, questions: true },
  });
  if (!row) return null;
  const parsed = quizInput.safeParse({ subject: row.subject, questions: row.questions });
  return parsed.success ? { id: row.id, ...parsed.data } : null;
}

export async function saveQuiz(communityId: string, userId: string, id: string | null, quiz: QuizInput) {
  if (id) {
    const done = await db.communityQuiz.updateMany({
      where: { id, communityId, ...ACTIVE },
      data: { subject: quiz.subject, questions: quiz.questions },
    });
    return done.count ? id : null;
  }
  const row = await db.communityQuiz.create({
    data: { communityId, createdById: userId, subject: quiz.subject, questions: quiz.questions },
    select: { id: true },
  });
  return row.id;
}

/** Archivar, no borrar: las partidas ya jugadas conservan su copia y nada se pierde por un clic. */
export async function archiveQuiz(communityId: string, id: string) {
  const done = await db.communityQuiz.updateMany({ where: { id, communityId, ...ACTIVE }, data: { archivedAt: new Date() } });
  return done.count > 0;
}

// ── Partida en curso ─────────────────────────────────────────────────────────

const cache = new Map<string, { at: number; verifiedAt: number; game: LiveGame | null }>();

/**
 * Resultado de una partida, leído de Razzia. Sólo existe si se jugó hasta el podio; null si se
 * terminó antes o Razzia no contesta. Se lee (pull): Razzia nunca nos llama.
 */
async function fetchStandings(game: { gameId: string }): Promise<QuizStanding[] | null> {
  const list = await razzia<{ results: Array<{ id: string }> }>(`/api/results?gameId=${encodeURIComponent(game.gameId)}`, { service: true });
  const meta = list.data?.results?.[0];
  if (!meta) return null;
  const full = await razzia<RazziaResult>(`/api/results/${encodeURIComponent(meta.id)}`, { service: true });
  if (full.data?.gameId !== game.gameId || !full.data.players) return null;
  // Ya está en Mongo en cuanto regresa: en Razzia no se queda nada de la comunidad.
  await razzia(`/api/results/${encodeURIComponent(meta.id)}`, { method: "DELETE", service: true });
  return toStandings(full.data.players);
}

async function closeGames(communityId: string) {
  const live = await db.communityQuizGame.findMany({
    where: { communityId, status: "live" },
    select: { id: true, gameId: true },
  });
  for (const game of live) {
    // Guardar el resultado es de mejor esfuerzo: cerrar la partida nunca depende de Razzia.
    const standings = await fetchStandings(game).catch(() => null);
    await db.communityQuizGame.update({
      where: { id: game.id },
      data: { status: "ended", endedAt: new Date(), ...(standings ? { results: standings } : {}) },
    });
  }
  cache.delete(communityId);
}

/**
 * La partida viva de la comunidad, o null. Nunca lanza: si Razzia o Mongo fallan, la llamada
 * sigue igual y el panel simplemente no aparece.
 */
export async function activeGame(communityId: string): Promise<LiveGame | null> {
  if (!quizEnabled()) return null;
  const now = Date.now();
  const hit = cache.get(communityId);
  if (hit && now - hit.at < CACHE_MS) return hit.game;
  try {
    const game = await db.communityQuizGame.findFirst({
      where: { communityId, status: "live" },
      orderBy: { createdAt: "desc" },
      select: { id: true, gameId: true, inviteCode: true, subject: true, createdAt: true, membersOnly: true },
    });
    let verifiedAt = hit?.verifiedAt ?? 0;
    if (game && isStale(game)) {
      await closeGames(communityId);
      return null;
    }
    if (game && now - verifiedAt > VERIFY_MS) {
      // Sólo un 404 la cierra: un tropiezo de red no saca a nadie de una partida en curso.
      const check = await razzia("/api/games/check", { body: { inviteCode: game.inviteCode } });
      if (check.status === 404) {
        await closeGames(communityId);
        return null;
      }
      verifiedAt = now;
    }
    cache.set(communityId, { at: now, verifiedAt, game });
    return game;
  } catch (e) {
    console.error("[club-quiz] no pude leer la partida:", e instanceof Error ? e.message : e);
    return null;
  }
}

export async function startGame(
  community: { id: string; slug: string; name: string; callSkin?: unknown },
  quizId: string,
  hostUserId: string,
  // Abierto (default): entra cualquiera con el PIN, dentro o fuera de una llamada, y los miembros
  // siguen entrando con su identidad. Sólo miembros: Razzia rechaza a quien llegue sin firma.
  opts: { membersOnly?: boolean } = {}
): Promise<{ ok: true; game: LiveGame; managerUrl: string } | { ok: false; error: string }> {
  if (!quizEnabled()) return { ok: false, error: "El quiz está apagado." };
  const quiz = await getQuiz(community.id, quizId);
  if (!quiz) return { ok: false, error: "Ese quiz ya no existe." };
  const membersOnly = !!opts.membersOnly && !!process.env.QUIZ_IDENTITY_SECRET;
  const { id: _id, ...content } = quiz;
  const brand = brandFor(community);
  const create = (branding: QuizBrand) =>
    razzia<{ gameId: string; inviteCode: string; hostToken?: string }>("/api/games", {
      service: true,
      body: { quizz: toRazziaQuiz(content), requireIdentity: membersOnly, tenant: community.id, branding },
    });
  let created = await create(brand);
  // Un skin que Razzia no acepte (400) no debe impedir jugar: se lanza con el tema de la casa.
  if (created.status === 400 && (brand.colors || brand.logo)) created = await create({ appName: brand.appName });
  if (!created.ok || !created.data?.hostToken) return { ok: false, error: "No pude crear la partida. Intenta de nuevo." };
  await closeGames(community.id); // una sola partida viva por comunidad
  const row = await db.communityQuizGame.create({
    data: {
      communityId: community.id,
      gameId: created.data.gameId,
      inviteCode: created.data.inviteCode,
      quizId,
      subject: quiz.subject,
      hostUserId,
      membersOnly,
      quiz: content,
    },
    select: { id: true, gameId: true, inviteCode: true, subject: true, createdAt: true, membersOnly: true },
  });
  cache.delete(community.id);
  return { ok: true, game: row, managerUrl: managerUrl(quizBase(), created.data.hostToken, {
      gameId: row.gameId,
      // Cerrada: el tablero enseña el QR hacia el club. Abierta: su tarjeta normal de PIN y QR.
      ...(membersOnly ? { join: joinUrl(community.slug) } : {}),
    }) };
}

export async function endGame(communityId: string) {
  await closeGames(communityId);
}

export async function listPastGames(communityId: string, take = 30) {
  return db.communityQuizGame.findMany({
    where: { communityId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, subject: true, status: true, createdAt: true, results: true, membersOnly: true },
  });
}
