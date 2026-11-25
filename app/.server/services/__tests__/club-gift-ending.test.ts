import { describe, expect, it, vi } from "vitest";

vi.mock("~/.server/db", () => ({ db: {} }));
vi.mock("~/utils/sesTransport", () => ({ sendSesEmailDirect: async () => undefined }));

import { giftEndingEmail, giftEndingWindow, isGiftEnding } from "../club-gift-ending.server";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-11-25T16:00:00Z");
const grant = (days: number | null, extra: Partial<{ provider: string; status: string }> = {}) => ({
  provider: "grant",
  status: "active",
  currentPeriodEnd: days === null ? null : new Date(now.getTime() + days * DAY),
  ...extra,
});

describe("isGiftEnding: regalos que vencen en 10 días", () => {
  it("entra el regalo que vence entre 9 y 10 días", () => {
    expect(isGiftEnding(grant(9.5), now)).toBe(true);
    expect(isGiftEnding(grant(9), now)).toBe(true);
  });
  it("la ventana es de un día: ni antes ni después", () => {
    expect(isGiftEnding(grant(10), now)).toBe(false);
    expect(isGiftEnding(grant(8.9), now)).toBe(false);
    expect(isGiftEnding(grant(30), now)).toBe(false);
  });
  it("un regalo sin fecha no caduca y no recibe aviso", () => expect(isGiftEnding(grant(null), now)).toBe(false));
  it("una suscripción pagada no es regalo", () =>
    expect(isGiftEnding(grant(9.5, { provider: "stripe" }), now)).toBe(false));
  it("un regalo cancelado no recibe aviso", () =>
    expect(isGiftEnding(grant(9.5, { status: "canceled" }), now)).toBe(false));
  it("dos corridas diarias seguidas no toman la misma membresía", () => {
    const m = grant(9.5);
    const tomorrow = new Date(now.getTime() + DAY);
    expect(isGiftEnding(m, now)).toBe(true);
    expect(isGiftEnding(m, tomorrow)).toBe(false);
  });
  it("la ventana va de ahora+9 d a ahora+10 d", () => {
    const { from, to } = giftEndingWindow(now);
    expect(to.getTime() - from.getTime()).toBe(DAY);
    expect(from.getTime() - now.getTime()).toBe(9 * DAY);
  });
});

describe("giftEndingEmail", () => {
  const community = { slug: "club-de-agentes", name: "Club de Agentes de IA", priceMxn: 99, priceAnnualMxn: 990 };
  it("liga al checkout mensual y anual con los precios del club", () => {
    const { htmlBody } = giftEndingEmail({ name: "Ana", endsAt: new Date("2026-12-05T18:00:00Z"), community });
    expect(htmlBody).toContain("/comunidad/club-de-agentes?unirse=month");
    expect(htmlBody).toContain("/comunidad/club-de-agentes?unirse=year");
    expect(htmlBody).toContain("$99 MXN");
    expect(htmlBody).toContain("$990 MXN");
    expect(htmlBody).toContain("TUS MESES GRATIS VENCEN EL 5 DE DICIEMBRE DE 2026");
  });
  it("sin precio anual no ofrece el año", () => {
    const { htmlBody } = giftEndingEmail({ name: null, endsAt: new Date(), community: { ...community, priceAnnualMxn: null } });
    expect(htmlBody).not.toContain("unirse=year");
  });
});
