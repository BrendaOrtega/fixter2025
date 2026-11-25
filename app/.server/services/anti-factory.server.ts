// Taller en vivo «Ghosty Anti-Factory» (dic-2026). Aquí vive lo que decide el cobro y lo que se
// entrega al pagar: qué precio le toca a quien compra, las dos sesiones y el cumplimiento que llama
// el webhook de Stripe. La landing es `app/routes/anti-factory.tsx`.
import { db } from "~/.server/db";
import { grantMembership, hasActiveMembership, isMembershipActive } from "~/.server/services/membership.server";
import { cdmxDay, upsertInvites } from "~/.server/services/club-invites.server";
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

/// El taller se da en la llamada del club. Al comprador se le da pase a la llamada de esos dos días
/// (YYYYMMDD en CDMX, `CommunityInvite.callDays`), el mismo mecanismo de los invitados del club.
export const ANTI_FACTORY_CALL_DAYS = ["20261201", "20261203"];
export const ANTI_FACTORY_INVITE_SOURCE = "anti-factory-taller-dic26";
export const CLUB_URL = `https://www.fixtergeek.com/comunidad/${CLUB_SLUG}`;

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

/// Quien se apuntó a la lista de espera del taller anterior («Software Factory») paga el precio del club.
export const FACTORY_WAITLIST_TAG = "software-factory-waitlist";

/** ¿Este correo está en la lista de espera de software-factory? */
export async function isOnFactoryWaitlist(email: string) {
  const sub = await db.subscriber.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { tags: true },
  });
  return !!sub?.tags.includes(FACTORY_WAITLIST_TAG);
}

/**
 * Por qué le toca el precio del club a quien tiene la sesión abierta: miembro del club, lista de
 * espera de software-factory, o nada. Nunca sale de un campo del formulario.
 */
export async function clubPriceReason(user: { id: string; email: string } | null) {
  if (!user) return null;
  if (await isClubMember(user)) return "member" as const;
  if (await isOnFactoryWaitlist(user.email)) return "waitlist" as const;
  return null;
}

/** Precio vigente de un nivel: el del Product si existe, si no el de respaldo. */
export async function priceFor(tier: AntiFactoryTier) {
  const product = await db.product.findUnique({
    where: { key: tier.key },
    select: { priceMxn: true, active: true },
  });
  return product?.active && product.priceMxn ? product.priceMxn : tier.fallbackPrice;
}

// ── Sesiones de paga en la llamada del club ─────────────────────────────────────────────────────
// El club da descuento, no acceso: en las dos sesiones del taller la llamada sólo deja entrar a
// quien compró (miembro o no). La fuente de verdad es la compra registrada en `PurchaseEvent`.

/** Estados de una compra pagada: `partial` también está pagada (falló sólo un correo o aviso). */
const PAID_STATUSES = ["fulfilled", "partial", "fulfilled_manually"];
const SESSION_MATCH_MS = 30 * 60_000;

/** La sesión del taller que corresponde a esta llamada, si la llamada empieza a la hora del taller. */
export function paidSessionAt(startsAt: Date) {
  return (
    ANTI_FACTORY_SESSIONS.find(
      (s) => Math.abs(s.startsAt.getTime() - startsAt.getTime()) <= SESSION_MATCH_MS,
    ) ?? null
  );
}

/** Correos (en minúsculas, sin repetir) con compra pagada del taller, sin los reembolsados. */
export async function listAntiFactoryBuyers() {
  const rows = await db.purchaseEvent.findMany({
    where: { productKey: { in: ANTI_FACTORY_KEYS }, status: { in: PAID_STATUSES } },
    select: { email: true },
  });
  return [...new Set(rows.map((r) => r.email.trim().toLowerCase()))].sort();
}

/** ¿Este correo tiene una compra pagada del taller (cualquiera de los dos precios)? */
export async function hasAntiFactoryPurchase(email: string) {
  const found = await db.purchaseEvent.findFirst({
    where: {
      email: { equals: email.trim(), mode: "insensitive" },
      productKey: { in: ANTI_FACTORY_KEYS },
      status: { in: PAID_STATUSES },
    },
    select: { id: true },
  });
  return !!found;
}

