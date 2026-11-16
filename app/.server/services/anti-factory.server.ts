// Taller en vivo «Ghosty Anti-Factory» (dic-2026). Aquí vive lo que decide el cobro y lo que se
// entrega al pagar: qué precio le toca a quien compra, las dos sesiones y el cumplimiento que llama
// el webhook de Stripe. La landing es `app/routes/anti-factory.tsx`.
import { db } from "~/.server/db";
import { hasActiveMembership } from "~/.server/services/membership.server";
import { recordPurchase, type FulfillmentStep } from "~/.server/services/fulfillment.server";
import { successPurchase } from "~/mailSenders/successPurchase";
import { sendAntiFactoryConfirmation } from "~/mailSenders/sendAntiFactoryConfirmation";

export const ANTI_FACTORY_PATH = "/anti-factory";
export const ANTI_FACTORY_TITLE = "Ghosty Anti-Factory";
/** Comunidad cuya membresía vigente da el precio de miembro. */
export const CLUB_SLUG = "club-de-agentes";

/// Los dos precios. `key` es el `Product.key` (viaja en `metadata.type`); el precio de verdad se lee
/// del Product y `fallbackPrice` sólo cobra mientras esa fila no exista.
export const ANTI_FACTORY_TIERS = {
  general: { key: "anti-factory-taller-dic26", fallbackPrice: 1990 },
  club: { key: "anti-factory-taller-dic26-club", fallbackPrice: 1490 },
} as const;
export type AntiFactoryTier = (typeof ANTI_FACTORY_TIERS)[keyof typeof ANTI_FACTORY_TIERS];

export const ANTI_FACTORY_KEYS: string[] = Object.values(ANTI_FACTORY_TIERS).map((t) => t.key);
export const isAntiFactoryType = (type?: string | null) => !!type && ANTI_FACTORY_KEYS.includes(type);

/// Las dos sesiones en vivo, de 7 a 9 pm en la Ciudad de México (UTC−6 todo el año desde 2022).
export const ANTI_FACTORY_SESSIONS = [
  {
    id: "anti-factory-dic26-s1",
    label: "Sesión 1 · martes 1 de diciembre de 2026, de 7 a 9 pm (CDMX)",
    startsAt: new Date("2026-12-02T01:00:00Z"),
    endsAt: new Date("2026-12-02T03:00:00Z"),
  },
  {
    id: "anti-factory-dic26-s2",
    label: "Sesión 2 · jueves 3 de diciembre de 2026, de 7 a 9 pm (CDMX)",
    startsAt: new Date("2026-12-04T01:00:00Z"),
    endsAt: new Date("2026-12-04T03:00:00Z"),
  },
] as const;

/** El precio sale de la membresía, nunca de un campo del formulario. */
export function pickAntiFactoryTier(isClubMember: boolean): AntiFactoryTier {
  return isClubMember ? ANTI_FACTORY_TIERS.club : ANTI_FACTORY_TIERS.general;
}

/** ¿Este usuario tiene membresía vigente en el Club de Agentes de IA? */
export async function isClubMember(user: { id: string } | null) {
  if (!user) return false;
  const community = await db.community.findFirst({
    where: { slug: CLUB_SLUG, isActive: true },
    select: { id: true },
  });
  if (!community) return false;
  return hasActiveMembership(user.id, community.id);
}

/** Precio vigente de un nivel: el del Product si existe, si no el de respaldo. */
export async function priceFor(tier: AntiFactoryTier) {
  const product = await db.product.findUnique({
    where: { key: tier.key },
    select: { priceMxn: true, active: true },
  });
  return product?.active && product.priceMxn ? product.priceMxn : tier.fallbackPrice;
}

/**
 * Cumple una compra del taller: deja la compra registrada, avisa a bliss y le manda al comprador
 * la confirmación con las dos fechas y su .ics. Cada paso va en su propio try/catch y nada lanza,
 * igual que `fulfillPurchase`: si esto reventara, Stripe reintentaría y duplicaría los correos.
 */
export async function fulfillAntiFactory({
  sessionId,
  email,
  name,
  amountTotal,
  currency,
  metadata,
}: {
  sessionId: string;
  email: string;
  name?: string | null;
  amountTotal?: number | null;
  currency?: string | null;
  metadata: Record<string, string | undefined>;
}) {
  // Un reintento de Stripe sobre una compra ya cumplida no vuelve a mandar nada.
  const previous = await db.purchaseEvent.findUnique({
    where: { stripeSessionId: sessionId },
    select: { status: true },
  });
  if (previous?.status === "fulfilled") return { ok: true, steps: [] as FulfillmentStep[], repeated: true };

  const base = { sessionId, email, amountTotal, currency, metadata, productKey: metadata.type };
  await recordPurchase({ ...base, status: "received" });

  const steps: FulfillmentStep[] = [];
  const step = async (stepName: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      steps.push({ name: stepName, status: "ok" });
    } catch (error) {
      console.error(`FULFILL[${metadata.type}] ${stepName}:`, error);
      steps.push({ name: stepName, status: "failed", detail: String(error) });
    }
  };

  const isClubPrice = metadata.type === ANTI_FACTORY_TIERS.club.key;
  await step("welcome", () => sendAntiFactoryConfirmation({ to: email, userName: name, sessions: ANTI_FACTORY_SESSIONS }));
  await step("internal-notice", () =>
    successPurchase({
      userName: name || "Sin nombre",
      userMail: email,
      title: `${ANTI_FACTORY_TITLE} (taller dic-2026${isClubPrice ? ", precio del club" : ""})`,
      slug: ANTI_FACTORY_PATH.slice(1),
    }),
  );

  const ok = !steps.some((s) => s.status === "failed");
  await recordPurchase({ ...base, status: ok ? "fulfilled" : "partial", steps });
  return { ok, steps, repeated: false };
}
