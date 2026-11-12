import { describe, expect, it, vi } from "vitest";
vi.mock("~/.server/db", () => ({ db: {} }));
import crypto from "node:crypto";
import {
  boardUrl, brandFor, canHostQuiz, cleanHostEmails, isStale, joinUrl, managerUrl, parseQuiz, playerUrl, quizBase, quizEnabled, quizPlayerName,
  signIdentity, toRazziaQuiz, toStandings,
} from "../club-quiz.server";

const env = (v: Record<string, string>) => v as unknown as NodeJS.ProcessEnv;

describe("quiz del club", () => {
  it("apagado sin URL o sin llave del servicio: la llamada queda como estaba", () => {
    expect(quizEnabled(env({}))).toBe(false);
    expect(quizEnabled(env({ QUIZ_API_URL: "https://quiz.fixtergeek.com" }))).toBe(false);
    expect(quizEnabled(env({ QUIZ_SERVICE_KEY: "x" }))).toBe(false);
    expect(quizEnabled(env({ QUIZ_API_URL: "https://quiz.fixtergeek.com", QUIZ_SERVICE_KEY: "x" }))).toBe(true);
  });
  it("la base no lleva diagonal final", () => {
    expect(quizBase(env({ QUIZ_API_URL: " https://quiz.fixtergeek.com// " }))).toBe("https://quiz.fixtergeek.com");
  });
  it("el jugador lleva su nombre del club, recortado a 24", () => {
    expect(quizPlayerName({ email: "a@x.com", username: "ana", displayName: "Ana Pérez" })).toBe("Ana Pérez");
    expect(quizPlayerName({ email: "a@x.com", username: "ana", displayName: null })).toBe("ana");
    expect(quizPlayerName({ email: "carlos@x.com", username: "", displayName: "  " })).toBe("carlos");
    expect(quizPlayerName({ email: "a@x.com", username: "u", displayName: "x".repeat(40) })).toHaveLength(24);
  });
  it("el panel del jugador entra solo: pin, nombre, español y sin sonido", () => {
    const u = new URL(playerUrl("https://quiz.fixtergeek.com", "123456", { email: "a@x.com", username: "ana", displayName: "Ana & Pérez" }));
    expect(u.origin + u.pathname).toBe("https://quiz.fixtergeek.com/");
    expect(Object.fromEntries(u.searchParams)).toEqual({ pin: "123456", name: "Ana & Pérez", lng: "es", mute: "1" });
  });
  it("con secreto, el jugador lleva identidad firmada y atada al PIN", () => {
    const secret = "s".repeat(32);
    const now = new Date("2026-11-12T20:00:00Z");
    const token = signIdentity(secret, { userId: "u1", name: "Ana", inviteCode: "123456" }, now);
    const [part, signature] = token.split(".");
    expect(signature).toBe(crypto.createHmac("sha256", secret).update(part).digest("hex"));
    expect(JSON.parse(Buffer.from(part, "base64url").toString())).toEqual({ sub: "u1", name: "Ana", exp: now.getTime() / 1000 + 6 * 3600, pin: "123456" });
    const user = { id: "u1", email: "a@x.com", username: "ana", displayName: "Ana" };
    expect(new URL(playerUrl("https://q.io", "123456", user, secret)).searchParams.get("id")).toMatch(/^[\w-]+\.[0-9a-f]{64}$/);
    expect(new URL(playerUrl("https://q.io", "123456", user, "")).searchParams.has("id")).toBe(false);
  });
  it("el podio deja una fila por miembro y reordena los lugares", () => {
    expect(
      toStandings([
        { username: "Ana (cel)", points: 500, rank: 3, externalId: "u1" },
        { username: "Ana", points: 900, rank: 1, externalId: "u1" },
        { username: "Luis", points: 700, rank: 2, externalId: "u2" },
        { username: "Sin cuenta", points: 100, rank: 4 },
      ])
    ).toEqual([
      { userId: "u1", username: "Ana", points: 900, rank: 1 },
      { userId: "u2", username: "Luis", points: 700, rank: 2 },
      { userId: null, username: "Sin cuenta", points: 100, rank: 3 },
    ]);
  });
  it("el token del manager viaja en el hash, nunca en la query", () => {
    const u = new URL(managerUrl("https://quiz.fixtergeek.com", "tok.en", { gameId: "g-1" }));
    expect(u.pathname).toBe("/embed/manager");
    expect(u.search).toBe("?lng=es");
    expect(Object.fromEntries(new URLSearchParams(u.hash.slice(1)))).toEqual({ token: "tok.en", gameId: "g-1" });
  });
  it("reabrir el tablero no lleva token", () => {
    expect(boardUrl("https://quiz.fixtergeek.com", "g-1")).toBe("https://quiz.fixtergeek.com/party/manager/g-1");
  });
  it("una partida de más de 3 horas se da por terminada", () => {
    const now = new Date("2026-11-12T20:00:00Z");
    expect(isStale({ createdAt: new Date("2026-11-12T18:00:00Z") }, now)).toBe(false);
    expect(isStale({ createdAt: new Date("2026-11-12T16:59:00Z") }, now)).toBe(true);
  });
});

