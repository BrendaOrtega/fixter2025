import type { Product } from "@prisma/client";
import { db } from "~/.server/db";
import { enrollSubscriberInSequence } from "~/.server/sequences";
import { sendProductWelcome } from "~/mailSenders/sendProductWelcome";
import { purchaseCongrats } from "~/mailSenders/purchaseCongrats";
import { successPurchase } from "~/mailSenders/successPurchase";

export type ResolvedVia = "fulfillmentKey" | "type" | "courseSlug" | "none";

/**
 * Qué producto se compró.
 *
 * `key` es el mismo string que ya viaja en `metadata.type` desde las landings,
 * así que los productos existentes se resuelven sin tocar el checkout. Devuelve
 * también por cuál vía resolvió: es lo que dirá cuándo se pueden borrar los
 * bloques viejos del webhook.
 */
export async function resolveProduct(
  metadata: Record<string, string | undefined>
): Promise<{ product: Product | null; via: ResolvedVia }> {
  const byKey = async (key?: string) =>
    key ? db.product.findUnique({ where: { key } }) : null;

  const fromKey = await byKey(metadata.fulfillmentKey);
  if (fromKey?.active) return { product: fromKey, via: "fulfillmentKey" };

  const fromType = await byKey(metadata.type);
  if (fromType?.active) return { product: fromType, via: "type" };

  if (metadata.courseSlug) {
    const fromSlug = await db.product.findFirst({
      where: { active: true, courseSlugs: { has: metadata.courseSlug } },
    });
    if (fromSlug) return { product: fromSlug, via: "courseSlug" };
  }

  return { product: null, via: "none" };
}

export type FulfillmentStep = {
  name: string;
  status: "ok" | "skipped" | "failed";
  detail?: string;
};

/**
 * Entrega lo que se compró.
 *
 * Cada paso va en su propio try/catch y nunca lanza: si esto reventara, Stripe
 * reintentaría el webhook y duplicaría los efectos que sí alcanzaron a correr.
 * Lo que falla queda anotado en los pasos, que se guardan en PurchaseEvent.
 */
export async function fulfillPurchase({
  product,
  email,
  name,
  phone,
  sessionId,
  amountTotal,
  metadata,
}: {
  product: Product;
  email: string;
  name?: string | null;
  phone?: string | null;
  sessionId: string;
  amountTotal?: number | null;
  metadata: Record<string, string | undefined>;
}): Promise<{ ok: boolean; steps: FulfillmentStep[] }> {
  const steps: FulfillmentStep[] = [];
  const step = async (name: string, fn: () => Promise<string | void>) => {
    try {
      const detail = await fn();
      steps.push({ name, status: "ok", detail: detail || undefined });
    } catch (error) {
      console.error(`FULFILL[${product.key}] ${name}:`, error);
      steps.push({ name, status: "failed", detail: String(error) });
    }
  };

  // Cursos que otorga. Vacío es normal: un taller en vivo no da acceso a nada.
  let courseIds: string[] = [];
  let firstCourseSlug: string | undefined;
  if (product.courseSlugs.length) {
    await step("courses", async () => {
      const courses = await db.course.findMany({
        where: { slug: { in: product.courseSlugs } },
        select: { id: true, slug: true },
      });
      courseIds = courses.map((c) => c.id);
      firstCourseSlug = courses[0]?.slug;

      const missing = product.courseSlugs.filter(
        (slug) => !courses.some((c) => c.slug === slug)
      );
      if (missing.length) throw new Error(`sin curso: ${missing.join(", ")}`);
      return courses.map((c) => c.slug).join(", ");
    });
  }

  if (product.createsUser) {
    await step("user", async () => {
      const existing = await db.user.findUnique({
        where: { email },
        select: { courses: true, tags: true },
      });

      // Push deduplicado: con los reintentos de Stripe, un push a ciegas
      // repite el mismo curso en la lista.
      const newCourses = courseIds.filter((id) => !existing?.courses.includes(id));
      const newTags = product.userTags.filter((t) => !existing?.tags.includes(t));

      await db.user.upsert({
        where: { email },
        create: {
          email,
          username: email,
          displayName: name || undefined,
          phoneNumber: phone || undefined,
          courses: courseIds,
          tags: product.userTags,
          confirmed: true,
          role: "STUDENT",
        },
        update: {
          displayName: name || undefined,
          ...(newCourses.length ? { courses: { push: newCourses } } : {}),
          ...(newTags.length ? { tags: { push: newTags } } : {}),
        },
      });
      return existing ? "updated" : "created";
    });
  }

  let subscriberId: string | undefined;
  if (product.createsSubscriber) {
    await step("subscriber", async () => {
      const existing = await db.subscriber.findUnique({
        where: { email },
        select: { id: true, tags: true },
      });
      const newTags = product.subscriberTags.filter(
        (t) => !existing?.tags.includes(t)
      );

      const subscriber = await db.subscriber.upsert({
        where: { email },
        create: {
          email,
          name: name || undefined,
          confirmed: true,
          tags: product.subscriberTags,
        },
        update: {
          name: name || undefined,
          ...(newTags.length ? { tags: { push: newTags } } : {}),
        },
      });
      subscriberId = subscriber.id;
      return subscriber.id;
    });
  }

  for (const seq of product.sequences) {
    if (!subscriberId) break;
    await step(`sequence:${seq.label || seq.sequenceId}`, async () => {
      await enrollSubscriberInSequence(seq.sequenceId, subscriberId!, {
        immediate: seq.immediate,
        startAtIndex: seq.startAtIndex ?? undefined,
      });
    });
  }

  await step("welcome", async () => {
    if (product.welcome) {
      await sendProductWelcome(product.welcome as never, {
        to: email,
        userName: name,
        courseSlug: firstCourseSlug,
      });
      return "product spec";
    }
    if (firstCourseSlug) {
      await purchaseCongrats({
        to: email,
        courseTitle: product.title,
        courseSlug: firstCourseSlug,
      });
      return "generic";
    }
    return "none (no course, no spec)";
  });

  await step("internal-notice", async () => {
    await successPurchase({
      userName: name || "Sin nombre",
      userMail: email,
      title: product.title,
      slug: firstCourseSlug || product.key,
    });
  });

  return { ok: !steps.some((s) => s.status === "failed"), steps };
}

/**
 * Deja constancia de la compra ANTES de intentar cumplirla, para que ninguna
 * pueda desaparecer sin rastro. El índice único sobre la sesión hace que un
 * reintento de Stripe actualice la misma fila en vez de crear otra.
 */
export async function recordPurchase({
  sessionId,
  email,
  amountTotal,
  currency,
  metadata,
  status,
  productKey,
  resolvedVia,
  steps,
  note,
}: {
  sessionId: string;
  email: string;
  amountTotal?: number | null;
  currency?: string | null;
  metadata: Record<string, unknown>;
  status: string;
  productKey?: string;
  resolvedVia?: ResolvedVia;
  steps?: FulfillmentStep[];
  note?: string;
}) {
  const data = {
    email,
    amountTotal: amountTotal ?? null,
    currency: currency ?? null,
    metadata: metadata as never,
    status,
    productKey: productKey ?? null,
    resolvedVia: resolvedVia ?? null,
    steps: (steps ?? null) as never,
    note: note ?? null,
    fulfilledAt: status === "fulfilled" ? new Date() : null,
  };

  return db.purchaseEvent.upsert({
    where: { stripeSessionId: sessionId },
    create: { stripeSessionId: sessionId, ...data },
    update: data,
  });
}