/**
 * ¿Este correo tiene lugar en el taller? Desde el 25-nov el taller es gratis: cuenta quien se
 * registró (tag en `Subscriber`), quien tiene pase por invitación esos días y quien lo compró antes.
 */
export async function hasAntiFactoryAccess(email: string) {
  if (await hasAntiFactoryPurchase(email)) return true;
  const sub = await db.subscriber.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { tags: true },
  });
  if (sub?.tags.includes(ANTI_FACTORY_REGISTER_TAG)) return true;
  const community = await db.community.findFirst({ where: { slug: CLUB_SLUG }, select: { id: true } });
  if (!community) return false;
  const invite = await db.communityInvite.findUnique({
    where: { communityId_email: { communityId: community.id, email: email.trim().toLowerCase() } },
    select: { callDays: true },
  });
  return !!invite?.callDays.some((d) => ANTI_FACTORY_CALL_DAYS.includes(d));
}

/**
 * Candado de la llamada en una sesión del taller. Devuelve `null` si puede entrar, o el aviso con la
 * liga para registrarse gratis. El anfitrión y los moderadores siempre entran.
 */
export async function antiFactoryCallGate(
  event: { startsAt: Date } | null,
  who: { email: string; isMember: boolean; exempt: boolean },
) {
  if (!event || who.exempt || !paidSessionAt(event.startsAt)) return null;
  if (await hasAntiFactoryAccess(who.email)) return null;
  return {
    message: "Esta sesión es del taller Ghosty Anti-Factory. Regístrate gratis para entrar.",
    url: ANTI_FACTORY_PATH,
  };
}

// ── Registro gratis (desde el 25-nov-2026) ──────────────────────────────────────────────────────
// El taller ya no se cobra. El registro es el login de siempre (Google o magic link, que verifican
// el correo y dejan un User) y al volver con sesión: tag en `Subscriber`, 3 meses de regalo del club
// (como `claimBuyerGift`: una sola vez) y la confirmación con los .ics. Sin modelos nuevos.
export const ANTI_FACTORY_REGISTER_TAG = "anti-factory-registro-dic26";
export const ANTI_FACTORY_REGISTER_SOURCE = "anti-factory-registro-dic26";
export const ANTI_FACTORY_GIFT_DAYS = 90;

/** Qué pasó con el regalo del club: se dio ahora, ya era miembro vigente, o ya había tenido regalo. */
export type AntiFactoryGift = "granted" | "member" | "used";

/// El registro quedó completo (regalo y correo) cuando `tagDates` trae la fecha del tag. El tag solo no
/// basta: el magic link del modal lo agrega al iniciar sesión, antes de que el registro termine.
const finishedRegistration = (tagDates: unknown) =>
  !!(tagDates as Record<string, string> | null)?.[ANTI_FACTORY_REGISTER_TAG];

/** ¿Este correo ya se registró (o compró) el taller? */
export async function isAntiFactoryRegistered(email: string) {
  const sub = await db.subscriber.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { tagDates: true },
  });
  return finishedRegistration(sub?.tagDates) || (await hasAntiFactoryPurchase(email));
}

/**
 * Los 3 meses del club, con el criterio de `canClaimBuyerGift`: quien tiene membresía vigente ya
 * está dentro y quien ya tuvo un regalo (aunque haya vencido) no recibe otro.
 */
export async function giveAntiFactoryGift(userId: string, communityId: string): Promise<AntiFactoryGift> {
  const current = await db.membership.findUnique({
    where: { communityId_userId: { communityId, userId } },
    select: { provider: true, status: true, currentPeriodEnd: true },
  });
  if (isMembershipActive(current)) return "member";
  if (current?.provider === "grant") return "used";
  const until = new Date(Date.now() + ANTI_FACTORY_GIFT_DAYS * 24 * 60 * 60 * 1000);
  await grantMembership({ userId, communityId, until });
  return "granted";
}

