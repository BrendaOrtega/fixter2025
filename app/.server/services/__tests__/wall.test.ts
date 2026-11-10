import { describe, expect, it } from "vitest";
import {
  canModerate,
  canParticipate,
  cleanBody,
  isCallOpen,
  isOwnImageKey,
  underLimit,
} from "../wall.server";

const owner = "aaaaaaaaaaaaaaaaaaaaaaaa";
const member = "bbbbbbbbbbbbbbbbbbbbbbbb";
const community = { ownerId: owner };
const now = new Date("2026-11-10T18:00:00Z");
const later = new Date("2026-12-10T00:00:00Z");

describe("canModerate", () => {
  it("dueño y ADMIN moderan", () => {
    expect(canModerate({ id: owner }, community)).toBe(true);
    expect(canModerate({ id: member, role: "ADMIN" }, community)).toBe(true);
  });
  it("un miembro cualquiera no", () => expect(canModerate({ id: member }, community)).toBe(false));
  it("sin sesión no", () => expect(canModerate(null, community)).toBe(false));
});

describe("canParticipate", () => {
  it("miembro vigente publica", () =>
    expect(canParticipate({ id: member }, { status: "active", currentPeriodEnd: later }, community, now)).toBe(true));
  it("membresía cancelada no", () =>
    expect(canParticipate({ id: member }, { status: "canceled", currentPeriodEnd: later }, community, now)).toBe(false));
  it("el dueño publica aunque no tenga membresía", () =>
    expect(canParticipate({ id: owner }, null, community, now)).toBe(true));
  it("sin sesión no", () => expect(canParticipate(null, null, community, now)).toBe(false));
});

describe("underLimit", () => {
  it("10 publicaciones por hora", () => {
    expect(underLimit("post", 9)).toBe(true);
    expect(underLimit("post", 10)).toBe(false);
  });
  it("60 comentarios por hora", () => expect(underLimit("comment", 60)).toBe(false));
});

describe("cleanBody", () => {
  it("recorta y normaliza saltos", () => expect(cleanBody("  hola\r\nmundo  ", 100)).toBe("hola\nmundo"));
  it("vacío o muy largo no sirve", () => {
    expect(cleanBody("   ", 100)).toBeNull();
    expect(cleanBody("x".repeat(101), 100)).toBeNull();
  });
});

describe("isOwnImageKey", () => {
  it("acepta la llave propia", () =>
    expect(isOwnImageKey(`wall/${member}/1731250000000-foto.png`, member)).toBe(true));
  it("rechaza la de otro autor", () =>
    expect(isOwnImageKey(`wall/${owner}/1731250000000-foto.png`, member)).toBe(false));
  it("rechaza rutas raras", () => {
    expect(isOwnImageKey(`wall/${member}/../x`, member)).toBe(false);
    expect(isOwnImageKey(`email-content/${member}/1-x.png`, member)).toBe(false);
  });
});

describe("isCallOpen", () => {
  const ev = { startsAt: new Date("2026-11-11T01:00:00Z"), endsAt: new Date("2026-11-11T02:30:00Z") };
  it("abre 15 minutos antes", () => {
    expect(isCallOpen(ev, new Date("2026-11-11T00:44:00Z"))).toBe(false);
    expect(isCallOpen(ev, new Date("2026-11-11T00:45:00Z"))).toBe(true);
  });
  it("cierra al terminar", () => expect(isCallOpen(ev, new Date("2026-11-11T02:30:00Z"))).toBe(false));
  it("sin evento, cerrada", () => expect(isCallOpen(null, now)).toBe(false));
});
