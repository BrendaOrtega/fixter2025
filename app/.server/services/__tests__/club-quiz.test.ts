import { describe, expect, it, vi } from "vitest";
vi.mock("~/.server/db", () => ({ db: {} }));
import { boardUrl, isStale, managerUrl, playerUrl, quizBase, quizEnabled, quizPlayerName } from "../club-quiz.server";

const env = (v: Record<string, string>) => v as unknown as NodeJS.ProcessEnv;

describe("quiz del club", () => {
  it("apagado sin URL o sin contraseña: la llamada queda como estaba", () => {
    expect(quizEnabled(env({}))).toBe(false);
    expect(quizEnabled(env({ QUIZ_API_URL: "https://quiz.fixtergeek.com" }))).toBe(false);
    expect(quizEnabled(env({ QUIZ_MANAGER_PASSWORD: "x" }))).toBe(false);
    expect(quizEnabled(env({ QUIZ_API_URL: "https://quiz.fixtergeek.com", QUIZ_MANAGER_PASSWORD: "x" }))).toBe(true);
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
  it("el token del manager viaja en el hash, nunca en la query", () => {
    const u = new URL(managerUrl("https://quiz.fixtergeek.com", "tok.en", { gameId: "g-1" }));
    expect(u.pathname).toBe("/embed/manager");
    expect(u.search).toBe("?lng=es");
    expect(Object.fromEntries(new URLSearchParams(u.hash.slice(1)))).toEqual({ token: "tok.en", gameId: "g-1" });
    expect(new URL(managerUrl("https://q.io", "t", { to: "quizz" })).hash).toBe("#token=t&to=quizz");
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