/**
 * Registra al taller a un usuario con sesión (correo ya verificado por el login). La confirmación
 * se manda una sola vez: registrarse de nuevo no reenvía nada ni da otro regalo.
 */
export async function registerAntiFactory(user: { id: string; email: string; name?: string | null }) {
  const email = user.email.trim().toLowerCase();
  const prev = await db.subscriber.findUnique({ where: { email }, select: { tags: true, tagDates: true } });
  const already = finishedRegistration(prev?.tagDates);
  const community = await db.community.findFirst({ where: { slug: CLUB_SLUG }, select: { id: true } });
  if (already || !community) return { already, gift: null };

  const now = new Date().toISOString();
  await db.subscriber.upsert({
    where: { email },
    create: {
      email,
      name: user.name || undefined,
      confirmed: true,
      confirmedAt: new Date(),
      tags: ["newsletter", ANTI_FACTORY_REGISTER_TAG],
      tagDates: { newsletter: now, [ANTI_FACTORY_REGISTER_TAG]: now },
    },
    update: {
      tags: [...new Set([...(prev?.tags ?? []), ANTI_FACTORY_REGISTER_TAG])],
      tagDates: { ...((prev?.tagDates as Record<string, string> | null) ?? {}), [ANTI_FACTORY_REGISTER_TAG]: now },
    },
  });
  const gift = await giveAntiFactoryGift(user.id, community.id);
  // Sin membresía vigente (ya había usado su regalo), el pase por invitación lo deja entrar esos dos días.
  if (gift === "used") {
    await upsertInvites(community.id, [email], {
      source: ANTI_FACTORY_REGISTER_SOURCE,
      giftDays: 0,
      callDays: ANTI_FACTORY_CALL_DAYS,
    });
  }
  await sendAntiFactoryConfirmation({
    to: email,
    userName: user.name,
    sessions: ANTI_FACTORY_SESSIONS,
    joinUrl: CLUB_URL,
    gift,
  });
  return { already, gift };
}

// ── Webinar gratis del 18-nov ───────────────────────────────────────────────────────────────────
// Esa llamada es abierta: cualquiera con sesión iniciada entra como espectador, sin membresía ni
// pase. Sólo ese evento.
export const ANTI_FACTORY_WEBINAR = {
  startsAt: new Date("2026-11-19T01:00:00Z"), // miércoles 18-nov, 19:00 CDMX
  endsAt: new Date("2026-11-19T02:00:00Z"),
};

/** ¿Esta llamada es la del webinar gratis? */
export function isOpenWebinarCall(event: { startsAt: Date } | null) {
  return (
    !!event &&
    Math.abs(event.startsAt.getTime() - ANTI_FACTORY_WEBINAR.startsAt.getTime()) <= SESSION_MATCH_MS
  );
}

// ── Grabaciones de las sesiones de paga ─────────────────────────────────────────────────────────
// Las grabaciones de los días del taller las ve quien tiene lugar (registro gratis o compra previa,
// miembro o no) y el anfitrión; un miembro sin registro no las ve.

/** ¿La grabación es de un día del taller? Se decide por el día en CDMX en que se grabó. */
export function isPaidRecording(recordedAt: Date) {
  return ANTI_FACTORY_CALL_DAYS.includes(cdmxDay(recordedAt));
}

/** Quién puede ver una grabación: las de paga piden compra; las demás, estar adentro del club. */
export function canSeeRecording({
  recordedAt,
  canMod,
  isInside,
  hasPurchase,
}: {
  recordedAt: Date;
  canMod: boolean;
  isInside: boolean;
  hasPurchase: boolean;
}) {
  if (canMod) return true;
  return isPaidRecording(recordedAt) ? hasPurchase : isInside;
}

/** Quita de la lista las grabaciones de paga si quien mira no compró el taller. */
export async function filterPaidRecordings<R extends { endedAt: string }>(
  list: R[],
  who: { email: string | null; canMod: boolean },
) {
  if (who.canMod || !list.some((r) => isPaidRecording(new Date(r.endedAt)))) return list;
  const bought = who.email ? await hasAntiFactoryAccess(who.email) : false;
  return bought ? list : list.filter((r) => !isPaidRecording(new Date(r.endedAt)));
}

