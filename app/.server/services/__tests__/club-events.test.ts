import { describe, expect, it } from "vitest";
import { buildIcs, dueReminder, nextOccurrence, occurrencesOf } from "../club-events.server";

// Martes 10-nov-2026, 19:00 CDMX = 01:00Z del miércoles.
const start = new Date("2026-11-11T01:00:00Z");
const end = new Date("2026-11-11T03:00:00Z");
const weekly = { id: "e1", title: "Llamada", startsAt: start, endsAt: end, recurrence: "weekly" };

describe("occurrencesOf", () => {
  it("evento sencillo: sale mientras no termina", () => {
    const once = { ...weekly, recurrence: null };
    expect(occurrencesOf(once, new Date("2026-11-11T02:00:00Z"))).toHaveLength(1);
    expect(occurrencesOf(once, end)).toHaveLength(0);
  });
  it("serie: la sesión en curso sigue siendo la próxima", () => {
    const [o] = occurrencesOf(weekly, new Date("2026-11-11T02:30:00Z"));
    expect(o.startsAt.toISOString()).toBe(start.toISOString());
  });
  it("serie: al terminar salta a la semana siguiente, misma hora", () => {
    const [o] = occurrencesOf(weekly, new Date("2026-11-11T03:00:00Z"));
    expect(o.startsAt.toISOString()).toBe("2026-11-18T01:00:00.000Z");
    expect(o.endsAt.toISOString()).toBe("2026-11-18T03:00:00.000Z");
  });
  it("serie: varias sesiones y corta en `until`", () => {
    const until = new Date("2026-11-25T01:00:00Z");
    const list = occurrencesOf({ ...weekly, until }, new Date("2026-11-01T00:00:00Z"), 10);
    expect(list.map((o) => o.startsAt.toISOString().slice(0, 10))).toEqual(["2026-11-11", "2026-11-18", "2026-11-25"]);
  });
  it("serie vencida: nada", () => {
    expect(occurrencesOf({ ...weekly, until: start }, new Date("2026-12-01T00:00:00Z"))).toHaveLength(0);
  });
});

describe("nextOccurrence", () => {
  it("la más cercana entre varios eventos", () => {
    const once = { id: "e2", title: "Taller", startsAt: new Date("2026-11-13T01:00:00Z"), endsAt: new Date("2026-11-13T02:00:00Z") };
    const now = new Date("2026-11-12T00:00:00Z");
    expect(nextOccurrence([weekly, once], now)?.id).toBe("e2");
    expect(nextOccurrence([], now)).toBeNull();
  });
});

describe("dueReminder", () => {
  const s = start;
  const k = (x: string) => `${s.toISOString()}|${x}`;
  it("25 h antes, nada", () => expect(dueReminder(s, [], new Date(s.getTime() - 25 * 3600e3))).toBeNull());
  it("23 h antes, el de 24 h", () => expect(dueReminder(s, [], new Date(s.getTime() - 23 * 3600e3))).toBe("24h"));
  it("no repite el de 24 h", () => expect(dueReminder(s, [k("24h")], new Date(s.getTime() - 23 * 3600e3))).toBeNull());
  it("50 min antes, el de 1 h aunque no saliera el de 24 h", () =>
    expect(dueReminder(s, [], new Date(s.getTime() - 50 * 60e3))).toBe("1h"));
  it("no repite el de 1 h", () => expect(dueReminder(s, [k("1h")], new Date(s.getTime() - 50 * 60e3))).toBeNull());
  it("ya empezó, nada", () => expect(dueReminder(s, [], s)).toBeNull());
});

describe("buildIcs", () => {
  it("serie semanal con RRULE y texto escapado", () => {
    const ics = buildIcs({ ...weekly, title: "Agentes, en vivo; 1", until: new Date("2026-12-31T06:00:00Z") }, "https://x.com/c");
    expect(ics).toContain("DTSTART:20261111T010000Z");
    expect(ics).toContain("RRULE:FREQ=WEEKLY;UNTIL=20261231T060000Z");
    expect(ics).toContain(String.raw`SUMMARY:Agentes\, en vivo\; 1`);
    expect(ics.split("\r\n").length).toBeGreaterThan(10);
  });
  it("evento sencillo sin RRULE", () => {
    expect(buildIcs({ ...weekly, recurrence: null }, "https://x.com/c")).not.toContain("RRULE");
  });
});
