import { describe, expect, it, vi } from "vitest";
vi.mock("~/.server/db", () => ({ db: {} }));
import { badgesFor, FOUNDERS_UNTIL, THRESHOLDS } from "../badges.server";

const base: import("../badges.server").MemberStats = {
  posts: 0,
  comments: 0,
  likesReceived: 0,
  joinedAt: null,
  isStudentGift: false,
  isHost: false,
};
const keys = (s: Partial<typeof base>) =>
  badgesFor({ ...base, ...s }).map((b) => b.key);

describe("badgesFor", () => {
  it("un miembro sin actividad y fuera del primer mes no tiene insignias", () => {
    expect(keys({ joinedAt: new Date(FOUNDERS_UNTIL.getTime() + 1) })).toEqual([]);
  });
  it("entrar en el primer mes da Fundador", () => {
    expect(keys({ joinedAt: new Date("2026-11-10T20:00:00Z") })).toEqual(["founder"]);
  });
  it("el regalo de estudiante da Estudiante", () => {
    expect(keys({ isStudentGift: true })).toEqual(["student"]);
  });
  it("una publicación basta para Primera publicación", () => {
    expect(keys({ posts: 1 })).toEqual(["first-post"]);
  });
  it("Conversador y Ayudador piden su umbral completo", () => {
    expect(keys({ comments: THRESHOLDS.comments - 1, likesReceived: THRESHOLDS.likes - 1 })).toEqual([]);
    expect(keys({ comments: THRESHOLDS.comments, likesReceived: THRESHOLDS.likes })).toEqual([
      "talker",
      "helper",
    ]);
  });
  it("Anfitrión va primero", () => {
    expect(keys({ isHost: true, posts: 3 })[0]).toBe("host");
  });
});