// ── Pagos verificados y reembolsos ──────────────────────────────────────────────────────────────

type CheckoutLookup = (id: string) => Promise<{ payment_status: string; metadata: Record<string, string> | null }>;

/** `?success=1` sólo celebra si Stripe confirma que esa sesión del taller quedó pagada. */
export async function isPaidCheckout(sessionId: string | null, retrieve: CheckoutLookup) {
  if (!sessionId || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return false;
  try {
    const session = await retrieve(sessionId);
    return session.payment_status === "paid" && isAntiFactoryType(session.metadata?.type);
  } catch {
    return false;
  }
}

/**
 * Reembolso de una compra del taller: la compra queda `refunded` (el candado y las grabaciones
 * dejan de reconocerla) y se le quitan los pases a la llamada de los días del taller.
 * Devuelve `false` si esa sesión de Stripe no es del taller.
 */
export async function refundAntiFactory(sessionId: string) {
  const purchase = await db.purchaseEvent.findUnique({
    where: { stripeSessionId: sessionId },
    select: { email: true, productKey: true },
  });
  if (!purchase || !isAntiFactoryType(purchase.productKey)) return false;
  await db.purchaseEvent.update({
    where: { stripeSessionId: sessionId },
    data: { status: "refunded", note: `Reembolsada el ${new Date().toISOString()}` },
  });
  const community = await db.community.findFirst({ where: { slug: CLUB_SLUG }, select: { id: true } });
  if (community) {
    const email = purchase.email.trim().toLowerCase();
    const invite = await db.communityInvite.findUnique({
      where: { communityId_email: { communityId: community.id, email } },
      select: { id: true, callDays: true },
    });
    if (invite) {
      await db.communityInvite.update({
        where: { id: invite.id },
        data: { callDays: invite.callDays.filter((d) => !ANTI_FACTORY_CALL_DAYS.includes(d)) },
      });
    }
  }
  return true;
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
  paymentStatus,
}: {
  sessionId: string;
  email: string;
  name?: string | null;
  amountTotal?: number | null;
  currency?: string | null;
  metadata: Record<string, string | undefined>;
  /** `session.payment_status` de Stripe: sólo «paid» se cumple. */
  paymentStatus: string | null | undefined;
}) {
  // Sin cobro confirmado no se entrega nada: queda anotada y se cumple cuando Stripe avise del pago.
  if (paymentStatus !== "paid") {
    await recordPurchase({
      sessionId,
      email,
      amountTotal,
      currency,
      metadata,
      productKey: metadata.type,
      status: "received",
      note: `payment_status=${paymentStatus ?? "(ninguno)"}`,
    });
    return { ok: false, steps: [] as FulfillmentStep[], repeated: false, unpaid: true };
  }

  // Un reintento de Stripe sobre una compra ya cumplida no vuelve a mandar nada.
  const previous = await db.purchaseEvent.findUnique({
    where: { stripeSessionId: sessionId },
    select: { status: true },
  });
  if (previous?.status === "fulfilled") return { ok: true, steps: [] as FulfillmentStep[], repeated: true, unpaid: false };

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
  // Pase a la llamada del club los dos días del taller, aunque no sea miembro. Se aplica cuando
  // entra a la página del club con este mismo correo (`applyInvite` en comunidad.$slug.tsx).
  await step("call-pass", async () => {
    const community = await db.community.findFirst({ where: { slug: CLUB_SLUG }, select: { id: true } });
    if (!community) throw new Error(`no existe la comunidad ${CLUB_SLUG}`);
    await upsertInvites(community.id, [email.trim().toLowerCase()], {
      source: ANTI_FACTORY_INVITE_SOURCE,
      giftDays: 0,
      callDays: ANTI_FACTORY_CALL_DAYS,
    });
  });
  await step("welcome", () => sendAntiFactoryConfirmation({ to: email, userName: name, sessions: ANTI_FACTORY_SESSIONS, joinUrl: CLUB_URL }));
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
  return { ok, steps, repeated: false, unpaid: false };
}
