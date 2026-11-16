import { beforeEach, describe, expect, it, vi } from "vitest";

// Base de datos falsa: sólo lo que consultan `isClubMember` y `priceFor`.
const fake = vi.hoisted(() => ({
  community: null as { id: string } | null,
  membership: null as { status: string; currentPeriodEnd: Date | null } | null,
  product: null as { priceMxn: number | null; active: boolean } | null,
  /** Correos con compra pagada del taller. */
  buyers: [] as string[],
  /** Filas de PurchaseEvent por sesión de Stripe. */
  purchases: {} as Record<string, { email: string; productKey: string | null; status: string; note?: string | null }>,
  /** Invitaciones del club por correo. */
  invites: {} as Record<string, { id: string; callDays: string[] }>,
  mails: [] as string[],
  /** Correos en la lista de espera de software-factory. */
  waitlist: [] as string[],
}));
vi.mock("~/mailSenders/sendAntiFactoryConfirmation", () => ({
  sendAntiFactoryConfirmation: async ({ to }: { to: string }) => void fake.mails.push(`confirm:${to}`),
}));
vi.mock("~/mailSenders/successPurchase", () => ({
  successPurchase: async ({ userMail }: { userMail: string }) => void fake.mails.push(`notice:${userMail}`),
}));
vi.mock("~/.server/db", () => ({
  db: {
    community: { findFirst: async () => fake.community },
    membership: { findUnique: async () => fake.membership },
    product: { findUnique: async () => fake.product },
    purchaseEvent: {
      findFirst: async ({ where }: { where: { email: { equals: string } } }) =>
        fake.buyers.includes(where.email.equals.toLowerCase()) ? { id: "p1" } : null,
      findUnique: async ({ where }: { where: { stripeSessionId: string } }) => fake.purchases[where.stripeSessionId] ?? null,
      upsert: async ({ where, create }: { where: { stripeSessionId: string }; create: any }) => {
        fake.purchases[where.stripeSessionId] = { ...create };
      },
      update: async ({ where, data }: { where: { stripeSessionId: string }; data: any }) => {
        fake.purchases[where.stripeSessionId] = { ...fake.purchases[where.stripeSessionId], ...data };
      },
      findMany: async ({ where }: { where: { productKey: { in: string[] }; status: { in: string[] } } }) =>
        Object.values(fake.purchases).filter(
          (p) => where.productKey.in.includes(p.productKey ?? "") && where.status.in.includes(p.status),
        ),
    },
    subscriber: {
      findUnique: async ({ where }: { where: { email: string } }) =>
        fake.waitlist.includes(where.email) ? { tags: ["newsletter", "software-factory-waitlist"] } : { tags: ["newsletter"] },
    },
    communityInvite: {
      findUnique: async ({ where }: { where: { communityId_email: { email: string } } }) =>
        fake.invites[where.communityId_email.email] ?? null,
      create: async ({ data }: { data: { email: string; callDays: string[] } }) => {
        fake.invites[data.email] = { id: data.email, callDays: data.callDays };
      },
      update: async ({ where, data }: { where: { id: string }; data: { callDays: string[] } }) => {
        fake.invites[where.id] = { id: where.id, callDays: data.callDays };
      },
    },
  },
}));

