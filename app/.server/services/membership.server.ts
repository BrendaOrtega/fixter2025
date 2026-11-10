import Stripe from "stripe";
import { db } from "~/.server/db";

// Membresía de pago a una comunidad (10-nov-2026, docs/comunidad/PLAN.md).
// Stripe es la fuente de verdad: el webhook copia el estado de la suscripción
// a `Membership` y el sitio sólo pregunta `hasActiveMembership`.

export const MEMBERSHIP_TYPE = "community-membership";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY as string);

const baseUrl = () =>
  process.env.BASE_URL ||
  (process.env.NODE_ENV === "development"
    ? `http://localhost:${process.env.PORT || 3000}`
    : "https://www.fixtergeek.com");

export type MembershipStatus = "active" | "past_due" | "canceled";

/**
 * Traduce el estado de Stripe al nuestro. `past_due` conserva el acceso
 * mientras Stripe reintenta el cobro; todo lo demás que no sea pago corta.
 */
export function toMembershipStatus(
  stripeStatus: Stripe.Subscription.Status
): MembershipStatus {
  if (stripeStatus === "active" || stripeStatus === "trialing") return "active";
  if (stripeStatus === "past_due") return "past_due";
  return "canceled";
}

/** Acceso real: estado vigente y, si hay fecha, que no haya pasado. */
export function isMembershipActive(
  m: { status: string; currentPeriodEnd: Date | null } | null,
  now = new Date()
) {
  if (!m) return false;
  if (m.status !== "active" && m.status !== "past_due") return false;
  return !m.currentPeriodEnd || m.currentPeriodEnd > now;
}

export async function hasActiveMembership(userId: string, communityId: string) {
  const m = await db.membership.findUnique({
    where: { communityId_userId: { communityId, userId } },
    select: { status: true, currentPeriodEnd: true },
  });
  return isMembershipActive(m);
}

/**
 * Fin del regalo para usarlo como prueba gratis de Stripe. Stripe pide que
 * `trial_end` quede al menos 48 h en el futuro; con menos, cobra desde hoy.
 */
export function giftTrialEnd(
  m: { provider: string; status: string; currentPeriodEnd: Date | null } | null,
  now = new Date()
) {
  if (!m || m.provider !== "grant" || !isMembershipActive(m, now) || !m.currentPeriodEnd) {
    return null;
  }
  const minimum = now.getTime() + 49 * 60 * 60 * 1000;
  return m.currentPeriodEnd.getTime() > minimum ? m.currentPeriodEnd : null;
}

/** Sesión de Checkout para suscribirse. Devuelve la URL de Stripe. */
export type BillingInterval = "month" | "year";

export async function createMembershipCheckout({
  user,
  communitySlug,
  interval = "month",
}: {
  user: { id: string; email: string };
  communitySlug: string;
  interval?: BillingInterval;
}) {
  const community = await db.community.findFirst({
    where: { slug: communitySlug, isActive: true },
  });
  if (!community) throw new Error("Comunidad no encontrada");
  const price = interval === "year" ? community.priceAnnualMxn : community.priceMxn;
  if (!price) throw new Error(`La comunidad no tiene precio ${interval}`);

  // Ya paga: nada que cobrar. Con regalo vigente SÍ puede pagar (p. ej. el
  // anual) y el cobro arranca cuando se acaba el regalo, sin perder sus días.
  const current = await db.membership.findUnique({
    where: { communityId_userId: { communityId: community.id, userId: user.id } },
    select: { provider: true, status: true, currentPeriodEnd: true },
  });
  if (current && current.provider !== "grant" && isMembershipActive(current)) {
    return `${baseUrl()}/comunidad/${community.slug}`;
  }
  const trialEnd = giftTrialEnd(current);

  const metadata = {
    type: MEMBERSHIP_TYPE,
    communityId: community.id,
    userId: user.id,
    interval,
  };
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: "mxn",
          product_data: {
            name: `Membresía ${community.name} (${interval === "year" ? "anual" : "mensual"})`,
          },
          unit_amount: price * 100,
          recurring: { interval },
        },
        quantity: 1,
      },
    ],
    metadata,
    // La suscripción carga los mismos datos: sus eventos llegan sin la sesión.
    subscription_data: {
      metadata,
      ...(trialEnd ? { trial_end: Math.floor(trialEnd.getTime() / 1000) } : {}),
    },
    success_url: `${baseUrl()}/comunidad/${community.slug}?bienvenida=1`,
    cancel_url: `${baseUrl()}/comunidad/${community.slug}`,
  });
  return session.url;
}

/**
 * Escribe en `Membership` lo que dice una suscripción de Stripe. Idempotente:
 * sirve igual para `checkout.session.completed` que para cada
 * `customer.subscription.*`, en cualquier orden.
 */
