import { describe, expect, it } from "vitest";
import { buildIcs, clockText, dueReminder, nextOccurrence, occurrencesOf, reminderEmail, reminderLead } from "../club-events.server";

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

// Jueves 12-nov-2026, 7:00 p.m. CDMX = 01:00Z del viernes (el hackatón que salió con «mañana»).
describe("recordatorios según lo que falta", () => {
  const s = new Date("2026-11-13T01:00:00Z");
  const before = (ms: number) => new Date(s.getTime() - ms);
  const H = 3600e3;
  const k = (x: string) => `${s.toISOString()}|${x}`;
  const club = { name: "Club", slug: "club" };
  const o = { id: "e1", title: "Hackatón", description: null, startsAt: s };

  it("la hora va en 12 h, zona CDMX", () => {
    expect(clockText(s)).toMatch(/^7:00\sp\.m\.$/);
    expect(clockText(new Date("2026-11-12T15:05:00Z"))).toMatch(/^9:05\sa\.m\.$/);
    expect(clockText(new Date("2026-11-12T18:30:00Z"))).toMatch(/^12:30\sp\.m\.$/);
  });

  it("creado a 8 h: un solo aviso que dice «hoy» con la hora, y después el de 1 h", () => {
    const now = before(8 * H + 21 * 60e3); // 10:39 a.m. del mismo jueves
    expect(dueReminder(s, [], now)).toBe("24h");
    const mail = reminderEmail(o, "24h", club, "Héctorbliss", now);
    expect(mail.subject).toMatch(/^Hoy a las 7:00\sp\.m\.: Hackatón$/);
    expect(mail.htmlBody).toMatch(/Héctorbliss, hoy hay llamada a las 7:00\sp\.m\./);
    expect(mail.htmlBody).toMatch(/jueves, 12 de noviembre, 7:00\sp\.m\. \(hora de CDMX\)/);
    expect(mail.htmlBody).not.toMatch(/mañana/i);
    expect(mail.htmlBody).not.toContain("19:00");
    // Ya salió el anticipado: nada hasta la última hora.
    expect(dueReminder(s, [k("24h")], before(3 * H))).toBeNull();
    expect(dueReminder(s, [k("24h")], before(55 * 60e3))).toBe("1h");
    expect(reminderLead(s, "1h", before(55 * 60e3)).heading).toBe("En una hora empezamos");
  });

  it("creado a 30 h: nada todavía; al entrar a las 24 h dice «mañana»", () => {
    expect(dueReminder(s, [], before(30 * H))).toBeNull();
    const now = before(24 * H - 5 * 60e3);
    expect(dueReminder(s, [], now)).toBe("24h");
    const mail = reminderEmail(o, "24h", club, null, now);
    expect(mail.subject).toBe("Mañana: Hackatón");
    expect(mail.htmlBody).toContain(">Mañana hay llamada</h1>");
  });

  it("creado a 90 min: sin aviso anticipado, sólo el de 1 h", () => {
    expect(dueReminder(s, [], before(90 * 60e3))).toBeNull();
    expect(dueReminder(s, [], before(60 * 60e3))).toBe("1h");
    expect(dueReminder(s, [k("1h")], before(50 * 60e3))).toBeNull();
  });

  it("creado a 20 min: el de 1 h dice los minutos reales", () => {
    const lead = reminderLead(s, "1h", before(20 * 60e3));
    expect(lead).toEqual({ heading: "En 20 minutos empezamos", subject: "En 20 minutos" });
  });

  it("madrugada: 1:00 a.m. avisado a las 8:00 p.m. del día anterior dice «mañana»", () => {
    const early = new Date("2026-11-13T07:00:00Z"); // viernes 1:00 a.m. CDMX
    const lead = reminderLead(early, "24h", new Date("2026-11-13T02:00:00Z")); // jueves 8:00 p.m.
    expect(lead.heading).toBe("Mañana hay llamada");
  });

  it("serie semanal: cada sesión lleva sus dos avisos, sin heredar las marcas de la anterior", () => {
    const series = { id: "e1", title: "Llamada", startsAt: s, endsAt: new Date(s.getTime() + 2 * H), recurrence: "weekly" };
    const sent = [k("24h"), k("1h")]; // lo de la primera semana
    // Terminó la primera sesión: la próxima es la del 19-nov, 7:00 p.m.
    const [next] = occurrencesOf(series, new Date(s.getTime() + 3 * H));
    expect(next.startsAt.toISOString()).toBe("2026-11-20T01:00:00.000Z");
    const at = (ms: number) => new Date(next.startsAt.getTime() - ms);
    expect(dueReminder(next.startsAt, sent, at(3 * 24 * H))).toBeNull();
    expect(dueReminder(next.startsAt, sent, at(23.9 * H))).toBe("24h");
    expect(reminderLead(next.startsAt, "24h", at(23.9 * H)).heading).toBe("Mañana hay llamada");
    const sent2 = [...sent, `${next.startsAt.toISOString()}|24h`];
    expect(dueReminder(next.startsAt, sent2, at(5 * H))).toBeNull();
    expect(dueReminder(next.startsAt, sent2, at(58 * 60e3))).toBe("1h");
  });
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
