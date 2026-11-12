// Quiz en vivo del club (12-nov-2026), junto a la llamada.
//
// El quiz corre en un servicio aparte: Razzia (MIT), fork en `blissito/razzia`, en su propia
// caja. Aquí FixterGeek manda: crea la partida por la API de Razzia con una sesión de manager,
// guarda el PIN en Mongo y se lo entrega a cada miembro ya dentro de la URL de su panel. Nadie
// teclea PIN ni contraseña.
//
// El tablero (preguntas, ranking, podio) sólo existe en la pantalla del manager: el anfitrión la
// abre en otra ventana y la comparte en la llamada. Esa ventana además mantiene viva la partida:
// Razzia borra a los 5 min una partida sin manager conectado.
//
// Interruptor de apagado: sin QUIZ_API_URL o sin QUIZ_MANAGER_PASSWORD todo contesta «apagado» y
// la página de la llamada queda exactamente como estaba.
//
// Env:
//   QUIZ_API_URL           https://quiz.fixtergeek.com (sin diagonal final)
//   QUIZ_MANAGER_PASSWORD  la MANAGER_PASSWORD de la caja de Razzia; nunca sale del servidor
import { db } from "~/.server/db";

const TIMEOUT_MS = 4000;
const CACHE_MS = 3000; // el sondeo de cada miembro cae aquí, no en Mongo
const VERIFY_MS = 15_000; // cada cuánto se le pregunta a Razzia si la partida sigue viva
const MAX_GAME_MS = 3 * 3600_000; // una partida «viva» más vieja que esto se da por terminada
export const QUIZ_NAME_MAX = 24; // tope de Razzia para el nombre del jugador

type QuizUser = { email: string; displayName?: string | null; username: string };
export type LiveGame = { id: string; gameId: string; inviteCode: string; subject: string; createdAt: Date };

export function quizBase(env: NodeJS.ProcessEnv = process.env): string {
  return (env.QUIZ_API_URL || "").trim().replace(/\/+$/, "");
}

export function quizEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!quizBase(env) && !!env.QUIZ_MANAGER_PASSWORD;
}

// ── Reglas puras (probadas en __tests__/club-quiz.test.ts) ───────────────────

/** El mismo nombre que lleva en la llamada, recortado al tope de Razzia. */
export function quizPlayerName(user: QuizUser): string {
  // Un displayName de puros espacios cuenta como vacío.
  const name = [user.displayName, user.username, user.email.split("@")[0]].map((v) => (v ?? "").trim()).find(Boolean);
  return (name ?? "Invitado").slice(0, QUIZ_NAME_MAX);
}

/** URL del panel del jugador: entra solo, en español y sin sonido (el tablero ya suena en la llamada). */
export function playerUrl(base: string, inviteCode: string, user: QuizUser): string {
  const q = new URLSearchParams({ pin: inviteCode, name: quizPlayerName(user), lng: "es", mute: "1" });
  return `${base}/?${q}`;
}

/** El token viaja en el hash: no llega a logs del servidor ni a cabeceras Referer. */
export function managerUrl(base: string, token: string, target: { gameId: string } | { to: "quizz" }): string {
  const h = new URLSearchParams({ token, ...target });
  return `${base}/embed/manager?lng=es#${h}`;
}

/** Reabrir el tablero en el mismo navegador: la sesión de manager ya vive ahí, no viaja de nuevo. */
export function boardUrl(base: string, gameId: string): string {
  return `${base}/party/manager/${encodeURIComponent(gameId)}`;
}

export function isStale(game: { createdAt: Date }, now = new Date()): boolean {
  return now.getTime() - game.createdAt.getTime() > MAX_GAME_MS;
}

// ── Razzia por HTTP ──────────────────────────────────────────────────────────

type Reply<T> = { ok: boolean; status: number; data: T | null };

async function razzia<T>(path: string, init: { method?: string; token?: string; body?: unknown } = {}): Promise<Reply<T>> {
  try {
    const res = await fetch(`${quizBase()}${path}`, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: {
        ...(init.body === undefined ? {} : { "content-type": "application/json" }),
        ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
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

/** Sesión nueva subida a manager. Cada partida estrena la suya: quien la crea es su único manager. */
async function managerToken(): Promise<string | null> {
  const session = await razzia<{ token: string }>("/api/auth/session", { body: {} });
  if (!session.data?.token) return null;
  const manager = await razzia<{ token: string }>("/api/auth/manager", {
    token: session.data.token,
    body: { password: process.env.QUIZ_MANAGER_PASSWORD },
  });
  return manager.ok && manager.data?.token ? manager.data.token : null;
}

export async function listQuizzes(): Promise<Array<{ id: string; subject: string }> | null> {
  if (!quizEnabled()) return null;
  const token = await managerToken();
  if (!token) return null;
  const r = await razzia<{ quizz: Array<{ id: string; subject: string }> }>("/api/quizz", { token });
  return r.ok && r.data ? r.data.quizz : null;
}

/** URL del editor de quizzes de Razzia con sesión de manager, o null si Razzia no contesta. */
export async function editorUrl(): Promise<string | null> {
  if (!quizEnabled()) return null;
  const token = await managerToken();
  return token ? managerUrl(quizBase(), token, { to: "quizz" }) : null;
}

// ── Partida en curso ─────────────────────────────────────────────────────────

const cache = new Map<string, { at: number; verifiedAt: number; game: LiveGame | null }>();

async function closeGames(communityId: string) {
  await db.communityQuizGame.updateMany({
    where: { communityId, status: "live" },
    data: { status: "ended", endedAt: new Date() },
  });
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
      select: { id: true, gameId: true, inviteCode: true, subject: true, createdAt: true },
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
  community: { id: string },
  quizId: string,
  hostUserId: string
): Promise<{ ok: true; game: LiveGame; managerUrl: string } | { ok: false; error: string }> {
  if (!quizEnabled()) return { ok: false, error: "El quiz está apagado." };
  const token = await managerToken();
  if (!token) return { ok: false, error: "El servidor de quizzes no contestó. Intenta de nuevo." };
  const quizzes = await razzia<{ quizz: Array<{ id: string; subject: string }> }>("/api/quizz", { token });
  const quiz = quizzes.data?.quizz.find((q) => q.id === quizId);
  if (!quiz) return { ok: false, error: "Ese quiz ya no existe." };
  const created = await razzia<{ gameId: string; inviteCode: string }>("/api/games", { token, body: { quizzId: quizId } });
  if (!created.ok || !created.data) return { ok: false, error: "No pude crear la partida. Intenta de nuevo." };
  await closeGames(community.id); // una sola partida viva por comunidad
  const row = await db.communityQuizGame.create({
    data: {
      communityId: community.id,
      gameId: created.data.gameId,
      inviteCode: created.data.inviteCode,
      quizId,
      subject: quiz.subject,
      hostUserId,
    },
    select: { id: true, gameId: true, inviteCode: true, subject: true, createdAt: true },
  });
  cache.delete(community.id);
  return { ok: true, game: row, managerUrl: managerUrl(quizBase(), token, { gameId: row.gameId }) };
}

export async function endGame(communityId: string) {
  await closeGames(communityId);
}

export async function listPastGames(communityId: string, take = 30) {
  return db.communityQuizGame.findMany({
    where: { communityId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, subject: true, status: true, createdAt: true },
  });
}
