import { beforeEach, describe, expect, it, vi } from "vitest";

// Base de datos falsa: sólo lo que consultan `isClubMember` y `priceFor`.
const fake = vi.hoisted(() => ({
  community: null as { id: string } | null,
  membership: null as { status: string; currentPeriodEnd: Date | null } | null,
  product: null as { priceMxn: number | null; active: boolean } | null,
}));
vi.mock("~/.server/db", () => ({
  db: {
    community: { findFirst: async () => fake.community },
    membership: { findUnique: async () => fake.membership },
    product: { findUnique: async () => fake.product },
  },
}));

import {
  ANTI_FACTORY_TIERS,
  isAntiFactoryType,
  isClubMember,
  pickAntiFactoryTier,
  priceFor,
} from "../anti-factory.server";

beforeEach(() => {
  fake.community = { id: "club" };
  fake.membership = null;
  fake.product = null;
});

describe("pickAntiFactoryTier", () => {
  it("un miembro paga con la llave del club", () =>
    expect(pickAntiFactoryTier(true).key).toBe("anti-factory-taller-dic26-club"));
  it("quien no es miembro paga con la llave general", () =>
    expect(pickAntiFactoryTier(false).key).toBe("anti-factory-taller-dic26"));
});

describe("isClubMember", () => {
  it("sin sesión no hay precio de miembro", async () => expect(await isClubMember(null)).toBe(false));
  it("sin membresía no hay precio de miembro", async () =>
    expect(await isClubMember({ id: "u1" })).toBe(false));
  it("con membresía vigente sí hay precio de miembro", async () => {
    fake.membership = { status: "active", currentPeriodEnd: new Date(Date.now() + 86_400_000) };
    expect(await isClubMember({ id: "u1" })).toBe(true);
  });
  it("con membresía cancelada no hay precio de miembro", async () => {
    fake.membership = { status: "canceled", currentPeriodEnd: null };
    expect(await isClubMember({ id: "u1" })).toBe(false);
  });
  it("si el club no existe nadie tiene precio de miembro", async () => {
    fake.community = null;
    fake.membership = { status: "active", currentPeriodEnd: null };
    expect(await isClubMember({ id: "u1" })).toBe(false);
  });
});

describe("priceFor", () => {
  it("sin Product cobra el precio de respaldo", async () => {
    expect(await priceFor(ANTI_FACTORY_TIERS.general)).toBe(1990);
    expect(await priceFor(ANTI_FACTORY_TIERS.club)).toBe(1490);
  });
  it("con Product activo cobra su precio", async () => {
    fake.product = { priceMxn: 1790, active: true };
    expect(await priceFor(ANTI_FACTORY_TIERS.general)).toBe(1790);
  });
  it("un Product inactivo no cambia el precio", async () => {
    fake.product = { priceMxn: 10, active: false };
    expect(await priceFor(ANTI_FACTORY_TIERS.club)).toBe(1490);
  });
});

describe("isAntiFactoryType", () => {
  it("reconoce las dos llaves y nada más", () => {
    expect(isAntiFactoryType("anti-factory-taller-dic26")).toBe(true);
    expect(isAntiFactoryType("anti-factory-taller-dic26-club")).toBe(true);
    expect(isAntiFactoryType("sistemas-agenticos-workshop")).toBe(false);
    expect(isAntiFactoryType(undefined)).toBe(false);
  });
});

describe("pase a la llamada", () => {
  it("los días del pase son los días CDMX de cada sesión", async () => {
    const { cdmxDay } = await import("../club-invites.server");
    const { ANTI_FACTORY_CALL_DAYS, ANTI_FACTORY_SESSIONS } = await import("../anti-factory.server");
    expect(ANTI_FACTORY_SESSIONS.map((s) => cdmxDay(s.startsAt))).toEqual(ANTI_FACTORY_CALL_DAYS);
    expect(ANTI_FACTORY_SESSIONS.map((s) => cdmxDay(new Date(s.endsAt.getTime() - 1)))).toEqual(ANTI_FACTORY_CALL_DAYS);
  });
});