import {
  ANTI_FACTORY_TIERS,
  antiFactoryCallGate,
  canSeeRecording,
  clubPriceReason,
  listAntiFactoryBuyers,
  filterPaidRecordings,
  fulfillAntiFactory,
  isOpenWebinarCall,
  isPaidCheckout,
  isPaidRecording,
  refundAntiFactory,
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
  fake.purchases = {};
  fake.invites = {};
  fake.mails = [];
  fake.waitlist = [];
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

describe("webinar gratis del 18-nov", () => {
  it("la llamada del webinar es abierta", () =>
    expect(isOpenWebinarCall({ startsAt: new Date("2026-11-19T01:00:00Z") })).toBe(true));
  it("las sesiones del taller y una llamada normal no son abiertas", () => {
    expect(isOpenWebinarCall({ startsAt: new Date("2026-12-02T01:00:00Z") })).toBe(false);
    expect(isOpenWebinarCall({ startsAt: new Date("2026-11-24T01:00:00Z") })).toBe(false);
    expect(isOpenWebinarCall(null)).toBe(false);
  });
});

describe("grabaciones de paga", () => {
  const taller = new Date("2026-12-02T01:30:00Z"); // martes 1-dic, 19:30 CDMX
  const normal = new Date("2026-11-24T01:30:00Z");
  it("son de paga las de los días del taller", () => {
    expect(isPaidRecording(taller)).toBe(true);
    expect(isPaidRecording(normal)).toBe(false);
  });
  it("un miembro sin compra no ve la del taller", () =>
    expect(canSeeRecording({ recordedAt: taller, canMod: false, isInside: true, hasPurchase: false })).toBe(false));
  it("quien compró la ve aunque no sea miembro", () =>
    expect(canSeeRecording({ recordedAt: taller, canMod: false, isInside: false, hasPurchase: true })).toBe(true));
  it("las de un día normal siguen siendo de miembros", () => {
    expect(canSeeRecording({ recordedAt: normal, canMod: false, isInside: true, hasPurchase: false })).toBe(true);
    expect(canSeeRecording({ recordedAt: normal, canMod: false, isInside: false, hasPurchase: true })).toBe(false);
  });
  it("la lista esconde las de paga a quien no compró y las deja a quien compró", async () => {
    const list = [{ endedAt: taller.toISOString() }, { endedAt: normal.toISOString() }];
    expect(await filterPaidRecordings(list, { email: "ana@club.mx", canMod: false })).toHaveLength(1);
    fake.buyers = ["ana@club.mx"];
    expect(await filterPaidRecordings(list, { email: "ana@club.mx", canMod: false })).toHaveLength(2);
  });
});

describe("cumplimiento sólo con pago confirmado", () => {
  const base = { sessionId: "cs_1", email: "beto@mail.mx", metadata: { type: "anti-factory-taller-dic26" } };
  it("sin pago no manda correos ni da pase", async () => {
    const r = await fulfillAntiFactory({ ...base, paymentStatus: "unpaid" });
    expect(r.unpaid).toBe(true);
    expect(fake.mails).toEqual([]);
    expect(fake.invites["beto@mail.mx"]).toBeUndefined();
    expect(fake.purchases.cs_1.status).toBe("received");
  });
  it("pagada: se cumple, avisa y da pase", async () => {
    const r = await fulfillAntiFactory({ ...base, paymentStatus: "paid" });
    expect(r.ok).toBe(true);
    expect(fake.purchases.cs_1.status).toBe("fulfilled");
    expect(fake.mails).toEqual(["confirm:beto@mail.mx", "notice:beto@mail.mx"]);
    expect(fake.invites["beto@mail.mx"].callDays).toEqual(["20261201", "20261203"]);
  });
});

describe("reembolso", () => {
  it("marca la compra como reembolsada y quita los pases del taller", async () => {
    fake.purchases.cs_9 = { email: "Beto@Mail.mx", productKey: "anti-factory-taller-dic26", status: "fulfilled" };
    fake.invites["beto@mail.mx"] = { id: "beto@mail.mx", callDays: ["20261117", "20261201", "20261203"] };
    expect(await refundAntiFactory("cs_9")).toBe(true);
    expect(fake.purchases.cs_9.status).toBe("refunded");
    expect(fake.invites["beto@mail.mx"].callDays).toEqual(["20261117"]);
  });
  it("no toca compras que no son del taller", async () => {
    fake.purchases.cs_8 = { email: "x@y.mx", productKey: "sistemas-agenticos-workshop", status: "fulfilled" };
    expect(await refundAntiFactory("cs_8")).toBe(false);
    expect(fake.purchases.cs_8.status).toBe("fulfilled");
  });
});

describe("?success=1 verificado con Stripe", () => {
  const stripe = (payment_status: string, type = "anti-factory-taller-dic26") => async () => ({
    payment_status,
    metadata: { type },
  });
  it("sesión pagada del taller: sí", async () =>
    expect(await isPaidCheckout("cs_test_abc123", stripe("paid"))).toBe(true));
  it("sin pagar, de otro producto, sin id o con id inventado: no", async () => {
    expect(await isPaidCheckout("cs_test_abc123", stripe("unpaid"))).toBe(false);
    expect(await isPaidCheckout("cs_test_abc123", stripe("paid", "otro"))).toBe(false);
    expect(await isPaidCheckout(null, stripe("paid"))).toBe(false);
    expect(await isPaidCheckout("{CHECKOUT_SESSION_ID}", stripe("paid"))).toBe(false);
  });
  it("si Stripe falla: no", async () =>
    expect(await isPaidCheckout("cs_live_x1", async () => { throw new Error("404"); })).toBe(false));
});

describe("precio del club para la lista de espera de software-factory", () => {
  it("quien está en la lista paga con la llave del club", async () => {
    fake.waitlist = ["lista@mail.mx"];
    const reason = await clubPriceReason({ id: "u2", email: "Lista@Mail.mx" });
    expect(reason).toBe("waitlist");
    expect(pickAntiFactoryTier(!!reason).key).toBe("anti-factory-taller-dic26-club");
  });
  it("un miembro sigue siendo «member»", async () => {
    fake.membership = { status: "active", currentPeriodEnd: null };
    expect(await clubPriceReason({ id: "u1", email: "ana@club.mx" })).toBe("member");
  });
  it("quien no es miembro ni está en la lista paga el precio general", async () => {
    const reason = await clubPriceReason({ id: "u3", email: "nadie@mail.mx" });
    expect(reason).toBeNull();
    expect(pickAntiFactoryTier(!!reason).key).toBe("anti-factory-taller-dic26");
  });
  it("sin sesión no hay precio del club", async () => expect(await clubPriceReason(null)).toBeNull());
});

describe("lista de compradores para la cortesía de Ghosty Studio", () => {
  it("devuelve los correos pagados, sin repetir y sin reembolsados", async () => {
    fake.purchases = {
      a: { email: "Beto@Mail.mx", productKey: "anti-factory-taller-dic26", status: "fulfilled" },
      b: { email: "beto@mail.mx", productKey: "anti-factory-taller-dic26-club", status: "partial" },
      c: { email: "ana@club.mx", productKey: "anti-factory-taller-dic26-club", status: "fulfilled" },
      d: { email: "reembolso@mail.mx", productKey: "anti-factory-taller-dic26", status: "refunded" },
      e: { email: "otro@mail.mx", productKey: "sistemas-agenticos-workshop", status: "fulfilled" },
    };
    expect(await listAntiFactoryBuyers()).toEqual(["ana@club.mx", "beto@mail.mx"]);
  });
});