export async function syncSubscription(sub: Stripe.Subscription) {
  const { type, communityId, userId } = sub.metadata ?? {};
  if (type !== MEMBERSHIP_TYPE || !communityId || !userId) return false;

  // Con API ≥ 2025-03 el periodo vive en cada item y no en la raíz.
  const periodEnd =
    (sub as any).current_period_end ??
    (sub.items?.data?.[0] as any)?.current_period_end;

  const data = {
    status: toMembershipStatus(sub.status),
    provider: "stripe",
    interval: sub.items?.data?.[0]?.price?.recurring?.interval ?? null,
    customerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    externalId: sub.id,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };
  await db.membership.upsert({
    where: { communityId_userId: { communityId, userId } },
    create: { communityId, userId, ...data },
    update: data,
  });
  return true;
}

/** Tras el Checkout: se trae la suscripción completa y se sincroniza. */
export async function syncFromCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.metadata?.type !== MEMBERSHIP_TYPE || !session.subscription) {
    return false;
  }
  const subId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id;
  const sub = await getStripe().subscriptions.retrieve(subId);
  return syncSubscription(sub);
}

/**
 * Acceso regalado (p. ej. quien ya compró un curso). Sin fecha = no caduca.
 * Nunca pisa una suscripción pagada y vigente.
 */
export async function grantMembership({
  userId,
  communityId,
  until,
}: {
  userId: string;
  communityId: string;
  until?: Date;
}) {
  const current = await db.membership.findUnique({
    where: { communityId_userId: { communityId, userId } },
  });
  if (current && current.provider !== "grant" && isMembershipActive(current)) {
    return current;
  }
  const data = {
    status: "active",
    provider: "grant",
    currentPeriodEnd: until ?? null,
  };
  return db.membership.upsert({
    where: { communityId_userId: { communityId, userId } },
    create: { communityId, userId, ...data },
    update: data,
  });
}

/** Portal de Stripe para cambiar tarjeta o cancelar. */
export async function createBillingPortal(userId: string, communitySlug: string) {
  const m = await db.membership.findFirst({
    where: { userId, provider: "stripe", community: { slug: communitySlug } },
    select: { customerId: true },
  });
  if (!m?.customerId) return null;
  const portal = await getStripe().billingPortal.sessions.create({
    customer: m.customerId,
    return_url: `${baseUrl()}/comunidad/${communitySlug}`,
  });
  return portal.url;
}

// ── Regalo a compradores (10-nov-2026) ───────────────────────────────────────
// Quien ya compró un curso de pago o un libro en FixterGeek tiene 3 meses
// gratis. Se reclama una sola vez: si ya tuvo un regalo, aunque haya vencido,
// no se vuelve a dar.

export const BUYER_GIFT_DAYS = 90;

/** ¿Compró algo en FixterGeek? Curso que no es gratis, o algún libro. */
export async function isCourseBuyer(user: { courses: string[]; books: string[] }) {
  if (user.books.length > 0) return true;
  if (user.courses.length === 0) return false;
  const paid = await db.course.count({
    where: { id: { in: user.courses }, isFree: false },
  });
  return paid > 0;
}

/** Puede reclamar si compró, no tiene acceso vigente y nunca tuvo regalo. */
export async function canClaimBuyerGift(
  user: { id: string; courses: string[]; books: string[] },
  communityId: string
) {
  const current = await db.membership.findUnique({
    where: { communityId_userId: { communityId, userId: user.id } },
    select: { provider: true, status: true, currentPeriodEnd: true },
  });
  if (current?.provider === "grant") return false;
  if (isMembershipActive(current)) return false;
  return isCourseBuyer(user);
}

export async function claimBuyerGift(
  user: { id: string; courses: string[]; books: string[] },
  communityId: string
) {
  if (!(await canClaimBuyerGift(user, communityId))) return null;
  const until = new Date(Date.now() + BUYER_GIFT_DAYS * 24 * 60 * 60 * 1000);
  return grantMembership({ userId: user.id, communityId, until });
}

// ── Cursos incluidos (10-nov-2026) ───────────────────────────────────────────
// Un miembro vigente de un club con `includesAllCourses` ve todos los cursos de
// pago publicados mientras pague. Lo comprado sigue colgando de `user.courses`.

/** Ids de los cursos que abre la membresía de este usuario (vacío si no aplica). */
export async function clubCourseIds(userId: string): Promise<string[]> {
  const memberships = await db.membership.findMany({
    where: { userId, status: { in: ["active", "past_due"] }, community: { includesAllCourses: true } },
    select: { status: true, currentPeriodEnd: true },
  });
  if (!memberships.some((m) => isMembershipActive(m))) return [];
  const courses = await db.course.findMany({
    where: { isFree: false, published: true },
    select: { id: true },
  });
  return courses.map((c) => c.id);
}

/** ¿Puede ver este curso? Comprado o incluido en su membresía. */
export async function ownsCourse(user: { id: string; courses: string[] }, courseId: string) {
  if (user.courses.includes(courseId)) return true;
  return (await clubCourseIds(user.id)).includes(courseId);
}

/** Lo comprado más lo que abre la membresía, sin repetir. */
export async function effectiveCourseIds(user: { id: string; courses: string[] }) {
  return [...new Set([...user.courses, ...(await clubCourseIds(user.id))])];
}