const question = { question: "¿Qué es un sandbox?", answers: ["Una caja de arena", "Una computadora aislada"], solution: 1, time: 20 };

describe("quizzes por comunidad", () => {
  it("acepta un quiz bien armado y lo convierte al formato de Razzia", () => {
    const r = parseQuiz({ subject: "  Calentamiento ", questions: [question] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.quiz.subject).toBe("Calentamiento");
    expect(toRazziaQuiz(r.quiz)).toEqual({
      gameMode: "quiz",
      subject: "Calentamiento",
      questions: [{ type: "single", question: question.question, answers: question.answers, solutions: [1], cooldown: 5, time: 20 }],
    });
  });
  it("dice en qué pregunta está el error", () => {
    expect(parseQuiz({ subject: "x", questions: [question, { ...question, answers: ["sólo una"] }] })).toEqual({ ok: false, error: "Pregunta 2: Pon al menos dos respuestas." });
    expect(parseQuiz({ subject: "x", questions: [{ ...question, solution: 2 }] })).toEqual({ ok: false, error: "Pregunta 1: Marca cuál respuesta es la correcta." });
    expect(parseQuiz({ subject: "", questions: [question] })).toEqual({ ok: false, error: "Ponle nombre al quiz." });
    expect(parseQuiz({ subject: "x", questions: [] })).toEqual({ ok: false, error: "Agrega al menos una pregunta." });
    expect(parseQuiz(null).ok).toBe(false);
  });
  it("la imagen de una pregunta sólo puede ser https", () => {
    expect(parseQuiz({ subject: "x", questions: [{ ...question, image: "http://a.com/i.png" }] }).ok).toBe(false);
    const ok = parseQuiz({ subject: "x", questions: [{ ...question, image: "https://a.com/i.png" }] });
    expect(ok.ok && toRazziaQuiz(ok.quiz).questions[0].media).toEqual({ type: "image", url: "https://a.com/i.png" });
  });
  it("lanza el dueño, un ADMIN o un coanfitrión de ESA comunidad; nadie más", () => {
    const club = { ownerId: "owner", quizHostEmails: ["ana@club.mx"] };
    expect(canHostQuiz({ id: "owner", email: "o@x.mx" }, club)).toBe(true);
    expect(canHostQuiz({ id: "u1", email: "a@x.mx", role: "ADMIN" }, club)).toBe(true);
    expect(canHostQuiz({ id: "u2", email: " Ana@Club.mx " }, club)).toBe(true);
    expect(canHostQuiz({ id: "u3", email: "luis@club.mx" }, club)).toBe(false);
    // Coanfitrión de un club no lo es del de junto.
    expect(canHostQuiz({ id: "u2", email: "ana@club.mx" }, { ownerId: "otro", quizHostEmails: [] })).toBe(false);
    expect(canHostQuiz(null, club)).toBe(false);
  });
  it("limpia la lista de coanfitriones", () => {
    expect(cleanHostEmails([" Ana@Club.mx", "ana@club.mx", "no-es-correo", ""])).toEqual(["ana@club.mx"]);
  });
  it("la marca sale del skin de la sala; sin skin, sólo el nombre", () => {
    expect(brandFor({ name: "Club de Agentes", callSkin: null })).toEqual({ appName: "Club de Agentes" });
    expect(
      brandFor({
        name: "Taller Barro",
        callSkin: { colors: { bg: "#FBF7F2", accent: "#E8743B", ink: "url(x)", danger: "#B93A2B" }, logoUrl: "https://barro.mx/logo.png" },
      })
    ).toEqual({ appName: "Taller Barro", colors: { background: "#FBF7F2", primary: "#E8743B" }, logo: "https://barro.mx/logo.png" });
    expect(brandFor({ name: "X", callSkin: { logoUrl: "javascript:alert(1)" } })).toEqual({ appName: "X" });
  });
  it("el QR de una partida cerrada lleva al club en la plataforma", () => {
    expect(joinUrl("taller-barro")).toBe("https://www.fixtergeek.com/comunidad/taller-barro/quiz?play=1");
  });
});
