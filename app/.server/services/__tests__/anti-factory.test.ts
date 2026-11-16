import { beforeEach, describe, expect, it, vi } from "vitest";

// Base de datos falsa: sólo lo que consultan `isClubMember` y `priceFor`.
const fake = vi.hoisted(() => ({
  community: null as { id: string } | null,
  membership: null as { status: string; currentPeriodEnd: Date | null } | null,
  product: null as { priceMxn: number | null; active: boolean } | null,
  /** Correos con compra pagada del taller. */
  buyers: [] as string[],
}));
vi.mock("~/.server/db", () => ({
  db: {
    community: { findFirst: async () => fake.community },
    membership: { findUnique: async () => fake.membership },
    product: { findUnique: async () => fake.product },
    purchaseEvent: {
      findFirst: async ({ where }: { where: { email: { equals: string } } }) =>
        fake.buyers.includes(where.email.equals.toLowerCase()) ? { id: "p1" } : null,
    },
  },
}));

import {
  ANTI_FACTORY_TIERS,
  antiFactoryCallGate,
  isAntiFactoryType,
  isClubMember,
  pickAntiFactoryTier,
  priceFor,
} from "../anti-factory.server";

beforeEach(() => {
  fake.community = { id: "club" };
  fake.membership = null;
  fake.product = null;
  fake.buyers = [];
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

describe("candado de la llamada en sesiones de paga", () => {
  const taller1 = { startsAt: new Date("2026-12-02T01:00:00Z") }; // martes 1-dic, 19:00 CDMX
  const taller2 = { startsAt: new Date("2026-12-04T01:00:00Z") };
  const webinar = { startsAt: new Date("2026-11-19T01:00:00Z") }; // webinar gratis 18-nov
  const normal = { startsAt: new Date("2026-11-24T01:00:00Z") }; // llamada normal del club
  const member = { email: "ana@club.mx", isMember: true, exempt: false };
  const outsider = { email: "Beto@Mail.mx", isMember: false, exempt: false };

  it("un miembro sin compra queda fuera con el aviso de su precio", async () => {
    const gate = await antiFactoryCallGate(taller1, member);
    expect(gate?.url).toBe("/anti-factory");
    expect(gate?.message).toBe("Esta sesión es del taller de paga; como miembro la tienes en $1,490.");
  });
  it("un miembro con compra entra", async () => {
    fake.buyers = ["ana@club.mx"];
    expect(await antiFactoryCallGate(taller1, member)).toBeNull();
    expect(await antiFactoryCallGate(taller2, member)).toBeNull();
  });
  it("un no miembro con compra entra, sin importar mayúsculas del correo", async () => {
    fake.buyers = ["beto@mail.mx"];
    expect(await antiFactoryCallGate(taller2, outsider)).toBeNull();
  });
  it("un no miembro sin compra queda fuera", async () => {
    expect(await antiFactoryCallGate(taller2, outsider)).not.toBeNull();
  });
  it("el webinar gratis y una llamada normal no cambian", async () => {
    expect(await antiFactoryCallGate(webinar, member)).toBeNull();
    expect(await antiFactoryCallGate(normal, outsider)).toBeNull();
  });
  it("el anfitrión entra siempre", async () => {
    expect(await antiFactoryCallGate(taller1, { ...member, exempt: true })).toBeNull();
  });
});
