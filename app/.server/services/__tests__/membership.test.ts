import { describe, expect, it } from "vitest";
import { isMembershipActive, toMembershipStatus } from "../membership.server";

describe("toMembershipStatus", () => {
  it("activa y en prueba dan acceso", () => {
    expect(toMembershipStatus("active")).toBe("active");
    expect(toMembershipStatus("trialing")).toBe("active");
  });
  it("cobro fallido conserva el acceso mientras Stripe reintenta", () => {
    expect(toMembershipStatus("past_due")).toBe("past_due");
  });
  it("todo lo demás corta", () => {
    for (const s of ["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"] as const) {
      expect(toMembershipStatus(s)).toBe("canceled");
    }
  });
});

describe("isMembershipActive", () => {
  const now = new Date("2026-11-10T12:00:00Z");
  const later = new Date("2026-12-10T12:00:00Z");
  const before = new Date("2026-11-01T12:00:00Z");
  it("sin fila no hay acceso", () => expect(isMembershipActive(null, now)).toBe(false));
  it("activa y vigente", () =>
    expect(isMembershipActive({ status: "active", currentPeriodEnd: later }, now)).toBe(true));
  it("activa pero vencida (webhook perdido) no da acceso", () =>
    expect(isMembershipActive({ status: "active", currentPeriodEnd: before }, now)).toBe(false));
  it("regalo sin fecha no caduca", () =>
    expect(isMembershipActive({ status: "active", currentPeriodEnd: null }, now)).toBe(true));
  it("past_due vigente conserva acceso", () =>
    expect(isMembershipActive({ status: "past_due", currentPeriodEnd: later }, now)).toBe(true));
  it("cancelada no da acceso", () =>
    expect(isMembershipActive({ status: "canceled", currentPeriodEnd: later }, now)).toBe(false));
});
