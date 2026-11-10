import { describe, expect, it, vi } from "vitest";
vi.mock("~/.server/db", () => ({ db: {} }));
import { cdmxDay, giftUntil, isCallGuestToday, parseEmails } from "../club-invites.server";

describe("invitados del club", () => {
  const now = new Date("2026-11-11T01:30:00Z"); // 10-nov 19:30 en CDMX
  it("el día va en hora de CDMX", () => {
    expect(cdmxDay(now)).toBe("20261110");
  });
  it("pase a la llamada sólo el día invitado", () => {
    expect(isCallGuestToday({ callDays: ["20261110"] }, now)).toBe(true);
    expect(isCallGuestToday({ callDays: ["20261117"] }, now)).toBe(false);
    expect(isCallGuestToday(null, now)).toBe(false);
  });
  it("el regalo no acorta uno más largo", () => {
    const later = new Date("2027-06-01T00:00:00Z");
    expect(giftUntil(later, 90, now)).toBe(later);
    expect(giftUntil(null, 90, now).getTime()).toBe(now.getTime() + 90 * 86_400_000);
  });
});

describe("parseEmails", () => {
  it("separa por comas, espacios y renglones; minúsculas y sin repetir", () => {
    expect(parseEmails("A@x.com, b@y.mx\nA@X.com; nope  c@z.io")).toEqual(["a@x.com", "b@y.mx", "c@z.io"]);
  });
});
