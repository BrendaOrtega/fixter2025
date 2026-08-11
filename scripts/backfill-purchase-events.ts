#!/usr/bin/env npx tsx
/**
 * Deja constancia de las compras pagadas que ocurrieron antes de que existiera
 * el registro de compras.
 *
 * Las de talleres en vivo se marcan como entregadas fuera del sistema: la
 * entrega fue la sesión en vivo, no algo que el sitio pudiera dar. Así dejan de
 * verse como huecos en la conciliación sin fingir que el sistema hizo algo.
 *
 * No otorga cursos, no crea usuarios y no manda correo.
 *
 *   npx tsx --env-file=.env scripts/backfill-purchase-events.ts          # simula
 *   npx tsx --env-file=.env scripts/backfill-purchase-events.ts --apply
 */
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/** Talleres en vivo sin edición on-demand: se entregaron fuera del sitio. */
const LIVE_WORKSHOP_TYPES = new Set([
  "claude-workshop-direct",
  "gemini-workshop-direct",
  "ia-nocode-course",
]);

const MAX_SESSIONS = 400;

async function main() {
  const apply = process.argv.includes("--apply");
  let scanned = 0;
  const pending: {
    id: string;
    email: string;
    type: string;
    amount: number;
    status: string;
    note: string;
  }[] = [];

  for await (const session of stripe.checkout.sessions.list({ limit: 100 })) {
    if (++scanned > MAX_SESSIONS) break;
    if (session.payment_status !== "paid") continue;

    const email = session.customer_email || session.customer_details?.email;
    if (!email) continue;

    const already = await db.purchaseEvent.findUnique({
      where: { stripeSessionId: session.id },
    });
    if (already) continue;

    const type = session.metadata?.type || "";
    const courseSlug = session.metadata?.courseSlug;

    // La cuenta de Stripe se comparte con otro proyecto: sin ninguna señal de
    // FixterGeek, la compra no es nuestra y no debe contarse como pendiente.
    const isOurs = !!type || !!courseSlug || !!session.metadata?.app;
    const isLiveWorkshop = LIVE_WORKSHOP_TYPES.has(type);

    pending.push({
      id: session.id,
      email,
      type: type || courseSlug || "(sin señales)",
      amount: (session.amount_total || 0) / 100,
      status: !isOurs
        ? "foreign"
        : isLiveWorkshop
          ? "fulfilled_manually"
          : "backfilled",
      note: !isOurs
        ? "Sin señales de FixterGeek: probablemente de otro proyecto"
        : isLiveWorkshop
          ? "Taller en vivo sin edición on-demand: entregado fuera del sistema"
          : "Registrada retroactivamente, antes del registro de compras",
    });
  }

  console.log(`Sesiones revisadas: ${scanned} · sin registro: ${pending.length}\n`);
  for (const item of pending) {
    const icon =
      item.status === "fulfilled_manually" ? "✔" : item.status === "foreign" ? "—" : "·";
    console.log(`  ${icon} [${item.status}] ${item.email} · ${item.type} · $${item.amount}`);
  }

  if (!apply) {
    console.log("\nSimulación. Agrega --apply para escribirlas.");
    return;
  }

  for (const item of pending) {
    const session = await stripe.checkout.sessions.retrieve(item.id);
    await db.purchaseEvent.create({
      data: {
        stripeSessionId: item.id,
        email: item.email,
        amountTotal: session.amount_total,
        currency: session.currency,
        productKey: session.metadata?.type || null,
        status: item.status,
        note: item.note,
        metadata: (session.metadata || {}) as never,
        fulfilledAt: item.status === "fulfilled_manually" ? new Date() : null,
      },
    });
  }
  console.log(`\n✅ ${pending.length} compra(s) registrada(s).`);
}

main()
  .catch((error) => {
    console.error("❌", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
